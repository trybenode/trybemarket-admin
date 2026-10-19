import { requireAdminPages } from '@/lib/requireAdmin';
import { getCampaignDetail } from '@/lib/campaigns';
import { sendCampaignError } from '@/lib/campaignApi';

/** GET /api/campaigns/[id] — one campaign with its delivery results. */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const admin = await requireAdminPages(req, res);
  if (!admin) return;
  try {
    return res.status(200).json(await getCampaignDetail(String(req.query.id)));
  } catch (error) {
    return sendCampaignError(res, error, 'detail');
  }
}
