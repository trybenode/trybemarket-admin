// src/pages/api/analytics-dashboard.js
// API route for fetching analytics dashboard data

import { getAnalyticsDashboardData, getUserSegments } from '@/utils/analytics';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    // Verify the caller is an authenticated admin
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = await adminAuth.verifyIdToken(token);
    
    // Check if user is in admins collection
    const adminDoc = await adminDb.collection('admins').doc(decoded.uid).get();
    if (!adminDoc.exists) return res.status(403).json({ error: 'Forbidden' });

    const campusId = req.query.campus_id || null;
    const [data, segmentsData] = await Promise.all([
      getAnalyticsDashboardData(campusId),
      getUserSegments(campusId),
    ]);

    res.status(200).json({ ...data, segments: segmentsData.segments });
  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}
