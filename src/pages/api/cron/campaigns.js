import crypto from 'crypto';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendNextChunk } from '@/lib/campaigns';

// Leaves headroom under the function's time limit.
const TIME_BUDGET_MS = 240 * 1000;

const sameSecret = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/**
 * GET /api/cron/campaigns — run daily by Vercel Cron (vercel.json).
 * Resumes campaigns paused on the daily email allowance, and finishes any
 * left mid-send (tab closed). Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !sameSecret(req.headers.authorization || '', `Bearer ${secret}`)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const started = Date.now();
  const snap = await adminDb.collection('campaigns').where('status', 'in', ['paused_quota', 'sending']).get();
  const results = [];
  for (const doc of snap.docs) {
    let progress = { status: doc.data().status };
    try {
      if (progress.status === 'paused_quota') await doc.ref.update({ status: 'sending' });
      do {
        progress = await sendNextChunk(doc.id);
      } while (progress.status === 'sending' && !progress.busy && Date.now() - started < TIME_BUDGET_MS);
    } catch (error) {
      console.error(`Cron: campaign ${doc.id} failed:`, error);
      progress = { status: 'error', error: error.message };
    }
    results.push({ id: doc.id, status: progress.status });
    if (Date.now() - started >= TIME_BUDGET_MS) break;
  }
  return res.status(200).json({ resumed: results });
}
