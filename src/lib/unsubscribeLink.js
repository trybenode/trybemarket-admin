// Server-only: the unsubscribe link in campaign emails.
//
// The web app checks these links (trybemarket-web lib/unsubscribe.js), so the
// token must be made exactly the same way there: HMAC-SHA256 of
// "unsubscribe:<uid>" with UNSUBSCRIBE_SECRET (same value in both Vercel
// projects), base64url.
import crypto from 'crypto';

// www: the bare domain redirects, and Gmail's one-click unsubscribe POST
// isn't guaranteed to follow a redirect.
const WEB_APP_URL = (process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://www.trybemarket.online').replace(/\/$/, '');

export function createUnsubscribeToken(uid) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET is not set, so unsubscribe links cannot be made.');
  return crypto.createHmac('sha256', secret).update(`unsubscribe:${uid}`).digest('base64url');
}

const query = (uid) => `u=${encodeURIComponent(uid)}&t=${encodeURIComponent(createUnsubscribeToken(uid))}`;

/** Link shown in the email footer — opens the confirm page. */
export function unsubscribePageUrl(uid) {
  return `${WEB_APP_URL}/unsubscribe?${query(uid)}`;
}

/**
 * Headers for Gmail/Yahoo one-click unsubscribe (RFC 8058). The mail provider
 * POSTs to this URL directly, without opening the page.
 */
export function unsubscribeHeaders(uid) {
  return {
    'List-Unsubscribe': `<${WEB_APP_URL}/api/unsubscribe?${query(uid)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
