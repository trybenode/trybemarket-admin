// src/utils/analytics.js
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function startOfWeek(weeksAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - weeksAgo * 7); // Sunday
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

// Returns a plain Date — used when querying collections that may store
// dates as ISO strings instead of Firestore Timestamps (e.g. users.createdAt)
function daysAgoDate(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Query a collection with a date range filter, trying Timestamp first and
 * falling back to ISO string comparison. Handles collections where the date
 * field type is inconsistent across documents.
 */
async function countWithDateFallback(baseQuery, field, sinceDate) {
  const sinceTimestamp = Timestamp.fromDate(sinceDate);
  const sinceIso = sinceDate.toISOString();

  const tsSnap = await baseQuery.where(field, '>=', sinceTimestamp).count().get();
  const tsCount = tsSnap.data().count;
  if (tsCount > 0) return tsCount;

  // Fallback: field stored as ISO string
  const strSnap = await baseQuery.where(field, '>=', sinceIso).count().get();
  return strSnap.data().count;
}

// ─────────────────────────────────────────
// NORTH STAR: Weekly Transacting Pairs
// ─────────────────────────────────────────

/**
 * Count unique buyer-seller pairs who started a conversation this week.
 * This is the primary health metric for the marketplace.
 */
export async function getWeeklyTransactingPairs(campusId = null) {
  try {
    let q = adminDb.collection('events')
      .where('event_type', '==', 'CONVERSATION_STARTED')
      .where('timestamp', '>=', startOfWeek());

    if (campusId) q = q.where('campus_id', '==', campusId);

    const snapshot = await q.get();
    const pairs = new Set();

    snapshot.forEach(doc => {
      const d = doc.data();
      const buyerId = d.user_id;
      const sellerId = d.metadata?.seller_id;
      if (buyerId && sellerId) {
        pairs.add(`${buyerId}_${sellerId}`);
      }
    });

    return pairs.size;
  } catch (error) {
    console.error('Error fetching WTP:', error);
    return 0;
  }
}

/**
 * Get WTP for the last N weeks for trend chart.
 * Returns array of { week: 'Week 1', pairs: 24 }
 */
export async function getWTPTrend(weeks = 8, campusId = null) {
  try {
    const results = [];

    for (let i = weeks - 1; i >= 0; i--) {
      let q = adminDb.collection('events')
        .where('event_type', '==', 'CONVERSATION_STARTED')
        .where('timestamp', '>=', startOfWeek(i + 1))
        .where('timestamp', '<', startOfWeek(i));

      if (campusId) q = q.where('campus_id', '==', campusId);

      const snapshot = await q.get();
      const pairs = new Set();

      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.user_id && d.metadata?.seller_id) {
          pairs.add(`${d.user_id}_${d.metadata.seller_id}`);
        }
      });

      const label = i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i + 1}w ago`;
      results.push({ week: label, pairs: pairs.size });
    }

    return results;
  } catch (error) {
    console.error('Error fetching WTP trend:', error);
    return [];
  }
}

// ─────────────────────────────────────────
// ACTIVATION FUNNEL
// ─────────────────────────────────────────

/**
 * The core funnel: Registered → KYC Verified → Listed → Messaged → Subscribed
 * Returns counts at each stage for the last 30 days cohort.
 */
export async function getActivationFunnel(campusId = null) {
  try {
    const sinceDate = daysAgoDate(30);
    const since = Timestamp.fromDate(sinceDate);

    // Stage 1: Registered users — try Timestamp then ISO string fallback
    let usersBase = adminDb.collection('users');
    if (campusId) usersBase = usersBase.where('selectedUniversity', '==', campusId);
    const registered = await countWithDateFallback(usersBase, 'createdAt', sinceDate);

    // Stage 2: KYC verified — try Timestamp then ISO string fallback
    let kycBase = adminDb.collection('kycRequests').where('status', '==', 'verified');
    if (campusId) kycBase = kycBase.where('schoolId', '==', campusId);
    const kycVerified = await countWithDateFallback(kycBase, 'submittedAt', sinceDate);

    // Stage 3: Posted at least one listing (products + services)
    // Unique sellers who listed (approximate from event log)
    let listedQuery = adminDb.collection('events')
      .where('event_type', '==', 'LISTING_CREATED')
      .where('timestamp', '>=', since);
    if (campusId) listedQuery = listedQuery.where('campus_id', '==', campusId);
    const listedSnap = await listedQuery.get();
    const listedUserIds = new Set(listedSnap.docs.map(d => d.data().user_id));
    const firstListing = listedUserIds.size;

    // Stage 4: Received first buyer message
    let convQuery = adminDb.collection('events')
      .where('event_type', '==', 'CONVERSATION_STARTED')
      .where('timestamp', '>=', since);
    if (campusId) convQuery = convQuery.where('campus_id', '==', campusId);
    const convSnap = await convQuery.get();
    const sellersMessaged = new Set(convSnap.docs.map(d => d.data().metadata?.seller_id).filter(Boolean));
    const receivedMessage = sellersMessaged.size;

    // Stage 5: Subscribed — try Timestamp then ISO string fallback
    let subBase = adminDb.collection('subscriptions').where('status', '==', 'active');
    if (campusId) subBase = subBase.where('campus_id', '==', campusId);
    const subscribed = await countWithDateFallback(subBase, 'createdAt', sinceDate);

    return [
      { stage: 'Registered', count: registered, color: '#6366f1' },
      { stage: 'KYC Verified', count: kycVerified, color: '#8b5cf6' },
      { stage: 'First Listing', count: firstListing, color: '#a855f7' },
      { stage: 'Received Message', count: receivedMessage, color: '#ec4899' },
      { stage: 'Subscribed', count: subscribed, color: '#f59e0b' },
    ];
  } catch (error) {
    console.error('Error fetching activation funnel:', error);
    return [];
  }
}

// ─────────────────────────────────────────
// SELLER RETENTION
// ─────────────────────────────────────────

/**
 * Of sellers who posted in Week 1 of a cohort, how many are still posting in Week 4?
 * Returns a percentage.
 */
export async function getSellerRetentionRate(campusId = null) {
  try {
    // Week 1 sellers: posted listing 28-21 days ago
    let w1Query = adminDb.collection('events')
      .where('event_type', '==', 'LISTING_CREATED')
      .where('timestamp', '>=', daysAgo(28))
      .where('timestamp', '<', daysAgo(21));
    if (campusId) w1Query = w1Query.where('campus_id', '==', campusId);
    const w1Snap = await w1Query.get();
    const week1Sellers = new Set(w1Snap.docs.map(d => d.data().user_id));

    if (week1Sellers.size === 0) return 0;

    // Week 4 active: same sellers who also posted in last 7 days
    let w4Query = adminDb.collection('events')
      .where('event_type', '==', 'LISTING_CREATED')
      .where('timestamp', '>=', daysAgo(7));
    if (campusId) w4Query = w4Query.where('campus_id', '==', campusId);
    const w4Snap = await w4Query.get();
    const week4Sellers = new Set(w4Snap.docs.map(d => d.data().user_id));

    const retained = [...week1Sellers].filter(id => week4Sellers.has(id)).length;
    return Math.round((retained / week1Sellers.size) * 100);
  } catch (error) {
    console.error('Error fetching seller retention:', error);
    return 0;
  }
}

// ─────────────────────────────────────────
// LISTING PERFORMANCE
// ─────────────────────────────────────────

/**
 * Listing-to-message rate: % of listings that received at least one buyer message.
 * Approximate from event data.
 */
export async function getListingToMessageRate(campusId = null, days = 30) {
  try {
    const since = daysAgo(days);

    // Total listings created in period
    let listingsQuery = adminDb.collection('events')
      .where('event_type', '==', 'LISTING_CREATED')
      .where('timestamp', '>=', since);
    if (campusId) listingsQuery = listingsQuery.where('campus_id', '==', campusId);
    const listingsSnap = await listingsQuery.count().get();
    const totalListings = listingsSnap.data().count;

    if (totalListings === 0) return 0;

    // Conversations started (each points to a listing_id)
    let convQuery = adminDb.collection('events')
      .where('event_type', '==', 'CONVERSATION_STARTED')
      .where('timestamp', '>=', since);
    if (campusId) convQuery = convQuery.where('campus_id', '==', campusId);
    const convSnap = await convQuery.get();
    const listingsWithMessages = new Set(
      convSnap.docs.map(d => d.data().metadata?.listing_id).filter(Boolean)
    );

    return Math.round((listingsWithMessages.size / totalListings) * 100);
  } catch (error) {
    console.error('Error fetching listing-to-message rate:', error);
    return 0;
  }
}

// ─────────────────────────────────────────
// DEMAND GAP: Zero-Result Searches
// ─────────────────────────────────────────

/**
 * Top search queries that returned zero results.
 * These are your seller outreach opportunities.
 */
export async function getZeroResultSearches(campusId = null, days = 7, topN = 20) {
  try {
    const since = daysAgo(days);

    let q = adminDb.collection('events')
      .where('event_type', '==', 'SEARCH_PERFORMED')
      .where('timestamp', '>=', since);
    if (campusId) q = q.where('campus_id', '==', campusId);

    const snap = await q.get();

    // Aggregate zero-result searches client-side (Firestore can't do this server-side)
    const queryMap = {};
    snap.forEach(doc => {
      const d = doc.data();
      if (d.metadata?.has_results === false && d.metadata?.query) {
        const query = d.metadata.query;
        queryMap[query] = (queryMap[query] || 0) + 1;
      }
    });

    return Object.entries(queryMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN)
      .map(([query, count]) => ({ query, count }));
  } catch (error) {
    console.error('Error fetching zero-result searches:', error);
    return [];
  }
}

// ─────────────────────────────────────────
// USER SEGMENTS
// ─────────────────────────────────────────

/**
 * Classify all users into segments for the admin user table.
 * activated_active | activated_dormant | never_activated | subscribed | churned
 */
export async function getUserSegments(campusId = null) {
  try {
    let usersQuery = adminDb.collection('users');
    if (campusId) usersQuery = usersQuery.where('selectedUniversity', '==', campusId);
    const usersSnap = await usersQuery.limit(500).get();

    // Get users who have listed — read products + services directly (events collection
    // is new and won't have historical data until the frontend instruments it)
    const [productsSnap, servicesSnap] = await Promise.all([
      adminDb.collection('products').select('userId').get(),
      adminDb.collection('services').select('userId').get(),
    ]);
    const hasListed = new Set([
      ...productsSnap.docs.map(d => d.data().userId),
      ...servicesSnap.docs.map(d => d.data().userId),
    ].filter(Boolean));

    // Get users active in last 14 days — check products/services created recently
    // (events collection will take over once the frontend instruments it)
    const recentDate = daysAgoDate(14);
    const recentTs = Timestamp.fromDate(recentDate);
    const recentIso = recentDate.toISOString();

    const getRecentListers = async (collectionName) => {
      const tsSnap = await adminDb.collection(collectionName)
        .where('createdAt', '>=', recentTs).select('userId').get();
      if (tsSnap.size > 0) return tsSnap.docs.map(d => d.data().userId);
      const strSnap = await adminDb.collection(collectionName)
        .where('createdAt', '>=', recentIso).select('userId').get();
      return strSnap.docs.map(d => d.data().userId);
    };

    const [recentProductIds, recentServiceIds] = await Promise.all([
      getRecentListers('products'),
      getRecentListers('services'),
    ]);
    const recentlyActive = new Set([...recentProductIds, ...recentServiceIds].filter(Boolean));

    // Subscription docs coexist in 3 formats:
    //  1. New nested: { product: { planId, isActive, expiryDate (Timestamp) }, service, bundle }
    //     top-level planId/isActive are stale legacy fields — ignore them
    //  2. Old flat Premium: { planId: "Premium", isActive: true, expiryDate: Timestamp }
    //  3. Old Freemium: { planId: "Freemium", isActive: false } — no paid plan, skip
    const now = new Date();

    // Build set of in-scope user IDs so campus filter applies to subscription counts too
    const inScopeUsers = new Set();
    usersSnap.forEach(doc => inScopeUsers.add(doc.id));

    const toDate = (val) => val?.toDate?.() ?? (val ? new Date(val) : null);
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

    const subSnap = await adminDb.collection('subscriptions').get();
    const activeSubscribers = new Set();
    const churned = new Set();
    subSnap.forEach(doc => {
      const data = doc.data();
      const uid = data.userId || doc.id;
      if (campusId && !inScopeUsers.has(uid)) return;

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
        activeSubscribers.add(uid);
      } else if (hadPaidNested || hadPaidFlat) {
        churned.add(uid);
      }
    });

    const segments = {
      activated_active: 0,
      activated_dormant: 0,
      never_activated: 0,
      subscribed: 0,
      churned: 0,
    };

    const users = [];
    usersSnap.forEach(doc => {
      const u = doc.data();
      const uid = doc.id;
      let segment;

      if (churned.has(uid)) {
        segment = 'churned';
      } else if (activeSubscribers.has(uid)) {
        segment = 'subscribed';
      } else if (!hasListed.has(uid)) {
        segment = 'never_activated';
      } else if (recentlyActive.has(uid)) {
        segment = 'activated_active';
      } else {
        segment = 'activated_dormant';
      }

      segments[segment]++;
      users.push({
        id: uid,
        name: u.fullName || u.email || 'Unknown',
        email: u.email,
        campus: u.selectedUniversity,
        joinedAt: u.createdAt?.toDate?.() || null,
        segment,
      });
    });

    return { segments, users };
  } catch (error) {
    console.error('Error fetching user segments:', error);
    return { segments: {}, users: [] };
  }
}

// ─────────────────────────────────────────
// COMBINED: All analytics for dashboard in one call
// ─────────────────────────────────────────

export async function getAnalyticsDashboardData(campusId = null) {
  const [
    wtp,
    wtpTrend,
    funnel,
    retentionRate,
    listingToMessageRate,
    zeroResultSearches,
  ] = await Promise.all([
    getWeeklyTransactingPairs(campusId),
    getWTPTrend(8, campusId),
    getActivationFunnel(campusId),
    getSellerRetentionRate(campusId),
    getListingToMessageRate(campusId),
    getZeroResultSearches(campusId),
  ]);

  return {
    wtp,
    wtpTrend,
    funnel,
    retentionRate,
    listingToMessageRate,
    zeroResultSearches,
  };
}
