import { requireAdminPages } from '@/lib/requireAdmin';
import { searchUsers } from '@/lib/audience';

/** GET /api/campaigns/people?q=… — users matching a name or email, for "specific people". */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const admin = await requireAdminPages(req, res);
  if (!admin) return;
  try {
    return res.status(200).json({ people: await searchUsers(req.query.q) });
  } catch (error) {
    console.error('Campaign people search error:', error);
    return res.status(500).json({ error: 'Search failed. Please try again.' });
  }
}
