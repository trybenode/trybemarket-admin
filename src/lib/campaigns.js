// Server-only: campaign records and sending (08-campaign-messaging.md §5, §9).
//
// A campaign is created with its audience frozen into
// campaigns/{id}/recipients/{uid}, then sent in short chunks
// (sendNextChunk) driven by the Campaigns page — or by the daily cron for
// campaigns paused on the email allowance. Each chunk is a short request, so
// a Vercel time limit, a closed tab or a network blip never leaves a send
// half-done: the next chunk carries on from the pending recipients.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Handlebars from 'handlebars';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { getCampaignAudience } from '@/lib/audience';
import { sendEmail, sendEmailBatch, MailError, MAX_BATCH_SIZE } from '@/lib/mailer';
import { getMarketingTemplates, sendTemplateMessage, WhatsAppError } from '@/lib/whatsapp';
import { unsubscribePageUrl, unsubscribeHeaders } from '@/lib/unsubscribeLink';
import {
  findUnknownPlaceholders,
  recipientValues,
  formatEmailHtml,
  formatEmailText,
  formatSubject,
  formatWhatsAppValue,
} from '@/lib/messageFormat';

export const MODES = {
  whatsapp_then_email: 'WhatsApp, email for everyone else',
  whatsapp: 'WhatsApp only',
  email: 'Email only',
  both: 'WhatsApp and email',
};

const usesWhatsApp = (mode) => mode !== 'email';
const usesEmail = (mode) => mode !== 'whatsapp';

// The Resend free plan allows 100 emails a day across everything the domain
// sends, including the web app's KYC and chat emails. Campaigns stop at this
// many a day by default so those keep working.
export const DEFAULT_EMAIL_DAILY_ALLOWANCE = 70;

const WHATSAPP_PER_CHUNK = 25;
const WHATSAPP_CONCURRENCY = 5;
const LOCK_MS = 120 * 1000;

const SETTINGS_REF = () => adminDb.collection('admin_metadata').doc('campaign_settings');
const campaignRef = (id) => adminDb.collection('campaigns').doc(id);

// ─────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────

export async function getCampaignSettings() {
  const snap = await SETTINGS_REF().get();
  const data = snap.exists ? snap.data() : {};
  return {
    headOfficeAddress: data.headOfficeAddress || '',
    emailDailyAllowance: Number.isInteger(data.emailDailyAllowance) ? data.emailDailyAllowance : DEFAULT_EMAIL_DAILY_ALLOWANCE,
  };
}

export async function saveCampaignSettings({ headOfficeAddress, emailDailyAllowance }) {
  const allowance = Number(emailDailyAllowance);
  if (!Number.isInteger(allowance) || allowance < 0 || allowance > 100000) {
    throw new CampaignError('The daily email allowance must be a whole number.');
  }
  await SETTINGS_REF().set({
    headOfficeAddress: String(headOfficeAddress || '').trim().slice(0, 500),
    emailDailyAllowance: allowance,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return getCampaignSettings();
}

// ─────────────────────────────────────────
// EMAIL ALLOWANCE (per UTC day, like Resend's own count)
// ─────────────────────────────────────────

const todayKey = () => new Date().toISOString().slice(0, 10);
const usageRef = () => adminDb.collection('emailDailyUsage').doc(todayKey());

export async function getEmailUsageToday() {
  const [snap, settings] = await Promise.all([usageRef().get(), getCampaignSettings()]);
  const used = snap.exists ? snap.data().campaignEmails || 0 : 0;
  return { used, allowance: settings.emailDailyAllowance, remaining: Math.max(0, settings.emailDailyAllowance - used) };
}

// Takes up to `wanted` emails from today's allowance and returns how many were
// granted. Not handed back if a send then fails — erring on sending fewer.
// Test sends use it too: they count against Resend's daily limit like any email.
export async function reserveEmails(wanted) {
  const { emailDailyAllowance } = await getCampaignSettings();
  return adminDb.runTransaction(async (tx) => {
    const ref = usageRef();
    const snap = await tx.get(ref);
    const used = snap.exists ? snap.data().campaignEmails || 0 : 0;
    const granted = Math.max(0, Math.min(wanted, emailDailyAllowance - used));
    if (granted > 0) tx.set(ref, { campaignEmails: used + granted, updatedAt: new Date().toISOString() }, { merge: true });
    return granted;
  });
}

// ─────────────────────────────────────────
// CONTENT
// ─────────────────────────────────────────

export class CampaignError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'CampaignError';
    this.status = status;
  }
}

