// src/utils/analytics.js
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function startOfWeek(weeksAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - weeksAgo * 7); // Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgoDate(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

const toDate = (val) => val?.toDate?.() ?? (val ? new Date(val) : null);

/**
 * When an account was really created, from Firebase Auth. users.createdAt is
 * written by the web app and was overwritten on every Google sign-in, so it
 * can't be trusted for "when did this person sign up".
 */
export async function getAuthCreationTimes() {
  const times = new Map();
  let pageToken;
  do {
    const result = await adminAuth.listUsers(1000, pageToken);
    result.users.forEach(u => times.set(u.uid, new Date(u.metadata.creationTime)));
    pageToken = result.pageToken;
  } while (pageToken);
  return times;
}

/**
 * The user IDs on one campus, or null for "all campuses". Most of the data
 * (KYC requests, subscriptions, listings, conversations) has no reliable
 * campus field, so the campus filter is applied through the people involved:
 * users.selectedUniversity holds the school NAME.
 */
async function getCampusUserIds(campusName) {
  if (!campusName) return null;
  const snap = await adminDb.collection('users')
    .where('selectedUniversity', '==', campusName).select().get();
  return new Set(snap.docs.map(d => d.id));
}

const inScope = (campusUserIds, uid) => !campusUserIds || (!!uid && campusUserIds.has(uid));

/**
 * Seller and buyer of a conversation. Newer conversations store them
 * explicitly; older ones only have product.sellerId and participants.
 */
function conversationRoles(c) {
  const sellerId = c.sellerId || c.product?.sellerId || null;
  const buyerId = c.buyerId || (c.participants || []).find(p => p && p !== sellerId) || null;
  return { sellerId, buyerId };
}

