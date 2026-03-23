// src/lib/agents/analytics/ga4-client.ts
// Google Analytics 4 Data API client for the Analytics Agent.
// Reads OAuth credentials from the connected_accounts table and queries
// the GA4 Data API v1beta for traffic, engagement, and funnel data.

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/encryption'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GA4Config {
  propertyId: string
  accessToken: string
}

export interface GA4QueryRequest {
  dimensions: string[]
  metrics: string[]
  dateRanges: Array<{ startDate: string; endDate: string }>
  dimensionFilter?: GA4Filter
  orderBys?: Array<{ metric?: { metricName: string }; desc?: boolean }>
  limit?: number
}

interface GA4Filter {
  filter?: {
    fieldName: string
    stringFilter?: { matchType: string; value: string }
  }
  andGroup?: { expressions: GA4Filter[] }
  orGroup?: { expressions: GA4Filter[] }
}

export interface GA4Report {
  dimensions: string[]
  metrics: string[]
  rows: Array<{
    dimensionValues: string[]
    metricValues: number[]
  }>
}

export interface TrafficOverview {
  sessions: number
  users: number
  pageviews: number
  bounceRate: number
  newUsers: number
  byDay: Record<string, { sessions: number; users: number; pageviews: number }>
}

export interface TrafficSource {
  source: string
  medium: string
  sessions: number
  users: number
  bounceRate: number
  avgSessionDuration: number
  conversions: number
}

export interface TopPage {
  pagePath: string
  pageTitle: string
  pageviews: number
  uniquePageviews: number
  avgTimeOnPage: number
  bounceRate: number
  entrances: number
  exitRate: number
}

export interface UserBehaviorMetrics {
  avgSessionDuration: number
  pagesPerSession: number
  engagementRate: number
  avgEngagementTime: number
  sessionsPerUser: number
  byDay: Record<string, {
    avgSessionDuration: number
    pagesPerSession: number
    engagementRate: number
  }>
}

export interface FunnelStep {
  stepName: string
  pagePath: string
  users: number
  dropoffRate: number
}

export interface ConversionFunnel {
  steps: FunnelStep[]
  overallConversionRate: number
  totalEntries: number
  totalCompletions: number
}

const GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta'

const log = logger

// ---------------------------------------------------------------------------
// Credential retrieval
// ---------------------------------------------------------------------------

/**
 * Get GA4 configuration for a store from the connected_accounts table.
 * Returns null when no active GA4 connection exists.
 */
export async function getGA4Config(storeId: string): Promise<GA4Config | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('access_token_encrypted, provider_account_id, status')
    .eq('store_id', storeId)
    .eq('provider', 'google_analytics')
    .single()

  if (error || !data) {
    log.info(`No GA4 account connected for store ${storeId}`)
    return null
  }

  if (data.status !== 'active') {
    log.warn(`GA4 connection is not active for store ${storeId} (status: ${data.status})`)
    return null
  }

  if (!data.access_token_encrypted || !data.provider_account_id) {
    log.warn(`GA4 credentials incomplete for store ${storeId}`)
    return null
  }

  try {
    const accessToken = decrypt(data.access_token_encrypted)
    return {
      propertyId: data.provider_account_id,
      accessToken,
    }
  } catch (err) {
    log.error(
      'Failed to decrypt GA4 credentials',
      err instanceof Error ? err : new Error(String(err)),
      { storeId }
    )
    return null
  }
}

// ---------------------------------------------------------------------------
// Low-level query runner
// ---------------------------------------------------------------------------

/**
 * Execute a GA4 Data API runReport request.
 * Throws on network/API errors.
 */
export async function queryGA4(
  config: GA4Config,
  request: GA4QueryRequest
): Promise<GA4Report> {
  const url = `${GA4_API_BASE}/properties/${config.propertyId}:runReport`

  const body = {
    dimensions: request.dimensions.map((d) => ({ name: d })),
    metrics: request.metrics.map((m) => ({ name: m })),
    dateRanges: request.dateRanges,
    dimensionFilter: request.dimensionFilter,
    orderBys: request.orderBys?.map((o) => ({
      metric: o.metric,
      desc: o.desc ?? true,
    })),
    limit: request.limit,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(
      `GA4 API error (${response.status}): ${errorText}`
    )
  }

  const json = await response.json()

  // Parse the response into our normalized format
  const dimensionHeaders: string[] =
    (json.dimensionHeaders || []).map((h: { name: string }) => h.name)
  const metricHeaders: string[] =
    (json.metricHeaders || []).map((h: { name: string }) => h.name)

  const rows = (json.rows || []).map(
    (row: {
      dimensionValues?: Array<{ value: string }>
      metricValues?: Array<{ value: string }>
    }) => ({
      dimensionValues: (row.dimensionValues || []).map((d) => d.value),
      metricValues: (row.metricValues || []).map((m) => parseFloat(m.value) || 0),
    })
  )

  return { dimensions: dimensionHeaders, metrics: metricHeaders, rows }
}