/**
 * Checks content for a mode and returns it normalised, with the chosen
 * WhatsApp template's definition copied in (so the campaign keeps sending the
 * template it was created with).
 *   content = { email: { subject, body }, whatsapp: { templateName, variables: { name: text } } }
 */
export async function prepareContent(mode, content = {}) {
  if (!MODES[mode]) throw new CampaignError('Choose how to send the campaign.');
  const prepared = {};

  if (usesEmail(mode)) {
    const subject = String(content.email?.subject || '').trim();
    const body = String(content.email?.body || '').trim();
    if (!subject) throw new CampaignError('The email needs a subject.');
    if (!body) throw new CampaignError('The email needs a message.');
    if (subject.length > 200) throw new CampaignError('The email subject is too long (200 characters max).');
    const unknown = findUnknownPlaceholders(`${subject}\n${body}`);
    if (unknown.length) throw new CampaignError(`Unknown placeholder: {{${unknown[0]}}}. Use {{firstName}}, {{fullName}} or {{school}}.`);
    prepared.email = { subject, body };
  }

  if (usesWhatsApp(mode)) {
    const templateName = content.whatsapp?.templateName;
    if (!templateName) throw new CampaignError('Choose a WhatsApp template.');
    const templates = await getMarketingTemplates();
    const template = templates.find(t => t.name === templateName);
    if (!template) throw new CampaignError(`WhatsApp template "${templateName}" isn't an approved Marketing template.`);
    if (!template.supported) throw new CampaignError(`WhatsApp template "${templateName}" needs header or button values, which campaigns can't fill yet.`);
    const variables = {};
    for (const name of template.variables) {
      const text = String(content.whatsapp?.variables?.[name] || '').trim();
      if (!text) throw new CampaignError(`Fill in the WhatsApp template's "${name}".`);
      const unknown = findUnknownPlaceholders(text);
      if (unknown.length) throw new CampaignError(`Unknown placeholder in "${name}": {{${unknown[0]}}}.`);
      variables[name] = text;
    }
    prepared.whatsapp = {
      template: {
        name: template.name,
        language: template.language,
        body: template.body,
        variables: template.variables,
        parameterFormat: template.parameterFormat,
      },
      variables,
    };
  }
  return prepared;
}

// ─────────────────────────────────────────
// FOOTERS (school branch, or head office)
// ─────────────────────────────────────────

async function getFooterLookup() {
  const [schoolsSnap, settings] = await Promise.all([
    adminDb.collection('schools').get(),
    getCampaignSettings(),
  ]);
  const branches = new Map();
  schoolsSnap.forEach(doc => {
    const { name, branch } = doc.data();
    if (name && branch && (branch.address || branch.supportWhatsApp || branch.supportEmail)) branches.set(name, branch);
  });
  return (school) => {
    const branch = branches.get(school);
    if (branch) {
      const contacts = [
        branch.supportWhatsApp ? `WhatsApp +${branch.supportWhatsApp}` : null,
        branch.supportEmail || null,
      ].filter(Boolean).join(' · ');
      return { branchName: `TrybeMarket ${school}`, address: branch.address || '', supportLine: contacts };
    }
    return { branchName: 'TrybeMarket', address: settings.headOfficeAddress, supportLine: 'contact@trybemarket.online' };
  };
}

let compiledLayout = null;
function layout() {
  if (!compiledLayout) {
    const source = fs.readFileSync(path.join(process.cwd(), 'templates', 'campaign.hbs'), 'utf-8');
    compiledLayout = Handlebars.compile(source);
  }
  return compiledLayout;
}

