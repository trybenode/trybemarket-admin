import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { adminDb } from '@/lib/firebaseAdmin.js' 

const analyticsClient = new BetaAnalyticsDataClient({
  credentials: adminDb._settings.credential.cert,
})

export default async function handler(req, res) {
  try {
    const [response] = await analyticsClient.runReport({
      property: `properties/482540031`, 
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10, // optional: top 10 pages
    })

    const pageViews = response.rows?.map((row) => ({
      page: row.dimensionValues[0].value,
      views: Number(row.metricValues[0].value),
    })) || []

    res.status(200).json({ pageViews })
  } catch (error) {
    console.error('GA4 API error:', error)
    res.status(500).json({ error: 'Failed to fetch GA4 analytics' })
  }
}
