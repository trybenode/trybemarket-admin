// Server-only: sends email through Resend (https://resend.com/docs/api-reference).
//
// Same provider and sender domain as the web app, which is verified in Resend
// (DKIM at resend._domainkey.trybemarket.online). Replies go to the Zoho
// mailbox for contact@trybemarket.online. Called over plain fetch, so there's
// no SDK dependency.

const RESEND_API_URL = 'https://api.resend.com';

export const DEFAULT_FROM = process.env.RESEND_FROM || 'TrybeMarket <contact@trybemarket.online>';
export const DEFAULT_REPLY_TO = process.env.EMAIL_REPLY_TO || 'contact@trybemarket.online';

// Resend's batch endpoint takes at most 100 emails per request.
export const MAX_BATCH_SIZE = 100;

// Error names Resend uses when a send is refused for quota rather than for
// something wrong with the email. Campaign sending pauses on these instead of
// marking recipients as failed.
const QUOTA_ERRORS = new Set(['daily_quota_exceeded', 'monthly_quota_exceeded']);

export class MailError extends Error {
  constructor(message, { status = null, name = null } = {}) {
    super(message);
    this.name = 'MailError';
    this.status = status;
    this.resendError = name;
    this.isQuota = QUOTA_ERRORS.has(name);
    this.isRateLimit = name === 'rate_limit_exceeded';
  }
}

async function resendRequest(path, body, { idempotencyKey } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new MailError('RESEND_API_KEY is not set, so email cannot be sent.');

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  // Resend returns the original result for a repeated key instead of sending
  // again, so a retried request can't email anyone twice.
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await fetch(`${RESEND_API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new MailError(data.message || `Resend request failed (${response.status})`, {
      status: response.status,
      name: data.name || null,
    });
  }
  return data;
}

const toMessage = ({ to, subject, html, text, replyTo, headers, from }) => ({
  from: from || DEFAULT_FROM,
  to: Array.isArray(to) ? to : [to],
  subject,
  html,
  ...(text ? { text } : {}),
  reply_to: replyTo || DEFAULT_REPLY_TO,
  ...(headers ? { headers } : {}),
});

/** Sends one email. Returns { id } (Resend's email ID). Throws MailError. */
export async function sendEmail(message, { idempotencyKey } = {}) {
  const data = await resendRequest('/emails', toMessage(message), { idempotencyKey });
  return { id: data.id };
}

/**
 * Sends up to 100 emails in one request, each with its own recipient and
 * content. Returns [{ id }] in the same order. Throws MailError — the whole
 * batch is accepted or refused together.
 */
export async function sendEmailBatch(messages, { idempotencyKey } = {}) {
  if (messages.length === 0) return [];
  if (messages.length > MAX_BATCH_SIZE) {
    throw new MailError(`A batch can hold at most ${MAX_BATCH_SIZE} emails (got ${messages.length}).`);
  }
  const data = await resendRequest('/emails/batch', messages.map(toMessage), { idempotencyKey });
  return (data.data || []).map(item => ({ id: item.id }));
}