/** The email one recipient gets: { subject, html, text, headers }. */
export function renderEmail(emailContent, recipient, footerFor, { test = false } = {}) {
  const values = recipientValues(recipient);
  const subject = (test ? '[TEST] ' : '') + formatSubject(emailContent.subject, values);
  const footer = footerFor(recipient.school);
  const unsubscribeUrl = recipient.uid ? unsubscribePageUrl(recipient.uid) : '#';
  const html = layout()({
    subject,
    bodyHtml: formatEmailHtml(emailContent.body, values),
    school: recipient.school,
    unsubscribeUrl,
    ...footer,
  });
  const footerText = [footer.branchName, footer.address, footer.supportLine].filter(Boolean).join('\n');
  const text = `${formatEmailText(emailContent.body, values)}\n\nThe TrybeMarket Team\n\n${footerText}\n\nUnsubscribe from offers and updates: ${unsubscribeUrl}`;
  return { subject, html, text, headers: recipient.uid ? unsubscribeHeaders(recipient.uid) : undefined };
}

/** The WhatsApp variable values one recipient gets: { name: text }. */
export function renderWhatsAppValues(whatsappContent, recipient) {
  const values = recipientValues(recipient);
  return Object.fromEntries(
    whatsappContent.template.variables.map(name => [name, formatWhatsAppValue(whatsappContent.variables[name], values)])
  );
}

export { getFooterLookup };

// ─────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────

// Which channels a recipient gets in a mode. "whatsapp_then_email" sends
// WhatsApp where possible and email otherwise; if a WhatsApp message then
// fails, sendNextChunk falls back to email (emailFallback).
function channelsFor(mode, r) {
  const wa = usesWhatsApp(mode) && r.whatsappEligible;
  const email =
    mode === 'email' || mode === 'both' ? r.emailEligible :
    mode === 'whatsapp_then_email' ? r.emailEligible && !wa :
    false;
  return { wa, email, emailFallback: mode === 'whatsapp_then_email' && wa && r.emailEligible };
}

/** Counts (and a sample) for an audience in a mode — what the confirm step shows. */
export async function previewAudience(audience, mode) {
  const people = await getCampaignAudience(audience);
  let whatsapp = 0, email = 0, unreachable = 0;
  const reachable = [];
  for (const r of people) {
    const { wa, email: em } = channelsFor(MODES[mode] ? mode : 'whatsapp_then_email', r);
    if (wa) whatsapp++;
    if (em) email++;
    if (!wa && !em) unreachable++;
    else reachable.push({ ...r, channels: [wa && 'whatsapp', em && 'email'].filter(Boolean) });
  }
  return {
    matched: people.length,
    reachable: reachable.length,
    whatsapp,
    email,
    unreachable,
    sample: reachable.slice(0, 8).map(r => ({
      uid: r.uid, fullName: r.fullName, school: r.school, segment: r.segment, channels: r.channels,
    })),
  };
}

export async function createCampaign({ name, mode, audience, content, admin }) {
  const prepared = await prepareContent(mode, content);
  const people = await getCampaignAudience(audience);

  const recipients = [];
  for (const r of people) {
    const { wa, email, emailFallback } = channelsFor(mode, r);
    if (!wa && !email) continue;
    recipients.push({
      uid: r.uid,
      name: r.fullName,
      school: r.school,
      email: r.email,
      phone: r.phone,
      segment: r.segment,
      whatsapp: { status: wa ? 'pending' : 'skipped' },
      email_: { status: email ? 'pending' : 'skipped' },
      emailFallback,
    });
  }
  if (recipients.length === 0) throw new CampaignError('Nobody in this audience can be reached in this mode.');

  const waCount = recipients.filter(r => r.whatsapp.status === 'pending').length;
  const emailCount = recipients.filter(r => r.email_.status === 'pending').length;
  const ref = adminDb.collection('campaigns').doc();
  const now = new Date().toISOString();

  await ref.set({
    name: String(name || '').trim().slice(0, 120) || 'Untitled campaign',
    mode,
    audience: {
      segments: audience.segments || [],
      schools: audience.schools || [],
      kyc: audience.kyc || null,
      signedUpWithinDays: audience.signedUpWithinDays || null,
    },
    content: prepared,
    status: 'sending',
    createdBy: { uid: admin.uid, name: admin.name || '' },
    createdAt: now,
    recipientCount: recipients.length,
    counts: {
      whatsapp: { targeted: waCount, sent: 0, failed: 0 },
      email: { targeted: emailCount, sent: 0, failed: 0, fallback: 0 },
    },
  });

  // Firestore batches hold at most 500 writes.
  for (let i = 0; i < recipients.length; i += 450) {
    const batch = adminDb.batch();
    recipients.slice(i, i + 450).forEach(({ email_, ...r }) => {
      batch.set(ref.collection('recipients').doc(r.uid), { ...r, email: r.email, emailStatus: email_ });
    });
    await batch.commit();
  }

  return { id: ref.id, recipientCount: recipients.length, whatsapp: waCount, email: emailCount };
}

