import { requireAdminPages } from '@/lib/requireAdmin';
import { previewAudience } from '@/lib/campaigns';
import { sendCampaignError } from '@/lib/campaignApi';

/** POST /api/campaigns/audience { audience, mode } → counts per channel + a sample. */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const admin = await requireAdminPages(req, res);
  if (!admin) return;
  try {
    const { audience, mode } = req.body || {};
    return res.status(200).json(await previewAudience(audience || {}, mode));
  } catch (error) {
    return sendCampaignError(res, error, 'audience');
  }
}
