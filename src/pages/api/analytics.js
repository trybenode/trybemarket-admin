import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { requireAdminPages } from '@/lib/requireAdmin'

const analyticsClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

const PROPERTY_ID = 'properties/482540031'

// Both ends of a GA4 date range are inclusive, so "Nd ago → today" spans N+1
// days. Dates are in the GA4 property's reporting timezone, and "today" is
// partial (GA4 can lag a few hours).
const PERIOD_RANGES = {
  daily: { startDate: 'today', endDate: 'today' },
  weekly: { startDate: '6daysAgo', endDate: 'today' },
  monthly: { startDate: '29daysAgo', endDate: 'today' },
  // Earliest date the GA4 Data API accepts — i.e. everything the property has.
  alltime: { startDate: '2015-08-14', endDate: 'today' },
}

// The web app's GA tag also fires in local dev, so drop localhost and
// private-network hosts — otherwise developers' own visits get counted.
const EXCLUDE_DEV_HOSTS = {
  notExpression: {
    filter: {
      fieldName: 'hostName',
      stringFilter: {
        matchType: 'FULL_REGEXP',
        value: '(localhost|127\\.0\\.0\\.1|10\\.\\d+\\.\\d+\\.\\d+|192\\.168\\.\\d+\\.\\d+|172\\.(1[6-9]|2\\d|3[01])\\.\\d+\\.\\d+)(:\\d+)?',
      },
    },
  },
}

export default async function handler(req, res) {
  const admin = await requireAdminPages(req, res)
  if (!admin) return

  const period = PERIOD_RANGES[req.query.period] ? req.query.period : 'weekly'
  const type = req.query.type === 'pages' ? 'pages' : 'summary'
  const dateRange = PERIOD_RANGES[period]

  try {
    if (type === 'summary') {
      const [response] = await analyticsClient.runReport({
        property: PROPERTY_ID,
        dateRanges: [dateRange],
        dimensionFilter: EXCLUDE_DEV_HOSTS,
        metrics: [
          { name: 'screenPageViews' },
          { name: 'sessions' },
          // totalUsers = every distinct user who logged any event. activeUsers
          // only counts engaged users, which undercounts "unique visitors".
          { name: 'totalUsers' },
        ],
      })

      const row = response.rows?.[0]
      res.status(200).json({
        pageViews: Number(row?.metricValues[0]?.value ?? 0),
        sessions: Number(row?.metricValues[1]?.value ?? 0),
        uniqueVisitors: Number(row?.metricValues[2]?.value ?? 0),
      })
    } else {
      const [response] = await analyticsClient.runReport({
        property: PROPERTY_ID,
        dateRanges: [dateRange],
        dimensionFilter: EXCLUDE_DEV_HOSTS,
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      })

      const pageViews = response.rows?.map((row) => ({
        page: row.dimensionValues[0].value,
        views: Number(row.metricValues[0].value),
      })) ?? []

      res.status(200).json({ pageViews })
    }
  } catch (error) {
    console.error('GA4 API error:', error)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
}
