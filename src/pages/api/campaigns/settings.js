import { requireAdminPages } from '@/lib/requireAdmin';
import { saveCampaignSettings } from '@/lib/campaigns';
import { sendCampaignError } from '@/lib/campaignApi';

/** POST /api/campaigns/settings { headOfficeAddress, emailDailyAllowance } */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const admin = await requireAdminPages(req, res);
  if (!admin) return;
  try {
    return res.status(200).json({ settings: await saveCampaignSettings(req.body || {}) });
  } catch (error) {
    return sendCampaignError(res, error, 'settings');
  }
}
