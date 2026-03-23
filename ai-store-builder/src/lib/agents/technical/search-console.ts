// src/lib/agents/technical/search-console.ts
// Google Search Console integration for the Technical Agent

import { logger } from '@/lib/logger'

interface SearchPerformanceRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface SearchPerformanceResult {
  rows: SearchPerformanceRow[]
  totals: {
    clicks: number
    impressions: number
    ctr: number
    position: number
  }
  dateRange: { startDate: string; endDate: string }
}

interface IndexingStatusResult {
  coverageState: string
  lastCrawlTime: string | null
  pageFetchState: string | null
  verdict: string
  robotsTxtState: string | null
  indexingState: string | null
}

/**
 * Retrieve the OAuth access token for Google Search Console
 * from the connected_accounts table.
 */
async function getSearchConsoleToken(storeId: string): Promise<string> {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
  const { decrypt } = await import('@/lib/encryption')
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('access_token_encrypted, status')
    .eq('store_id', storeId)
    .eq('provider', 'google_search_console')
    .single()

  if (error || !data) {
    throw new Error(
      `No Google Search Console account connected for store ${storeId}. ` +
        'Please connect your Search Console account in Settings > Integrations.'
    )
  }

  if (data.status !== 'active') {
    throw new Error(
      `Google Search Console connection is ${data.status}. Please re-authenticate.`
    )
  }

  if (!data.access_token_encrypted) {
    throw new Error('Google Search Console access token is missing. Please reconnect.')
  }

  return decrypt(data.access_token_encrypted)
}

/**
 * Get the site URL for a store from the stores table.
 * Search Console uses the full URL as the site identifier.
 */
async function getStoreSiteUrl(storeId: string): Promise<string> {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
  const supabase = getSupabaseAdmin()

  const { data: store, error } = await supabase
    .from('stores')
    .select('slug')
    .eq('id', storeId)
    .single()

  if (error || !store) {
    throw new Error(`Store ${storeId} not found`)
  }

  // Search Console expects the full URL as site property
  return `sc-domain:${store.slug}.storeforge.site`
}

/**
 * Query search performance data from Google Search Console API.
 *
 * @param storeId - The store ID
 * @param options - Query options
 * @returns Search performance data with clicks, impressions, CTR, and position
 */
export async function querySearchPerformance(
  storeId: string,
  options: {
    startDate?: string
    endDate?: string
    dimensions?: ('query' | 'page' | 'country' | 'device' | 'date')[]
    rowLimit?: number
  } = {}
): Promise<SearchPerformanceResult> {
  const accessToken = await getSearchConsoleToken(storeId)
  const siteUrl = await getStoreSiteUrl(storeId)

  const now = new Date()
  const defaultEnd = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago (data delay)
  const defaultStart = new Date(defaultEnd.getTime() - 28 * 24 * 60 * 60 * 1000) // 28 days before end

  const startDate = options.startDate || defaultStart.toISOString().split('T')[0]
  const endDate = options.endDate || defaultEnd.toISOString().split('T')[0]
  const dimensions = options.dimensions || ['query']
  const rowLimit = options.rowLimit || 25

  const requestBody = {
    startDate,
    endDate,
    dimensions,
    rowLimit,
    dataState: 'final',
  }

  const encodedSiteUrl = encodeURIComponent(siteUrl)
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`

  logger.info(`[search-console] Querying search performance for store ${storeId}: ${startDate} to ${endDate}`)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logger.error(`[search-console] API error (${response.status}): ${errorBody}`)
    throw new Error(
      `Search Console API error (${response.status}): ${errorBody}`
    )
  }

  const data = await response.json()
  const rows: SearchPerformanceRow[] = (data.rows || []).map(
    (row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      keys: row.keys,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: Math.round(row.ctr * 10000) / 100, // Convert to percentage with 2 decimals
      position: Math.round(row.position * 100) / 100,
    })
  )

  // Compute totals
  const totals = rows.reduce(
    (acc, row) => ({
      clicks: acc.clicks + row.clicks,
      impressions: acc.impressions + row.impressions,
      ctr: 0, // Will compute below
      position: 0, // Will compute below
    }),
    { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  )

  totals.ctr =
    totals.impressions > 0
      ? Math.round((totals.clicks / totals.impressions) * 10000) / 100
      : 0
  totals.position =
    rows.length > 0
      ? Math.round(
          (rows.reduce((sum, r) => sum + r.position, 0) / rows.length) * 100
        ) / 100
      : 0

  return {
    rows,
    totals,
    dateRange: { startDate, endDate },
  }
}

/**
 * Get top search queries driving traffic to the store.
 */
export async function getTopQueries(
  storeId: string,
  limit: number = 20
): Promise<SearchPerformanceResult> {
  return querySearchPerformance(storeId, {
    dimensions: ['query'],
    rowLimit: limit,
  })
}

/**
 * Get top pages by clicks.
 */
export async function getTopPages(
  storeId: string,
  limit: number = 20
): Promise<SearchPerformanceResult> {
  return querySearchPerformance(storeId, {
    dimensions: ['page'],
    rowLimit: limit,
  })
}

/**
 * Check the indexing status of a specific URL using the URL Inspection API.
 */
export async function checkIndexingStatus(
  storeId: string,
  inspectUrl?: string
): Promise<IndexingStatusResult> {
  const accessToken = await getSearchConsoleToken(storeId)
  const siteUrl = await getStoreSiteUrl(storeId)

  // If no URL provided, check the store homepage
  if (!inspectUrl) {
    const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
    const supabase = getSupabaseAdmin()
    const { data: store } = await supabase
      .from('stores')
      .select('slug')
      .eq('id', storeId)
      .single()

    inspectUrl = `https://${store?.slug}.storeforge.site`
  }

  const url = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'

  logger.info(`[search-console] Checking indexing status for ${inspectUrl} (store: ${storeId})`)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inspectionUrl: inspectUrl,
      siteUrl,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logger.error(`[search-console] URL Inspection API error (${response.status}): ${errorBody}`)
    throw new Error(
      `URL Inspection API error (${response.status}): ${errorBody}`
    )
  }

  const data = await response.json()
  const result = data.inspectionResult?.indexStatusResult || {}

  return {
    coverageState: result.coverageState || 'UNKNOWN',
    lastCrawlTime: result.lastCrawlTime || null,
    pageFetchState: result.pageFetchState || null,
    verdict: result.verdict || 'VERDICT_UNSPECIFIED',
    robotsTxtState: result.robotsTxtState || null,
    indexingState: result.indexingState || null,
  }
}