// ─────────────────────────────────────────
// SEND
// ─────────────────────────────────────────

async function acquireLock(id) {
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(campaignRef(id));
    if (!snap.exists) throw new CampaignError('Campaign not found.', 404);
    const data = snap.data();
    if (data.lockUntil && data.lockUntil > Date.now()) return null;
    tx.update(campaignRef(id), { lockUntil: Date.now() + LOCK_MS });
    return data;
  });
}

const releaseLock = (id) => campaignRef(id).update({ lockUntil: FieldValue.delete() });

// Meta error 131050: the person stopped marketing messages from this business.
const STOPPED_MARKETING = 131050;

async function sendWhatsAppChunk(id, campaign) {
  const snap = await campaignRef(id).collection('recipients')
    .where('whatsapp.status', '==', 'pending').limit(WHATSAPP_PER_CHUNK).get();
  let sent = 0, failed = 0, fallback = 0, rateLimited = false;

  const queue = [...snap.docs];
  const worker = async () => {
    while (queue.length && !rateLimited) {
      const doc = queue.shift();
      const r = doc.data();
      try {
        const values = renderWhatsAppValues(campaign.content.whatsapp, { fullName: r.name, school: r.school });
        const { messageId } = await sendTemplateMessage({ to: r.phone, template: campaign.content.whatsapp.template, values });
        const now = new Date().toISOString();
        await Promise.all([
          doc.ref.update({ whatsapp: { status: 'sent', messageId, sentAt: now } }),
          messageId && adminDb.collection('whatsappMessages').doc(messageId).set({
            campaignId: id, uid: r.uid, status: 'sent', statusAt: { sent: now },
          }),
        ]);
        sent++;
      } catch (error) {
        if (error instanceof WhatsAppError && error.isRateLimit) {
          rateLimited = true; // leave pending; the next chunk retries
          queue.unshift(doc);
          break;
        }
        const message = error.message?.slice(0, 300) || 'Unknown error';
        const update = { whatsapp: { status: 'failed', error: message, code: error.code ?? null } };
        if (r.emailFallback) {
          update.emailStatus = { status: 'pending', fallback: true };
          fallback++;
        }
        await doc.ref.update(update);
        if (error.code === STOPPED_MARKETING) {
          await adminDb.collection('users').doc(r.uid).update({
            whatsappMarketing: false,
            whatsappMarketingOptOutAt: new Date().toISOString(),
            whatsappMarketingOptOutSource: 'meta_stopped_marketing',
          }).catch(() => {});
        }
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: WHATSAPP_CONCURRENCY }, worker));

  if (sent || failed || fallback) {
    await campaignRef(id).update({
      'counts.whatsapp.sent': FieldValue.increment(sent),
      'counts.whatsapp.failed': FieldValue.increment(failed),
      'counts.email.targeted': FieldValue.increment(fallback),
      'counts.email.fallback': FieldValue.increment(fallback),
    });
  }
  return { sent, failed, rateLimited };
}

