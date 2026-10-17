import { requireAdminPages } from '@/lib/requireAdmin';
import { sendNextChunk } from '@/lib/campaigns';
import { sendCampaignError } from '@/lib/campaignApi';

/**
 * POST /api/campaigns/[id]/send — sends the next chunk and returns progress.
 * The Campaigns page calls this repeatedly until the status is no longer
 * "sending" (sent / partial / failed / paused_quota).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const admin = await requireAdminPages(req, res);
  if (!admin) return;
  try {
    return res.status(200).json(await sendNextChunk(String(req.query.id)));
  } catch (error) {
    return sendCampaignError(res, error, 'send');
  }
}
