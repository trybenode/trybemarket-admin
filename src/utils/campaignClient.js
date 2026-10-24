import { authedFetch } from '@/utils/authedFetch';

// Browser-side calls to /api/campaigns/* (see src/lib/campaigns.js).

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

export const getCampaignOptions = () => call('/api/campaigns/options');
export const listCampaigns = () => call('/api/campaigns').then(d => d.campaigns);
export const previewAudience = (audience, mode, whatsappCategory) =>
  call('/api/campaigns/audience', { method: 'POST', body: { audience, mode, whatsappCategory } });
export const previewMessage = (mode, content, uid) => call('/api/campaigns/preview', { method: 'POST', body: { mode, content, uid } });
export const sendTest = (body) => call('/api/campaigns/test', { method: 'POST', body });
export const createCampaign = (body) => call('/api/campaigns', { method: 'POST', body });
export const saveCampaignSettings = (settings) => call('/api/campaigns/settings', { method: 'POST', body: settings }).then(d => d.settings);

const wait = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Sends a campaign chunk by chunk until it's no longer "sending" — finished,
 * or paused on the daily email allowance. Calls onProgress after each chunk.
 * `shouldStop()` lets the page stop the loop (the campaign stays resumable).
 */
export async function runCampaign(id, onProgress, shouldStop = () => false) {
  let progress;
  let busyStreak = 0;
  do {
    progress = await call(`/api/campaigns/${id}/send`, { method: 'POST' });
    if (progress.busy) {
      // Another tab (or the daily job) is sending this chunk right now.
      busyStreak++;
      if (busyStreak > 20) throw new Error('This campaign is being sent somewhere else. Check back in a few minutes.');
      await wait(3000);
      continue;
    }
    busyStreak = 0;
    onProgress?.(progress);
  } while ((progress.busy || progress.status === 'sending') && !shouldStop());
  return progress;
}

export const searchPeople = (q) => call(`/api/campaigns/people?q=${encodeURIComponent(q)}`).then(d => d.people);

export const getCampaignDetail = (id) => call(`/api/campaigns/${id}`);
