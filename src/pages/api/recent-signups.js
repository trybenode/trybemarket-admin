import { requireAdminPages } from '@/lib/requireAdmin'
import { adminDb } from '@/lib/firebaseAdmin'
import { getAuthCreationTimes } from '@/utils/analytics'

/**
 * GET /api/recent-signups?limit=5
 *
 * The newest accounts, ordered by when Firebase Auth created them. Not by
 * users.createdAt: the web app's Google sign-in used to overwrite that on
 * every login, which made returning users show up as new sign-ups.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const admin = await requireAdminPages(req, res)
  if (!admin) return

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 50)

  try {
    const authTimes = await getAuthCreationTimes()
    // Take a few extra: an Auth account without a users doc never finished signing up.
    const newest = [...authTimes.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit * 3)

    const snaps = newest.length
      ? await adminDb.getAll(...newest.map(([uid]) => adminDb.collection('users').doc(uid)))
      : []

    const signups = []
    snaps.forEach((snap, i) => {
      if (!snap.exists || signups.length >= limit) return
      const data = snap.data()
      signups.push({
        id: snap.id,
        name: data.fullName || data.displayName || data.email || 'Unknown User',
        createdAt: newest[i][1].toISOString(),
      })
    })

    res.status(200).json({ signups })
  } catch (error) {
    console.error('Recent signups error:', error)
    res.status(500).json({ error: 'Failed to fetch recent signups' })
  }
}
