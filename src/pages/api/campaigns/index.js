import { requireAdminPages } from '@/lib/requireAdmin';
import { createCampaign, listCampaigns } from '@/lib/campaigns';
import { sendCampaignError } from '@/lib/campaignApi';

/**
 * GET  /api/campaigns  → recent campaigns
 * POST /api/campaigns  { name, mode, audience, content } → creates the
 *      campaign with its recipients frozen; the page then sends it chunk by
 *      chunk via /api/campaigns/[id]/send.
 */
export default async function handler(req, res) {
  const admin = await requireAdminPages(req, res);
  if (!admin) return;

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ campaigns: await listCampaigns() });
    }
    if (req.method === 'POST') {
      const { name, mode, audience, content } = req.body || {};
      const result = await createCampaign({ name, mode, audience: audience || {}, content, admin });
      return res.status(201).json(result);
    }
    return res.status(405).end();
  } catch (error) {
    return sendCampaignError(res, error, req.method === 'POST' ? 'create' : 'list');
  }
}