// ---------------------------------------------------------------------------
// Period helper
// ---------------------------------------------------------------------------

function periodToDateRange(period: '7d' | '30d' | '90d'): {
  startDate: string
  endDate: string
} {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

// ---------------------------------------------------------------------------
// High-level queries
// ---------------------------------------------------------------------------

/**
 * Get traffic overview: sessions, users, pageviews, bounce rate with daily breakdown.
 */
export async function getTrafficOverview(
  storeId: string,
  period: '7d' | '30d' | '90d'
): Promise<TrafficOverview> {
  const config = await getGA4Config(storeId)
  if (!config) {
    throw new Error(
      'Google Analytics is not connected. Please connect your GA4 property in Settings > Integrations.'
    )
  }

  const dateRange = periodToDateRange(period)

  // Two queries: totals and daily breakdown
  const [totalsReport, dailyReport] = await Promise.all([
    queryGA4(config, {
      dimensions: [],
      metrics: [
        'sessions',
        'totalUsers',
        'screenPageViews',
        'bounceRate',
        'newUsers',
      ],
      dateRanges: [dateRange],
    }),
    queryGA4(config, {
      dimensions: ['date'],
      metrics: ['sessions', 'totalUsers', 'screenPageViews'],
      dateRanges: [dateRange],
      orderBys: [{ metric: { metricName: 'date' }, desc: false }],
    }),
  ])

  // Parse totals
  const totals = totalsReport.rows[0]
  const sessions = totals?.metricValues[0] ?? 0
  const users = totals?.metricValues[1] ?? 0
  const pageviews = totals?.metricValues[2] ?? 0
  const bounceRate = totals?.metricValues[3] ?? 0
  const newUsers = totals?.metricValues[4] ?? 0

  // Parse daily breakdown
  const byDay: TrafficOverview['byDay'] = {}
  for (const row of dailyReport.rows) {
    const dateStr = row.dimensionValues[0]
    // GA4 returns dates as YYYYMMDD — convert to YYYY-MM-DD
    const formatted = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
    byDay[formatted] = {
      sessions: row.metricValues[0],
      users: row.metricValues[1],
      pageviews: row.metricValues[2],
    }
  }

  return { sessions, users, pageviews, bounceRate, newUsers, byDay }
}

/**
 * Get traffic sources: source/medium breakdown with engagement metrics.
 */
export async function getTrafficSources(
  storeId: string,
  period: '7d' | '30d' | '90d'
): Promise<TrafficSource[]> {
  const config = await getGA4Config(storeId)
  if (!config) {
    throw new Error(
      'Google Analytics is not connected. Please connect your GA4 property in Settings > Integrations.'
    )
  }

  const dateRange = periodToDateRange(period)

  const report = await queryGA4(config, {
    dimensions: ['sessionSource', 'sessionMedium'],
    metrics: [
      'sessions',
      'totalUsers',
      'bounceRate',
      'averageSessionDuration',
      'conversions',
    ],
    dateRanges: [dateRange],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 25,
  })

  return report.rows.map((row) => ({
    source: row.dimensionValues[0] || '(direct)',
    medium: row.dimensionValues[1] || '(none)',
    sessions: row.metricValues[0],
    users: row.metricValues[1],
    bounceRate: row.metricValues[2],
    avgSessionDuration: row.metricValues[3],
    conversions: row.metricValues[4],
  }))
}

/**
 * Get top pages by pageviews with engagement metrics.
 */
export async function getTopPages(
  storeId: string,
  period: '7d' | '30d' | '90d'
): Promise<TopPage[]> {
  const config = await getGA4Config(storeId)
  if (!config) {
    throw new Error(
      'Google Analytics is not connected. Please connect your GA4 property in Settings > Integrations.'
    )
  }

  const dateRange = periodToDateRange(period)

  const report = await queryGA4(config, {
    dimensions: ['pagePath', 'pageTitle'],
    metrics: [
      'screenPageViews',
      'userEngagementDuration',
      'bounceRate',
      'entrances',
    ],
    dateRanges: [dateRange],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20,
  })

  return report.rows.map((row) => ({
    pagePath: row.dimensionValues[0],
    pageTitle: row.dimensionValues[1],
    pageviews: row.metricValues[0],
    uniquePageviews: Math.round(row.metricValues[0] * 0.85), // approximate
    avgTimeOnPage: row.metricValues[1] > 0 ? row.metricValues[1] / row.metricValues[0] : 0,
    bounceRate: row.metricValues[2],
    entrances: row.metricValues[3],
    exitRate: 0, // GA4 doesn't have exit rate as a standard metric
  }))
}

/**
 * Get user behavior metrics: session duration, pages per session, engagement rate.
 */
export async function getUserBehavior(
  storeId: string,
  period: '7d' | '30d' | '90d'
): Promise<UserBehaviorMetrics> {
  const config = await getGA4Config(storeId)
  if (!config) {
    throw new Error(
      'Google Analytics is not connected. Please connect your GA4 property in Settings > Integrations.'
    )
  }

  const dateRange = periodToDateRange(period)

  const [totalsReport, dailyReport] = await Promise.all([
    queryGA4(config, {
      dimensions: [],
      metrics: [
        'averageSessionDuration',
        'screenPageViewsPerSession',
        'engagementRate',
        'userEngagementDuration',
        'sessionsPerUser',
      ],
      dateRanges: [dateRange],
    }),
    queryGA4(config, {
      dimensions: ['date'],
      metrics: [
        'averageSessionDuration',
        'screenPageViewsPerSession',
        'engagementRate',
      ],
      dateRanges: [dateRange],
      orderBys: [{ metric: { metricName: 'date' }, desc: false }],
    }),
  ])

  const totals = totalsReport.rows[0]

  const byDay: UserBehaviorMetrics['byDay'] = {}
  for (const row of dailyReport.rows) {
    const dateStr = row.dimensionValues[0]
    const formatted = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
    byDay[formatted] = {
      avgSessionDuration: row.metricValues[0],
      pagesPerSession: row.metricValues[1],
      engagementRate: row.metricValues[2],
    }
  }

  return {
    avgSessionDuration: totals?.metricValues[0] ?? 0,
    pagesPerSession: totals?.metricValues[1] ?? 0,
    engagementRate: totals?.metricValues[2] ?? 0,
    avgEngagementTime: totals?.metricValues[3] ?? 0,
    sessionsPerUser: totals?.metricValues[4] ?? 0,
    byDay,
  }
}

/**
 * Get conversion funnel analysis by page path.
 * Analyses a standard e-commerce funnel: Homepage → Product Page → Cart → Checkout → Thank You.
 */
export async function getConversionFunnel(
  storeId: string,
  period: '7d' | '30d' | '90d'
): Promise<ConversionFunnel> {
  const config = await getGA4Config(storeId)
  if (!config) {
    throw new Error(
      'Google Analytics is not connected. Please connect your GA4 property in Settings > Integrations.'
    )
  }

  const dateRange = periodToDateRange(period)

  // Query page-level data to build the funnel
  const report = await queryGA4(config, {
    dimensions: ['pagePath'],
    metrics: ['totalUsers', 'screenPageViews'],
    dateRanges: [dateRange],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 500,
  })

  // Build a lookup map of page path → users
  const pageUsers: Record<string, number> = {}
  for (const row of report.rows) {
    const path = row.dimensionValues[0]
    pageUsers[path] = (pageUsers[path] || 0) + row.metricValues[0]
  }

  // Define funnel steps with pattern matching
  const funnelDefinitions = [
    { stepName: 'Homepage', patterns: ['/', '/index'] },
    { stepName: 'Product Page', patterns: ['/products/', '/p/'] },
    { stepName: 'Cart', patterns: ['/cart'] },
    { stepName: 'Checkout', patterns: ['/checkout'] },
    { stepName: 'Purchase Complete', patterns: ['/order-confirmation', '/thank-you', '/order/success'] },
  ]

  const steps: FunnelStep[] = []
  let previousUsers = 0

  for (const def of funnelDefinitions) {
    // Sum users across all matching page patterns
    let users = 0
    for (const [path, count] of Object.entries(pageUsers)) {
      if (def.patterns.some((p) => path === p || path.startsWith(p))) {
        users += count
      }
    }

    const dropoffRate =
      previousUsers > 0 ? ((previousUsers - users) / previousUsers) * 100 : 0

    steps.push({
      stepName: def.stepName,
      pagePath: def.patterns[0],
      users,
      dropoffRate: Math.round(dropoffRate * 10) / 10,
    })

    previousUsers = users > 0 ? users : previousUsers
  }

  const totalEntries = steps[0]?.users ?? 0
  const totalCompletions = steps[steps.length - 1]?.users ?? 0
  const overallConversionRate =
    totalEntries > 0
      ? Math.round(((totalCompletions / totalEntries) * 100) * 10) / 10
      : 0

  return { steps, overallConversionRate, totalEntries, totalCompletions }
}
