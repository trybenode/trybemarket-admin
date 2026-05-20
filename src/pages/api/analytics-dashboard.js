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

    // users.selectedUniversity stores the school NAME, not the doc ID.
    // Resolve the name here so analytics functions can filter users correctly.
    let campusName = null;
    if (campusId) {
      const schoolDoc = await adminDb.collection('schools').doc(campusId).get();
      campusName = schoolDoc.exists ? schoolDoc.data().name : null;
    }

    const [data, segmentsData] = await Promise.all([
      getAnalyticsDashboardData(campusId, campusName),
      getUserSegments(campusId, campusName),
    ]);

    res.status(200).json({ ...data, segments: segmentsData.segments });
  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}
