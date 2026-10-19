import { adminDb } from '@/lib/firebaseAdmin';
import { isValidSvixSignature } from '@/lib/svix';

/**
 * POST /api/webhooks/resend — Resend delivery events (08-campaign-messaging.md
 * Phase 5). Configure in Resend → Webhooks with this URL and the events
 * email.delivered, email.delivery_delayed, email.bounced, email.complained,
 * email.failed; put the webhook's signing secret in RESEND_WEBHOOK_SECRET.
 *
 * - Campaign emails (found in emailMessages/{email_id}): records the status on
 *   the message and on campaigns/{id}/recipients/{uid}.emailStatus.
 * - Any email to a user, campaign or not:
 *     complained (marked as spam) → marketingEmailOptOut, so no more promotions
 *     permanent bounce (address doesn't exist) → emailBounced, so campaigns
 *     stop emailing it
 *
 * Requests are verified with Resend's Svix signature; anything unsigned,
 * tampered with or older than 5 minutes is rejected.
 */

// The signature covers the exact bytes sent, so read the raw body.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const STATUS_FOR_EVENT = {
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
};
// Later statuses never go backwards (a late "delayed" can't undo "delivered");
// bounced / complained / failed are final, except a complaint can follow delivery.
const RANK = { sent: 1, delayed: 2, delivered: 3, bounced: 4, failed: 4, complained: 5 };

async function recordCampaignStatus(emailId, status, at, detail) {
  const ref = adminDb.collection('emailMessages').doc(emailId);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return; // not a campaign email
    const current = snap.data().status;
    if ((RANK[status] || 0) <= (RANK[current] || 0)) return;

    tx.update(ref, { status, [`statusAt.${status}`]: at, ...(detail ? { detail } : {}) });
    const { campaignId, uid } = snap.data();
    if (campaignId && uid) {
      tx.set(
        adminDb.collection('campaigns').doc(campaignId).collection('recipients').doc(uid),
        { emailStatus: { status, [`${status}At`]: at, ...(detail ? { error: detail } : {}) } },
        { merge: true }
      );
    }
  });
}

// Users whose account email is `address` (case-insensitive match on the stored value).
async function usersWithEmail(address) {
  const email = String(address || '').trim();
  if (!email) return [];
  const variants = [...new Set([email, email.toLowerCase()])];
  const snaps = await Promise.all(variants.map(v => adminDb.collection('users').where('email', '==', v).get()));
  const seen = new Map();
  snaps.forEach(s => s.docs.forEach(d => seen.set(d.id, d)));
  return [...seen.values()];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await readRawBody(req);
  if (!isValidSvixSignature(rawBody, req.headers, process.env.RESEND_WEBHOOK_SECRET)) {
    if (!process.env.RESEND_WEBHOOK_SECRET) console.error('Resend webhook: RESEND_WEBHOOK_SECRET is not set');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Bad request' });
  }

  const status = STATUS_FOR_EVENT[event.type];
  const data = event.data || {};
  if (!status || !data.email_id) return res.status(200).json({ ignored: true });

  const at = event.created_at || new Date().toISOString();
  const bounce = data.bounce || {};
  const detail =
    status === 'bounced' ? `${bounce.type || 'Bounce'}${bounce.subType ? ` (${bounce.subType})` : ''}: ${bounce.message || ''}`.trim().slice(0, 300) :
    status === 'complained' ? 'Marked as spam' :
    status === 'failed' ? String(data.failed?.reason || data.reason || 'Failed').slice(0, 300) :
    null;

  try {
    await recordCampaignStatus(String(data.email_id), status, at, detail);

    const recipients = Array.isArray(data.to) ? data.to : [data.to].filter(Boolean);
    if (status === 'complained' || (status === 'bounced' && bounce.type === 'Permanent')) {
      for (const address of recipients) {
        const users = await usersWithEmail(address);
        await Promise.all(users.map(doc => doc.ref.update(
          status === 'complained'
            ? { marketingEmailOptOut: true, marketingEmailOptOutAt: at, marketingEmailOptOutSource: 'spam_complaint' }
            : { emailBounced: true, emailBouncedAt: at, emailBounceDetail: detail }
        )));
      }
    }
  } catch (error) {
    // Logged, but still 200: Resend would otherwise retry the same event for hours.
    console.error(`Resend webhook (${event.type}) failed:`, error);
  }
  return res.status(200).json({ received: true });
}
