import { BetaAnalyticsDataClient } from '@google-analytics/data'

const analyticsClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

const PROPERTY_ID = 'properties/482540031'

const PERIOD_RANGES = {
  daily: { startDate: 'today', endDate: 'today' },
  weekly: { startDate: '7daysAgo', endDate: 'today' },
  monthly: { startDate: '30daysAgo', endDate: 'today' },
  alltime: { startDate: '365daysAgo', endDate: 'today' },
}

export default async function handler(req, res) {
  const period = PERIOD_RANGES[req.query.period] ? req.query.period : 'weekly'
  const type = req.query.type === 'pages' ? 'pages' : 'summary'
  const dateRange = PERIOD_RANGES[period]

  try {
    if (type === 'summary') {
      const [response] = await analyticsClient.runReport({
        property: PROPERTY_ID,
        dateRanges: [dateRange],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'activeUsers' },
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
