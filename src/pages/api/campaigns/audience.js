import { requireAdminPages } from '@/lib/requireAdmin';
import { previewAudience } from '@/lib/campaigns';
import { sendCampaignError } from '@/lib/campaignApi';

/**
 * POST /api/campaigns/audience { audience, mode, whatsappCategory? } → counts
 * per channel + a sample. whatsappCategory ("marketing" | "utility") is the
 * chosen template's — it decides who can get WhatsApp.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const admin = await requireAdminPages(req, res);
  if (!admin) return;
  try {
    const { audience, mode, whatsappCategory } = req.body || {};
    return res.status(200).json(await previewAudience(audience || {}, mode, whatsappCategory));
  } catch (error) {
    return sendCampaignError(res, error, 'audience');
  }
}