async function sendEmailChunk(id, campaign) {
  const snap = await campaignRef(id).collection('recipients')
    .where('emailStatus.status', '==', 'pending').limit(MAX_BATCH_SIZE).get();
  if (snap.empty) return { sent: 0, failed: 0, quotaReached: false };

  const granted = await reserveEmails(snap.size);
  if (granted === 0) return { sent: 0, failed: 0, quotaReached: true };
  const docs = snap.docs.slice(0, granted);

  const footerFor = await getFooterLookup();
  const messages = docs.map(doc => {
    const r = doc.data();
    const email = renderEmail(campaign.content.email, { uid: r.uid, fullName: r.name, school: r.school }, footerFor);
    return { to: r.email, ...email };
  });

  // Same key for the same recipients, so a retried chunk isn't sent twice.
  const idempotencyKey = `campaign-${id}-` + crypto.createHash('sha256').update(docs.map(d => d.id).join(',')).digest('hex').slice(0, 32);
  const now = new Date().toISOString();
  let sent = 0, failed = 0, quotaReached = granted < snap.size;

  const markSent = (doc, resendId) => doc.ref.update({ emailStatus: { status: 'sent', resendId, sentAt: now, ...(doc.data().emailStatus?.fallback ? { fallback: true } : {}) } });
  const markFailed = (doc, error) => doc.ref.update({ emailStatus: { status: 'failed', error: String(error.message || error).slice(0, 300) } });

  try {
    const results = await sendEmailBatch(messages, { idempotencyKey });
    await Promise.all(docs.map((doc, i) => markSent(doc, results[i]?.id || null)));
    sent = docs.length;
  } catch (error) {
    if (error instanceof MailError && (error.isQuota || error.isRateLimit)) {
      return { sent: 0, failed: 0, quotaReached: error.isQuota }; // leave pending
    }
    // One bad message fails a whole batch — send individually to isolate it.
    for (let i = 0; i < docs.length; i++) {
      try {
        const result = await sendEmail(messages[i], { idempotencyKey: `${idempotencyKey}-${i}` });
        await markSent(docs[i], result.id);
        sent++;
      } catch (single) {
        if (single instanceof MailError && single.isQuota) { quotaReached = true; break; }
        await markFailed(docs[i], single);
        failed++;
      }
    }
  }

  await campaignRef(id).update({
    'counts.email.sent': FieldValue.increment(sent),
    'counts.email.failed': FieldValue.increment(failed),
  });
  return { sent, failed, quotaReached };
}

async function pendingCounts(id) {
  const recipients = campaignRef(id).collection('recipients');
  const [wa, em] = await Promise.all([
    recipients.where('whatsapp.status', '==', 'pending').count().get(),
    recipients.where('emailStatus.status', '==', 'pending').count().get(),
  ]);
  return { whatsapp: wa.data().count, email: em.data().count };
}

/**
 * Sends the next chunk of a campaign: up to 25 WhatsApp messages and one
 * email batch (up to 100, within today's allowance). Returns the campaign's
 * progress. Safe to call repeatedly or from two places at once — a lock lets
 * only one caller send at a time ({ busy: true } for the other).
 */
export async function sendNextChunk(id) {
  const campaign = await acquireLock(id);
  if (!campaign) return { busy: true };
  try {
    if (!['sending', 'paused_quota'].includes(campaign.status)) {
      return { status: campaign.status, counts: campaign.counts, pending: { whatsapp: 0, email: 0 } };
    }

    const wa = campaign.content.whatsapp ? await sendWhatsAppChunk(id, campaign) : { sent: 0, failed: 0 };
    const em = campaign.content.email ? await sendEmailChunk(id, campaign) : { sent: 0, failed: 0, quotaReached: false };

    const pending = await pendingCounts(id);
    const fresh = (await campaignRef(id).get()).data();
    const anyFailed = fresh.counts.whatsapp.failed > 0 || fresh.counts.email.failed > 0;

    let status = 'sending';
    if (pending.whatsapp === 0 && pending.email === 0) {
      const anySent = fresh.counts.whatsapp.sent > 0 || fresh.counts.email.sent > 0;
      status = !anySent ? 'failed' : anyFailed ? 'partial' : 'sent';
    } else if (pending.whatsapp === 0 && em.quotaReached) {
      status = 'paused_quota';
    }

    await campaignRef(id).update({
      status,
      ...(status === 'sent' || status === 'partial' || status === 'failed' ? { finishedAt: new Date().toISOString() } : {}),
      lastChunkAt: new Date().toISOString(),
    });
    return { status, counts: fresh.counts, pending, chunk: { whatsapp: wa, email: em } };
  } finally {
    await releaseLock(id);
  }
}

export async function listCampaigns(limit = 20) {
  const snap = await adminDb.collection('campaigns').orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map(doc => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name,
      mode: d.mode,
      status: d.status,
      createdAt: d.createdAt,
      finishedAt: d.finishedAt || null,
      createdBy: d.createdBy?.name || '',
      recipientCount: d.recipientCount,
      counts: d.counts,
      audience: d.audience,
      template: d.content?.whatsapp?.template?.name || null,
      subject: d.content?.email?.subject || null,
    };
  });
}
