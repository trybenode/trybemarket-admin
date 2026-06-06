'use client'
import React, { useState, useEffect, useCallback } from 'react'
import PageHeader from '../../../components/PageHeader'
import { getDashboardStats, getRecentActivity } from '@/utils/dashboard'
import { getAuth } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebaseConfig'

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'alltime', label: 'All-time' },
]

export default function Page() {
  const [stats, setStats] = useState({
    users: { total: 0 },
    schools: { total: 0 },
    products: { total: 0 },
    services: { total: 0 },
    subscriptions: { total: 0, monthly: 0 },
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [analyticsPeriod, setAnalyticsPeriod] = useState('weekly');
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [analyticsPages, setAnalyticsPages] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [schools, setSchools] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchSchools();
    fetchAnalytics();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, activityData] = await Promise.all([
        getDashboardStats(),
        getRecentActivity(5)
      ]);
      setStats(statsData);
      setActivities(activityData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      setSchools(schoolsSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  const fetchAnalytics = async (campusId = null) => {
    try {
      setAnalyticsLoading(true);
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      
      const url = campusId 
        ? `/api/analytics-dashboard?campus_id=${campusId}`
        : '/api/analytics-dashboard';
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        console.error('Analytics API returned error:', res.status);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchWebAnalytics = useCallback(async (period) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const [summaryRes, pagesRes] = await Promise.all([
        fetch(`/api/analytics?period=${period}&type=summary`),
        fetch(`/api/analytics?period=${period}&type=pages`),
      ]);
      if (!summaryRes.ok || !pagesRes.ok) throw new Error('Failed to load analytics');
      const [summary, pages] = await Promise.all([summaryRes.json(), pagesRes.json()]);
      setAnalyticsSummary(summary);
      setAnalyticsPages(pages.pageViews ?? []);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setAnalyticsError('Could not load web analytics. Check GA4 credentials.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebAnalytics(analyticsPeriod);
  }, [analyticsPeriod, fetchWebAnalytics]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'product':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'service':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getActivityBgColor = (type) => {
    switch (type) {
      case 'user':
        return 'bg-indigo-100';
      case 'product':
        return 'bg-purple-100';
      case 'service':
        return 'bg-green-100';
      default:
        return 'bg-gray-100';
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <main className="container mx-auto">
      <div className="space-y-6">
      {/* Welcome Section */}
      <PageHeader HeaderText="Welcome to TrybeMarket Admin" SubHeaderText="Manage your schools, KYC verifications, and more from this dashboard." />

      {/* Campus Filter */}
      <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <label className="text-sm font-medium text-gray-700">Filter by Campus:</label>
        <select
          value={selectedCampus || ''}
          onChange={(e) => {
            const newCampus = e.target.value || null;
            setSelectedCampus(newCampus);
            fetchAnalytics(newCampus);
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Campuses</option>
          {schools.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Stat Card 1 - Total Users */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.users.total.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Users</p>
                </div>
              </div>
            </div>

            {/* Stat Card 2 - Total Schools */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.schools.total.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Schools</p>
                </div>
              </div>
            </div>

            {/* Stat Card 3 - Total Products */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.products.total.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Products</p>
                </div>
              </div>
            </div>

            {/* Stat Card 4 - Total Services */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.services.total.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Services</p>
                </div>
              </div>
            </div>

            {/* Stat Card 5 - Active Subscriptions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.subscriptions.monthly.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Active Monthly Subs</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Web Analytics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h2 className="text-lg font-semibold text-gray-800">Web Traffic</h2>
          <div className="flex gap-1">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setAnalyticsPeriod(key)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  analyticsPeriod === key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {analyticsLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : analyticsError ? (
          <p className="text-sm text-red-500 text-center py-6">{analyticsError}</p>
        ) : (
          <>
            {/* Summary stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide mb-1">Page Views</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {analyticsSummary?.pageViews?.toLocaleString() ?? '—'}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-xs text-purple-500 font-medium uppercase tracking-wide mb-1">Unique Visitors</p>
                <p className="text-2xl font-bold text-purple-700">
                  {analyticsSummary?.uniqueVisitors?.toLocaleString() ?? '—'}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-1">Sessions</p>
                <p className="text-2xl font-bold text-blue-700">
                  {analyticsSummary?.sessions?.toLocaleString() ?? '—'}
                </p>
              </div>
            </div>

            {/* Top pages table */}
            {analyticsPages.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Top Pages</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Page</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsPages.map((row, i) => (
                        <tr key={row.page} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-2 px-3 text-gray-700 truncate max-w-xs">{row.page}</td>
                          <td className="py-2 px-3 text-right font-medium text-gray-900">{row.views.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No page data available for this period.</p>
            )}
          </>
        )}
      </div>

      {/* Analytics Section */}
      {analyticsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : analytics ? (
        <>
          {/* North Star Metric - Weekly Transacting Pairs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Weekly Transacting Pairs</h2>
                <p className="text-sm text-gray-500">Unique buyer-seller conversations started this week</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-indigo-600">{analytics?.wtp ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-1">This week</p>
              </div>
            </div>
            {/* Simple trend bars */}
            <div className="flex items-end gap-2 h-20">
              {analytics?.wtpTrend?.map((w, i) => {
                const maxPairs = Math.max(...(analytics.wtpTrend?.map(x => x.pairs) || [1]), 1);
                const height = Math.max(8, (w.pairs / maxPairs) * 72);
                const isCurrentWeek = i === analytics.wtpTrend.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${height}px`,
                        backgroundColor: isCurrentWeek ? '#6366f1' : '#e0e7ff'
                      }}
                    />
                    <span className="text-xs text-gray-400">{w.pairs}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              {analytics?.wtpTrend?.map((w, i) => (
                <span key={i} className="text-xs text-gray-400 flex-1 text-center">{w.week}</span>
              ))}
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">Activation Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics?.funnel && analytics.funnel[0]?.count > 0 ? 
                  `${Math.round((analytics.funnel[1]?.count / analytics.funnel[0]?.count) * 100) || 0}%`
                  : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Registered → KYC verified (30d)</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">Listing → Message Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics?.listingToMessageRate !== undefined ? `${analytics.listingToMessageRate}%` : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Listings that received a buyer message (30d)</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">4-Week Seller Retention</p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics?.retentionRate !== undefined ? `${analytics.retentionRate}%` : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Week 1 sellers still active in Week 4</p>
            </div>
          </div>

          {/* Activation Funnel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Activation Funnel (Last 30 Days)</h2>
            <div className="space-y-3">
              {analytics?.funnel?.map((stage, i, arr) => {
                const pct = i === 0 ? 100 : Math.round((stage.count / arr[0].count) * 100);
                const dropoff = i > 0 ? Math.round(((arr[i-1].count - stage.count) / arr[i-1].count) * 100) : 0;
                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                      <div className="flex items-center gap-3">
                        {i > 0 && dropoff > 0 && (
                          <span className="text-xs text-red-500">▼ {dropoff}% drop</span>
                        )}
                        <span className="text-sm font-bold text-gray-900">{stage.count.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: stage.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Demand Gap - Zero-Result Searches */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Demand Gaps</h2>
                <p className="text-sm text-gray-500">Top searches with no results — seller outreach opportunities</p>
              </div>
            </div>
            <div className="space-y-2">
              {analytics?.zeroResultSearches?.length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center">No zero-result searches yet. Good sign!</p>
              )}
              {analytics?.zeroResultSearches?.slice(0, 10).map(({ query, count }) => (
                <div key={query} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-800 font-medium">&quot;{query}&quot;</span>
                  <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded-full">
                    {count} searches, 0 results
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* User Segments */}
          {(() => {
            const seg = analytics?.segments ?? {};
            const total = Object.values(seg).reduce((s, v) => s + (v || 0), 0) || 1;
            const pct = (n) => Math.round(((n || 0) / total) * 100);
            const activityRows = [
              { segKey: 'activated_active', label: 'Active Sellers', desc: 'Listed something in the last 14 days', bar: '#22c55e', badge: 'bg-green-100 text-green-700' },
              { segKey: 'activated_dormant', label: 'Dormant Sellers', desc: 'Have listings but inactive 14+ days', bar: '#eab308', badge: 'bg-yellow-100 text-yellow-700' },
              { segKey: 'never_activated', label: 'Never Listed', desc: 'Registered but never posted a product or service', bar: '#f87171', badge: 'bg-red-50 text-red-600' },
            ];
            const subRows = [
              { segKey: 'subscribed', label: 'Active Subscribers', desc: 'Currently on a paid plan', bar: '#6366f1', badge: 'bg-indigo-100 text-indigo-700' },
              { segKey: 'churned', label: 'Churned', desc: 'Had a paid plan that has since expired', bar: '#9ca3af', badge: 'bg-gray-100 text-gray-600' },
            ];
            const SegRow = ({ segKey, label, desc, bar, badge }) => {
              const count = seg[segKey] ?? 0;
              const p = pct(count);
              return (
                <div className="py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge}`}>{label}</span>
                    <span className="text-xl font-bold text-gray-900">{count.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: bar }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right shrink-0">{p}%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{desc}</p>
                </div>
              );
            };
            return (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">User Segments</h2>
                    <p className="text-sm text-gray-500 mt-0.5">How your {total.toLocaleString()} users are distributed</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Marketplace Activity */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Marketplace Activity</p>
                    {activityRows.map(row => <SegRow key={row.segKey} {...row} />)}
                  </div>
                  {/* Subscription Status */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Subscription Status</p>
                    {subRows.map(row => <SegRow key={row.segKey} {...row} />)}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">Note:</span> Churned and subscribed users are classified by subscription first, regardless of listing status.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      ) : null}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={`${activity.type}-${activity.id}-${index}`} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0">
                <div className={`w-10 h-10 ${getActivityBgColor(activity.type)} rounded-lg flex items-center justify-center shrink-0`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    User <span className="font-semibold">{activity.name}</span> {activity.action}
                  </p>
                  <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
        )}
      </div>
    </div>
    </main>
  )
}