// Subscription docs coexist in 3 formats:
//  1. New nested: { product: { planId, isActive, expiryDate (Timestamp) }, service, bundle }
//     top-level planId/isActive are stale legacy fields — ignore them
//  2. Old flat Premium: { planId: "Premium", isActive: true, expiryDate: Timestamp }
//  3. Old Freemium: { planId: "Freemium", isActive: false } — no paid plan, skip
// There is no `status` field, so a status == 'active' query always matches nothing.
function classifySubscriptions(subSnap) {
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

// ─────────────────────────────────────────
// NORTH STAR: Weekly Transacting Pairs
// ─────────────────────────────────────────

/**
 * Unique buyer-seller pairs who started a conversation, this week and for each
 * of the last `weeks` weeks. Read from the conversation documents themselves:
 * the CONVERSATION_STARTED event is only logged from product pages, so it
 * missed most conversations (4 events vs 80 real conversations).
 */
function getWeeklyTransactingPairs(conversations, campusUserIds, weeks = 8) {
  const trend = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const from = startOfWeek(i);
    const to = i === 0 ? null : startOfWeek(i - 1);
    const pairs = new Set();
    conversations.forEach(c => {
      if (!c.createdAt || c.createdAt < from || (to && c.createdAt >= to)) return;
      if (!c.buyerId || !c.sellerId || !inScope(campusUserIds, c.sellerId)) return;
      pairs.add(`${c.buyerId}_${c.sellerId}`);
    });
    const label = i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i + 1}w ago`;
    trend.push({ week: label, pairs: pairs.size });
  }
  return { wtp: trend[trend.length - 1]?.pairs ?? 0, wtpTrend: trend };
}

// ─────────────────────────────────────────
// ACTIVATION FUNNEL
// ─────────────────────────────────────────

/**
 * Follows one cohort — people who signed up in the last 30 days (by their
 * Firebase Auth creation time) — and counts how many of THEM reached each
 * step. Each stage is a subset of "Registered", so the percentages are real
 * conversion rates.
 */
function getActivationFunnel({ authTimes, userIds, campusUserIds, verifiedKycUserIds, listers, conversations, activeSubscribers }) {
  const since = daysAgoDate(30);
  const cohort = userIds.filter(uid => {
    const created = authTimes.get(uid);
    return created && created >= since && inScope(campusUserIds, uid);
  });

  const sellersMessaged = new Set(conversations.map(c => c.sellerId).filter(Boolean));
  const countIn = (set) => cohort.filter(uid => set.has(uid)).length;

  return [
    { stage: 'Registered', count: cohort.length, color: '#6366f1' },
    { stage: 'KYC Verified', count: countIn(verifiedKycUserIds), color: '#8b5cf6' },
    { stage: 'First Listing', count: countIn(listers), color: '#a855f7' },
    { stage: 'Received Message', count: countIn(sellersMessaged), color: '#ec4899' },
    { stage: 'Subscribed', count: countIn(activeSubscribers), color: '#f59e0b' },
  ];
}

// ─────────────────────────────────────────
// SELLER RETENTION
// ─────────────────────────────────────────

/**
 * Of sellers who posted a listing 28–21 days ago, what % also posted in the
 * last 7 days? null when nobody posted in that first week (nothing to measure).
 */
function getSellerRetentionRate(listings) {
  const w1Start = daysAgoDate(28), w1End = daysAgoDate(21), w4Start = daysAgoDate(7);
  const week1 = new Set(listings.filter(l => l.createdAt >= w1Start && l.createdAt < w1End).map(l => l.userId));
  if (week1.size === 0) return null;
  const week4 = new Set(listings.filter(l => l.createdAt >= w4Start).map(l => l.userId));
  const retained = [...week1].filter(uid => week4.has(uid)).length;
  return Math.round((retained / week1.size) * 100);
}

// ─────────────────────────────────────────
// LISTING PERFORMANCE
// ─────────────────────────────────────────

/**
 * % of listings created in the last `days` days that have at least one
 * conversation about them. null when no listings were created.
 */
function getListingToMessageRate(listings, conversations, days = 30) {
  const since = daysAgoDate(days);
  const recent = listings.filter(l => l.createdAt >= since);
  if (recent.length === 0) return null;
  const messagedListingIds = new Set(conversations.map(c => c.listingId).filter(Boolean));
  const messaged = recent.filter(l => messagedListingIds.has(l.id)).length;
  return Math.round((messaged / recent.length) * 100);
}

// ─────────────────────────────────────────
// DEMAND GAP: Zero-Result Searches
// ─────────────────────────────────────────

/**
 * Top search queries that returned zero results in the last `days` days.
 *
 * The search bar logs whatever is in the box after a 500ms pause, so a slow
 * typist produces "garr" before "garri". A query is dropped when the same
 * session later searched a longer query that starts with it.
 *
 * Also returns how many searches were tracked at all, so an empty list can
 * say "no searches" rather than implying there's no unmet demand.
 */
export async function getZeroResultSearches(campusName = null, days = 30, topN = 20) {
  try {
    const since = Timestamp.fromDate(daysAgoDate(days));
    const snap = await adminDb.collection('events')
      .where('event_type', '==', 'SEARCH_PERFORMED')
      .where('timestamp', '>=', since)
      .get();

    // events.campus_id holds the school NAME, not the schools doc ID
    const searches = snap.docs
      .map(doc => doc.data())
      .filter(d => d.metadata?.query && (!campusName || d.campus_id === campusName))
      .map(d => ({
        query: d.metadata.query,
        hasResults: d.metadata.has_results !== false,
        session: d.metadata.session_id || d.session_id || null,
      }));

    const queriesBySession = {};
    searches.forEach(s => {
      if (s.session) (queriesBySession[s.session] ||= []).push(s.query);
    });
    const isPartial = (s) => (queriesBySession[s.session] || [])
      .some(q => q.length > s.query.length && q.startsWith(s.query));

    const queryMap = {};
    searches.forEach(s => {
      if (s.hasResults || isPartial(s)) return;
      queryMap[s.query] = (queryMap[s.query] || 0) + 1;
    });

    return {
      zeroResultSearches: Object.entries(queryMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, topN)
        .map(([query, count]) => ({ query, count })),
      searchesTracked: searches.length,
    };
  } catch (error) {
    console.error('Error fetching zero-result searches:', error);
    return { zeroResultSearches: [], searchesTracked: null };
  }
}

// ─────────────────────────────────────────
// USER SEGMENTS
// ─────────────────────────────────────────

/**
 * Classify all users into segments for the admin user table.
 * activated_active | activated_dormant | never_activated | subscribed | churned
 */
export async function getUserSegments(campusId = null, campusName = null) {
  try {
    // users.selectedUniversity stores school name, not school doc ID
    let usersQuery = adminDb.collection('users');
    if (campusName) usersQuery = usersQuery.where('selectedUniversity', '==', campusName);
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

    // Build set of in-scope user IDs so campus filter applies to subscription counts too
    const inScopeUsers = new Set();
    usersSnap.forEach(doc => inScopeUsers.add(doc.id));

    const subSnap = await adminDb.collection('subscriptions').get();
    const { active: allActive, churned: allChurned } = classifySubscriptions(subSnap);
    const keep = (uid) => !campusId || inScopeUsers.has(uid);
    const activeSubscribers = new Set([...allActive].filter(keep));
    const churned = new Set([...allChurned].filter(keep));

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

/**
 * Loads the underlying data once and derives every metric from it. Each
 * collection involved is small (hundreds of docs), so filtering in memory is
 * cheaper and more reliable than a composite index per metric.
 */
export async function getAnalyticsDashboardData(campusId = null, campusName = null) {
  const [
    authTimes,
    campusUserIds,
    usersSnap,
    kycSnap,
    productsSnap,
    servicesSnap,
    conversationsSnap,
    subSnap,
    searchData,
  ] = await Promise.all([
    getAuthCreationTimes(),
    getCampusUserIds(campusName),
    adminDb.collection('users').select().get(),
    adminDb.collection('kycRequests').where('status', '==', 'verified').select('userId').get(),
    adminDb.collection('products').select('userId', 'createdAt').get(),
    adminDb.collection('services').select('userId', 'createdAt').get(),
    adminDb.collection('conversation')
      .select('createdAt', 'sellerId', 'buyerId', 'participants', 'product').get(),
    adminDb.collection('subscriptions').get(),
    getZeroResultSearches(campusName),
  ]);

  const userIds = usersSnap.docs.map(d => d.id);
  const verifiedKycUserIds = new Set(kycSnap.docs.map(d => d.data().userId).filter(Boolean));

  // Listings from the products/services collections themselves — the web app
  // never logs a LISTING_CREATED event, so event-based counts were always 0.
  const listings = [...productsSnap.docs, ...servicesSnap.docs]
    .map(d => ({ id: d.id, userId: d.data().userId, createdAt: toDate(d.data().createdAt) }))
    .filter(l => l.userId && l.createdAt && inScope(campusUserIds, l.userId));
  const listers = new Set(listings.map(l => l.userId));

  const conversations = conversationsSnap.docs
    .map(d => {
      const data = d.data();
      return { ...conversationRoles(data), listingId: data.product?.id || null, createdAt: toDate(data.createdAt) };
    })
    .filter(c => inScope(campusUserIds, c.sellerId));

  const { active: activeSubscribers } = classifySubscriptions(subSnap);

  return {
    ...getWeeklyTransactingPairs(conversations, campusUserIds),
    funnel: getActivationFunnel({
      authTimes, userIds, campusUserIds, verifiedKycUserIds, listers, conversations, activeSubscribers,
    }),
    retentionRate: getSellerRetentionRate(listings),
    listingToMessageRate: getListingToMessageRate(listings, conversations),
    zeroResultSearches: searchData.zeroResultSearches,
    searchesTracked: searchData.searchesTracked,
    // All campuses, like the other stat cards — not narrowed by the campus filter.
    activePaidSubscribers: activeSubscribers.size,
  };
}
