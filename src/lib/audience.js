// Server-only: who is in which user segment, and which schools users are at.
//
// The single source of truth for segments: the dashboard's User Segments and
// campaign audiences both read from here, so "Dormant Sellers at X" means the
// same people everywhere.
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export const SEGMENT_KEYS = [
  'activated_active',
  'activated_dormant',
  'never_activated',
  'subscribed',
  'churned',
];

export const SEGMENT_LABELS = {
  activated_active: 'Active Sellers',
  activated_dormant: 'Dormant Sellers',
  never_activated: 'Never Listed',
  subscribed: 'Active Subscribers',
  churned: 'Churned',
};

// A listing in the last ACTIVE_SELLER_DAYS days makes a seller "active".
const ACTIVE_SELLER_DAYS = 14;

const toDate = (val) => val?.toDate?.() ?? (val ? new Date(val) : null);

function daysAgoDate(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Subscription docs coexist in 3 formats:
//  1. New nested: { product: { planId, isActive, expiryDate (Timestamp) }, service, bundle }
//     top-level planId/isActive are stale legacy fields — ignore them
//  2. Old flat Premium: { planId: "Premium", isActive: true, expiryDate: Timestamp }
//  3. Old Freemium: { planId: "Freemium", isActive: false } — no paid plan, skip
// There is no `status` field, so a status == 'active' query always matches nothing.
export function classifySubscriptions(subSnap) {
  const now = new Date();
  const isActivePaidPlan = (plan) => {
    if (!plan?.planId || plan.planId === 'Freemium' || plan.planId.endsWith('_free')) return false;
    if (plan.category === 'boost') return false; // boosts are one-time, not subscriptions
    if (!plan.isActive) return false;
    const expiry = toDate(plan.expiryDate);
    return Boolean(expiry && expiry > now);
  };
  const hadPaidPlan = (plan) => {
    if (!plan?.planId || plan.planId === 'Freemium' || plan.planId.endsWith('_free')) return false;
    if (plan.category === 'boost') return false;
    return Boolean(plan.expiryDate);
  };

  const active = new Set();
  const churned = new Set();
  subSnap.forEach(doc => {
    const data = doc.data();
    const uid = data.userId || doc.id;

    // Check nested format first (product/service/bundle sub-objects)
    const hasActiveNested =
      isActivePaidPlan(data.product) ||
      isActivePaidPlan(data.service) ||
      isActivePaidPlan(data.bundle);
    const hadPaidNested =
      hadPaidPlan(data.product) ||
      hadPaidPlan(data.service) ||
      hadPaidPlan(data.bundle);

    // Check old flat format (top-level planId + expiryDate, no nested objects)
    const flatPlan = (!data.product && !data.service && !data.bundle) ? data : null;
    const hasActiveFlat = isActivePaidPlan(flatPlan);
    const hadPaidFlat = hadPaidPlan(flatPlan);

    if (hasActiveNested || hasActiveFlat) {
      active.add(uid);
    } else if (hadPaidNested || hadPaidFlat) {
      churned.add(uid);
    }
  });
  return { active, churned };
}

/**
 * Every user (or every user at one school) with their segment:
 *   [{ id, data, segment }]  — `data` is the raw users doc.
 *
 * Rules, checked in this order:
 *   churned           had a paid plan that has expired
 *   subscribed        has an active paid plan
 *   never_activated   never posted a product or service
 *   activated_active  posted something in the last 14 days
 *   activated_dormant has listings, nothing in the last 14 days
 */
export async function getSegmentedUsers({ campusName = null } = {}) {
  // users.selectedUniversity stores the school NAME, not the schools doc ID
  let usersQuery = adminDb.collection('users');
  if (campusName) usersQuery = usersQuery.where('selectedUniversity', '==', campusName);

  const recentDate = daysAgoDate(ACTIVE_SELLER_DAYS);
  const recentTs = Timestamp.fromDate(recentDate);
  const recentIso = recentDate.toISOString();

  // createdAt is a Timestamp on listings; the ISO-string fallback covers any
  // older docs that stored it as a string.
  const getRecentListers = async (collectionName) => {
    const tsSnap = await adminDb.collection(collectionName)
      .where('createdAt', '>=', recentTs).select('userId').get();
    if (tsSnap.size > 0) return tsSnap.docs.map(d => d.data().userId);
    const strSnap = await adminDb.collection(collectionName)
      .where('createdAt', '>=', recentIso).select('userId').get();
    return strSnap.docs.map(d => d.data().userId);
  };

  const [usersSnap, productsSnap, servicesSnap, recentProductIds, recentServiceIds, subSnap] =
    await Promise.all([
      usersQuery.get(),
      adminDb.collection('products').select('userId').get(),
      adminDb.collection('services').select('userId').get(),
      getRecentListers('products'),
      getRecentListers('services'),
      adminDb.collection('subscriptions').get(),
    ]);

  const hasListed = new Set([
    ...productsSnap.docs.map(d => d.data().userId),
    ...servicesSnap.docs.map(d => d.data().userId),
  ].filter(Boolean));
  const recentlyActive = new Set([...recentProductIds, ...recentServiceIds].filter(Boolean));
  const { active: activeSubscribers, churned } = classifySubscriptions(subSnap);

  return usersSnap.docs.map(doc => {
    const uid = doc.id;
    let segment;
    if (churned.has(uid)) segment = 'churned';
    else if (activeSubscribers.has(uid)) segment = 'subscribed';
    else if (!hasListed.has(uid)) segment = 'never_activated';
    else if (recentlyActive.has(uid)) segment = 'activated_active';
    else segment = 'activated_dormant';
    return { id: uid, data: doc.data(), segment };
  });
}

/**
 * The schools users have actually picked, with how many users each has —
 * from users.selectedUniversity, since the `schools` collection doesn't have
 * a doc for every school. `name: null` = users with no school set.
 */
export async function getSchoolsInUse() {
  const snap = await adminDb.collection('users').select('selectedUniversity').get();
  const counts = new Map();
  snap.forEach(doc => {
    const name = doc.data().selectedUniversity || null;
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([name, users]) => ({ name, users }))
    .sort((a, b) => b.users - a.users);
}
