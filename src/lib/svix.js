// Verifies webhook signatures in the Svix format Resend uses
// (https://docs.svix.com/receiving/verifying-payloads/how-manual).
import crypto from 'crypto';

const MAX_AGE_SECONDS = 5 * 60;

/**
 * True when `rawBody` was signed with `secret` ("whsec_…") per the svix-id,
 * svix-timestamp and svix-signature headers, and is at most 5 minutes old.
 */
export function isValidSvixSignature(rawBody, headers, secret, now = Date.now()) {
  const id = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  const signatures = headers['svix-signature'];
  if (!secret || !id || !timestamp || !signatures) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > MAX_AGE_SECONDS) return false;

  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const expected = Buffer.from(
    crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64')
  );
  // Header holds space-separated "v1,<base64>" entries (several during key rotation).
  return String(signatures).split(' ').some(entry => {
    const [version, signature] = entry.split(',');
    if (version !== 'v1' || !signature) return false;
    const given = Buffer.from(signature);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
}
