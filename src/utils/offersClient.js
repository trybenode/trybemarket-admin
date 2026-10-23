import { authedFetch } from '@/utils/authedFetch';

// Browser-side calls for the Offers page. Plan logic lives in the web app
// (lib/planGrantServer.js); /api/offers/* relays to it with the admin's token.

async function call(path, { method = 'GET', body } = {}) {
  const res = await authedFetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const getOffers = () => call('/api/offers');
export const getGiftOptions = () => call('/api/offers/audience');
export const resolveAudience = (audience) => call('/api/offers/audience', { method: 'POST', body: { audience } });
export const createPromotion = (promotion) => call('/api/offers/promotions', { method: 'POST', body: promotion });
export const updatePromotion = (id, body) => call(`/api/offers/promotions/${id}`, { method: 'POST', body });
export const revokeGrant = (id) => call(`/api/offers/grants/${id}/revoke`, { method: 'POST', body: {} });

// Small requests: each grant is several database steps plus a ranking
// re-sync, and the relay to the web app waits about 15 seconds.
const GIFT_CHUNK = 10;

/**
 * Gives `gift` ({ kind, planId?, durationDays, boostCount?, note }) to every
 * uid, a few at a time. onProgress({ done, total, granted, extended, skipped, failed }).
 * Returns the totals and every skipped/failed person with the reason.
 */
export async function giftInChunks(userIds, gift, onProgress) {
  const totals = { done: 0, total: userIds.length, granted: 0, extended: 0, skipped: 0, failed: 0 };
  const problems = [];
  for (let i = 0; i < userIds.length; i += GIFT_CHUNK) {
    const chunk = userIds.slice(i, i + GIFT_CHUNK);
    try {
      const r = await call('/api/offers/grants', { method: 'POST', body: { ...gift, userIds: chunk } });
      for (const key of ['granted', 'extended', 'skipped', 'failed']) totals[key] += r[key] || 0;
      problems.push(...r.results.filter(x => x.status === 'skipped' || x.status === 'failed'));
    } catch (error) {
      // A whole chunk failing (e.g. a network blip) is reported, not retried
      // blindly — a retry could double-extend anyone the server already did.
      totals.failed += chunk.length;
      problems.push(...chunk.map(uid => ({ uid, status: 'failed', reason: error.message })));
    }
    totals.done = Math.min(userIds.length, i + chunk.length);
    onProgress?.({ ...totals });
  }
  return { ...totals, problems };
}

/** Applies a promotion to already-verified students, step by step until done. */
export async function applyToVerified(promotionId, onProgress) {
  const totals = { granted: 0, extended: 0, skipped: 0, full: false };
  for (let step = 0; step < 200; step++) {
    const { applied } = await updatePromotion(promotionId, { action: 'applyToVerified' });
    totals.granted += applied.granted;
    totals.extended += applied.extended;
    totals.skipped += applied.skipped;
    totals.full = applied.full;
    onProgress?.({ ...totals });
    if (!applied.remaining) break;
  }
  return totals;
}
