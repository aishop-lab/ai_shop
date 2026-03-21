/**
 * Google Ads API Client for Marketing Agent
 *
 * Wraps the Google Ads API v19 for search campaign management.
 * Uses OAuth tokens stored encrypted in the connected_accounts table.
 */

import { encrypt, decrypt } from '@/lib/encryption'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleAdsCampaign {
  id: string
  name: string
  status: 'ENABLED' | 'PAUSED' | 'REMOVED'
  type: 'SEARCH' | 'SHOPPING' | 'DISPLAY'
  dailyBudget: number
  startDate?: string
  endDate?: string
  insights?: GoogleCampaignInsights
}

export interface GoogleCampaignInsights {
  impressions: number
  clicks: number
  cost: number // in micros (1/1,000,000 of currency unit)
  ctr: number
  averageCpc: number
  conversions: number
  conversionValue: number
  roas: number
}

export interface GoogleKeyword {
  id: string
  text: string
  matchType: 'BROAD' | 'PHRASE' | 'EXACT'
  status: 'ENABLED' | 'PAUSED' | 'REMOVED'
  qualityScore?: number
  cpc?: number
}

interface GoogleAdsCredentials {
  accessToken: string
  customerId: string
  refreshToken: string
}

interface GoogleAdsApiError {
  error: {
    code: number
    message: string
    status: string
    details?: unknown[]
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = 'https://googleads.googleapis.com/v19'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 500
const MICROS_PER_UNIT = 1_000_000

const log = logger.child({ traceId: `google-ads:${Date.now()}` })

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getDeveloperToken(): string {
  const token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!token) {
    throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN environment variable is not set')
  }
  return token
}

function getManagerId(): string | undefined {
  return process.env.GOOGLE_ADS_MANAGER_ID
}

/**
 * Build standard headers for Google Ads API requests.
 */
function buildHeaders(accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': getDeveloperToken(),
    'Content-Type': 'application/json',
  }
  const managerId = getManagerId()
  if (managerId) {
    headers['login-customer-id'] = managerId
  }
  return headers
}

/**
 * Fetch with exponential-backoff retry for transient errors.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Retry on 429 (rate limited) or 5xx server errors
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
        log.warn('Google Ads API retryable error, backing off', {
          status: response.status,
          attempt,
          backoffMs: backoff,
        })
        await new Promise((resolve) => setTimeout(resolve, backoff))
        continue
      }

      return response
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < retries) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
        log.warn('Google Ads API network error, retrying', {
          attempt,
          backoffMs: backoff,
          error: lastError.message,
        })
        await new Promise((resolve) => setTimeout(resolve, backoff))
      }
    }
  }

  throw lastError ?? new Error('Google Ads API request failed after retries')
}

/**
 * Parse a Google Ads API response and throw on error.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json()

  if (!response.ok) {
    const apiError = body as GoogleAdsApiError
    const message = apiError?.error?.message ?? 'Unknown Google Ads API error'
    const code = apiError?.error?.code ?? response.status
    log.error('Google Ads API error', new Error(message), {
      code,
      status: apiError?.error?.status,
      details: apiError?.error?.details,
    })
    throw new Error(`Google Ads API error (${code}): ${message}`)
  }

  return body as T
}

/**
 * Execute a GAQL query against the Google Ads API search endpoint.
 */
async function executeGaqlQuery<T>(
  customerId: string,
  accessToken: string,
  query: string
): Promise<T[]> {
  const url = `${API_BASE}/customers/${customerId}/googleAds:search`
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: buildHeaders(accessToken),
    body: JSON.stringify({ query }),
  })

  const data = await parseResponse<{ results?: T[] }>(response)
  return data.results ?? []
}

/**
 * Mutate resources via the Google Ads API.
 */
async function mutate(
  customerId: string,
  accessToken: string,
  path: string,
  operations: unknown[]
): Promise<{ results: Array<{ resourceName: string }> }> {
  const url = `${API_BASE}/customers/${customerId}/${path}:mutate`
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: buildHeaders(accessToken),
    body: JSON.stringify({ operations }),
  })
  return parseResponse(response)
}

// ---------------------------------------------------------------------------
// Credential management
// ---------------------------------------------------------------------------

/**
 * Get Google Ads credentials for a store from the connected_accounts table.
 */
async function getGoogleAdsCredentials(
  storeId: string
): Promise<GoogleAdsCredentials | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('connected_accounts')
    .select(
      'token_encrypted, refresh_token_encrypted, provider_account_id'
    )
    .eq('store_id', storeId)
    .eq('provider', 'google_ads')
    .eq('status', 'active')
    .single()

  if (error || !data) {
    log.warn('No Google Ads credentials found for store', { storeId })
    return null
  }

  try {
    const accessToken = decrypt(data.token_encrypted)
    const refreshToken = decrypt(data.refresh_token_encrypted)
    return {
      accessToken,
      refreshToken,
      customerId: data.provider_account_id,
    }
  } catch (err) {
    log.error(
      'Failed to decrypt Google Ads credentials',
      err instanceof Error ? err : new Error(String(err)),
      { storeId }
    )
    return null
  }
}

/**
 * Refresh an expired OAuth access token using the refresh token,
 * and persist the new encrypted token back to the database.
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET must be set'
    )
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json()

  if (!response.ok || !data.access_token) {
    throw new Error(
      `Failed to refresh Google Ads token: ${data.error_description ?? data.error ?? 'unknown error'}`
    )
  }

  return data.access_token as string
}

/**
 * Get valid credentials, refreshing the access token if needed.
 * Updates the stored token on refresh.
 */
async function getValidCredentials(
  storeId: string
): Promise<GoogleAdsCredentials> {
  const creds = await getGoogleAdsCredentials(storeId)
  if (!creds) {
    throw new Error(`No Google Ads account connected for store ${storeId}`)
  }

  // Check if token is still valid by making a lightweight call
  const testUrl = `${API_BASE}/customers/${creds.customerId}`
  const testRes = await fetch(testUrl, {
    method: 'GET',
    headers: buildHeaders(creds.accessToken),
  })

  if (testRes.status === 401) {
    log.info('Google Ads access token expired, refreshing', { storeId })
    const newToken = await refreshAccessToken(creds.refreshToken)

    // Persist the refreshed token
    const supabase = getSupabaseAdmin()
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()

    await supabase
      .from('connected_accounts')
      .update({
        token_encrypted: encrypt(newToken),
        token_expires_at: expiresAt,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('store_id', storeId)
      .eq('provider', 'google_ads')

    return { ...creds, accessToken: newToken }
  }

  // Mark last_used_at
  const supabase = getSupabaseAdmin()
  await supabase
    .from('connected_accounts')
    .update({ last_used_at: new Date().toISOString() })
    .eq('store_id', storeId)
    .eq('provider', 'google_ads')

  return creds
}

// ---------------------------------------------------------------------------
// Helper: format date for GAQL (YYYY-MM-DD)
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function defaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { startDate: formatDate(start), endDate: formatDate(end) }
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * List campaigns for a store. Optionally filter by status.
 */
export async function listCampaigns(
  storeId: string,
  status?: string
): Promise<GoogleAdsCampaign[]> {
  const creds = await getValidCredentials(storeId)

  let query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign_budget.amount_micros,
      campaign.start_date,
      campaign.end_date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.ctr,
      metrics.average_cpc,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE campaign.status != 'REMOVED'
  `

  if (status) {
    query += ` AND campaign.status = '${status}'`
  }

  query += ' ORDER BY campaign.id DESC LIMIT 100'

  interface CampaignRow {
    campaign: {
      id: string
      name: string
      status: 'ENABLED' | 'PAUSED' | 'REMOVED'
      advertisingChannelType: string
      startDate?: string
      endDate?: string
    }
    campaignBudget: { amountMicros: string }
    metrics: {
      impressions: string
      clicks: string
      costMicros: string
      ctr: number
      averageCpc: number
      conversions: number
      conversionsValue: number
    }
  }

  const rows = await executeGaqlQuery<CampaignRow>(
    creds.customerId,
    creds.accessToken,
    query
  )

  return rows.map((row) => {
    const cost = Number(row.metrics.costMicros)
    const conversionValue = Number(row.metrics.conversionsValue)
    const roas = cost > 0 ? conversionValue / (cost / MICROS_PER_UNIT) : 0

    const channelMap: Record<string, GoogleAdsCampaign['type']> = {
      SEARCH: 'SEARCH',
      SHOPPING: 'SHOPPING',
      DISPLAY: 'DISPLAY',
    }

    return {
      id: row.campaign.id,
      name: row.campaign.name,
      status: row.campaign.status,
      type: channelMap[row.campaign.advertisingChannelType] ?? 'SEARCH',
      dailyBudget: Number(row.campaignBudget.amountMicros) / MICROS_PER_UNIT,
      startDate: row.campaign.startDate,
      endDate: row.campaign.endDate,
      insights: {
        impressions: Number(row.metrics.impressions),
        clicks: Number(row.metrics.clicks),
        cost,
        ctr: row.metrics.ctr,
        averageCpc: row.metrics.averageCpc,
        conversions: row.metrics.conversions,
        conversionValue,
        roas,
      },
    }
  })
}

/**
 * Create a complete search campaign with ad group, keywords, and responsive
 * search ad in a single orchestrated flow.
 *
 * Steps: budget -> campaign -> ad group -> keywords -> responsive search ad.
 */
export async function createSearchCampaign(
  storeId: string,
  params: {
    name: string
    dailyBudget: number
    startDate?: string
    endDate?: string
    keywords: Array<{ text: string; matchType: 'BROAD' | 'PHRASE' | 'EXACT' }>
    headlines: string[] // max 15, each max 30 chars
    descriptions: string[] // max 4, each max 90 chars
    finalUrl: string
    targetLocations?: string[]
  }
): Promise<{ campaignId: string; adGroupId: string; adId: string }> {
  const creds = await getValidCredentials(storeId)
  const { customerId, accessToken } = creds

  // Validate inputs
  if (params.headlines.length < 3 || params.headlines.length > 15) {
    throw new Error('Headlines must be between 3 and 15 items')
  }
  if (params.descriptions.length < 2 || params.descriptions.length > 4) {
    throw new Error('Descriptions must be between 2 and 4 items')
  }
  for (const h of params.headlines) {
    if (h.length > 30) {
      throw new Error(`Headline exceeds 30 characters: "${h}"`)
    }
  }
  for (const d of params.descriptions) {
    if (d.length > 90) {
      throw new Error(`Description exceeds 90 characters: "${d}"`)
    }
  }

  const budgetMicros = Math.round(params.dailyBudget * MICROS_PER_UNIT)

  // 1. Create campaign budget
  log.info('Creating Google Ads campaign budget', { storeId, budgetMicros })

  const budgetRes = await mutate(customerId, accessToken, 'campaignBudgets', [
    {
      create: {
        name: `${params.name} Budget - ${Date.now()}`,
        amountMicros: budgetMicros.toString(),
        deliveryMethod: 'STANDARD',
      },
    },
  ])
  const budgetResourceName = budgetRes.results[0].resourceName

  // 2. Create campaign
  log.info('Creating Google Ads campaign', { storeId, name: params.name })

  const campaignCreate: Record<string, unknown> = {
    name: params.name,
    advertisingChannelType: 'SEARCH',
    status: 'PAUSED', // start paused so merchant can review
    campaignBudget: budgetResourceName,
    networkSettings: {
      targetGoogleSearch: true,
      targetSearchNetwork: true,
      targetContentNetwork: false,
    },
    manualCpc: {
      enhancedCpcEnabled: true,
    },
  }

  if (params.startDate) {
    campaignCreate.startDate = params.startDate.replace(/-/g, '')
  }
  if (params.endDate) {
    campaignCreate.endDate = params.endDate.replace(/-/g, '')
  }

  const campaignRes = await mutate(customerId, accessToken, 'campaigns', [
    { create: campaignCreate },
  ])
  const campaignResourceName = campaignRes.results[0].resourceName
  const campaignId = campaignResourceName.split('/').pop()!

  // 3. Set geo targets if provided
  if (params.targetLocations && params.targetLocations.length > 0) {
    const geoOps = params.targetLocations.map((locCode) => ({
      create: {
        campaign: campaignResourceName,
        location: {
          geoTargetConstant: `geoTargetConstants/${locCode}`,
        },
      },
    }))

    await mutate(customerId, accessToken, 'campaignCriteria', geoOps)
  }

  // 4. Create ad group
  log.info('Creating Google Ads ad group', { storeId, campaignId })

  const adGroupRes = await mutate(customerId, accessToken, 'adGroups', [
    {
      create: {
        name: `${params.name} - Ad Group`,
        campaign: campaignResourceName,
        status: 'ENABLED',
        type: 'SEARCH_STANDARD',
        cpcBidMicros: Math.round(1 * MICROS_PER_UNIT).toString(), // default $1 bid
      },
    },
  ])
  const adGroupResourceName = adGroupRes.results[0].resourceName
  const adGroupId = adGroupResourceName.split('/').pop()!

  // 5. Add keywords
  if (params.keywords.length > 0) {
    log.info('Adding keywords to ad group', {
      storeId,
      adGroupId,
      count: params.keywords.length,
    })

    const keywordOps = params.keywords.map((kw) => ({
      create: {
        adGroup: adGroupResourceName,
        status: 'ENABLED',
        keyword: {
          text: kw.text,
          matchType: kw.matchType,
        },
      },
    }))

    await mutate(customerId, accessToken, 'adGroupCriteria', keywordOps)
  }

  // 6. Create responsive search ad
  log.info('Creating responsive search ad', { storeId, adGroupId })

  const adRes = await mutate(customerId, accessToken, 'adGroupAds', [
    {
      create: {
        adGroup: adGroupResourceName,
        status: 'ENABLED',
        ad: {
          responsiveSearchAd: {
            headlines: params.headlines.map((text) => ({
              text,
            })),
            descriptions: params.descriptions.map((text) => ({
              text,
            })),
          },
          finalUrls: [params.finalUrl],
        },
      },
    },
  ])
  const adId = adRes.results[0].resourceName.split('/').pop()!

  log.info('Google Ads campaign created successfully', {
    storeId,
    campaignId,
    adGroupId,
    adId,
  })

  return { campaignId, adGroupId, adId }
}

/**
 * Update campaign status (enable or pause).
 */
export async function updateCampaignStatus(
  storeId: string,
  campaignId: string,
  status: 'ENABLED' | 'PAUSED'
): Promise<boolean> {
  const creds = await getValidCredentials(storeId)
  const resourceName = `customers/${creds.customerId}/campaigns/${campaignId}`

  const url = `${API_BASE}/${resourceName}`
  const response = await fetchWithRetry(url, {
    method: 'PATCH',
    headers: buildHeaders(creds.accessToken),
    body: JSON.stringify({
      updateMask: 'status',
      status,
    }),
  })

  // If PATCH on the resource directly doesn't work, fall back to mutate
  if (!response.ok) {
    try {
      await mutate(creds.customerId, creds.accessToken, 'campaigns', [
        {
          update: {
            resourceName,
            status,
          },
          updateMask: 'status',
        },
      ])
      return true
    } catch (err) {
      log.error(
        'Failed to update campaign status',
        err instanceof Error ? err : new Error(String(err)),
        { storeId, campaignId, status }
      )
      return false
    }
  }

  log.info('Campaign status updated', { storeId, campaignId, status })
  return true
}

/**
 * Get performance insights for a campaign over a date range.
 * Defaults to the last 30 days if no range is specified.
 */
export async function getCampaignInsights(
  storeId: string,
  campaignId: string,
  dateRange?: { startDate: string; endDate: string }
): Promise<GoogleCampaignInsights> {
  const creds = await getValidCredentials(storeId)
  const range = dateRange ?? defaultDateRange()

  const query = `
    SELECT
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.ctr,
      metrics.average_cpc,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE campaign.id = ${campaignId}
      AND segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'
  `

  interface InsightRow {
    metrics: {
      impressions: string
      clicks: string
      costMicros: string
      ctr: number
      averageCpc: number
      conversions: number
      conversionsValue: number
    }
  }

  const rows = await executeGaqlQuery<InsightRow>(
    creds.customerId,
    creds.accessToken,
    query
  )

  // Aggregate across date segments
  let impressions = 0
  let clicks = 0
  let costMicros = 0
  let conversions = 0
  let conversionValue = 0

  for (const row of rows) {
    impressions += Number(row.metrics.impressions)
    clicks += Number(row.metrics.clicks)
    costMicros += Number(row.metrics.costMicros)
    conversions += Number(row.metrics.conversions)
    conversionValue += Number(row.metrics.conversionsValue)
  }

  const ctr = impressions > 0 ? clicks / impressions : 0
  const averageCpc = clicks > 0 ? costMicros / clicks : 0
  const roas =
    costMicros > 0 ? conversionValue / (costMicros / MICROS_PER_UNIT) : 0

  return {
    impressions,
    clicks,
    cost: costMicros,
    ctr,
    averageCpc,
    conversions,
    conversionValue,
    roas,
  }
}

/**
 * Get keyword suggestions for a product using the Keyword Plan Ideas service.
 */
export async function getKeywordSuggestions(
  storeId: string,
  params: {
    productTitle: string
    productCategory?: string
    targetLocation?: string
  }
): Promise<
  Array<{
    keyword: string
    avgMonthlySearches: number
    competition: 'LOW' | 'MEDIUM' | 'HIGH'
    suggestedBid: number
  }>
> {
  const creds = await getValidCredentials(storeId)

  // Build seed keywords from product title and category
  const seedKeywords: string[] = [params.productTitle]
  if (params.productCategory) {
    seedKeywords.push(params.productCategory)
  }

  const requestBody: Record<string, unknown> = {
    customerId: creds.customerId,
    keywordSeed: {
      keywords: seedKeywords,
    },
    language: 'languageConstants/1000', // English
    keywordPlanNetwork: 'GOOGLE_SEARCH',
  }

  if (params.targetLocation) {
    requestBody.geoTargetConstants = [
      `geoTargetConstants/${params.targetLocation}`,
    ]
  }

  const url = `${API_BASE}/customers/${creds.customerId}:generateKeywordIdeas`
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: buildHeaders(creds.accessToken),
    body: JSON.stringify(requestBody),
  })

  interface KeywordIdeaResult {
    results?: Array<{
      text: string
      keywordIdeaMetrics?: {
        avgMonthlySearches: string
        competition: string
        lowTopOfPageBidMicros?: string
        highTopOfPageBidMicros?: string
      }
    }>
  }

  const data = await parseResponse<KeywordIdeaResult>(response)
  const results = data.results ?? []

  const competitionMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    UNSPECIFIED: 'LOW',
    UNKNOWN: 'LOW',
  }

  return results.map((item) => {
    const metrics = item.keywordIdeaMetrics
    const highBidMicros = Number(metrics?.highTopOfPageBidMicros ?? 0)

    return {
      keyword: item.text,
      avgMonthlySearches: Number(metrics?.avgMonthlySearches ?? 0),
      competition: competitionMap[metrics?.competition ?? 'LOW'] ?? 'LOW',
      suggestedBid: highBidMicros / MICROS_PER_UNIT,
    }
  })
}

/**
 * Adjust the daily budget of an existing campaign.
 */
export async function adjustBudget(
  storeId: string,
  campaignId: string,
  newDailyBudget: number
): Promise<boolean> {
  const creds = await getValidCredentials(storeId)

  // First, find the campaign's budget resource name
  const query = `
    SELECT campaign.campaign_budget
    FROM campaign
    WHERE campaign.id = ${campaignId}
    LIMIT 1
  `

  interface BudgetRow {
    campaign: { campaignBudget: string }
  }

  const rows = await executeGaqlQuery<BudgetRow>(
    creds.customerId,
    creds.accessToken,
    query
  )

  if (rows.length === 0) {
    log.error('Campaign not found for budget adjustment', undefined, {
      storeId,
      campaignId,
    })
    return false
  }

  const budgetResourceName = rows[0].campaign.campaignBudget
  const newAmountMicros = Math.round(newDailyBudget * MICROS_PER_UNIT)

  try {
    await mutate(creds.customerId, creds.accessToken, 'campaignBudgets', [
      {
        update: {
          resourceName: budgetResourceName,
          amountMicros: newAmountMicros.toString(),
        },
        updateMask: 'amount_micros',
      },
    ])

    log.info('Campaign budget adjusted', {
      storeId,
      campaignId,
      newDailyBudget,
      newAmountMicros,
    })
    return true
  } catch (err) {
    log.error(
      'Failed to adjust campaign budget',
      err instanceof Error ? err : new Error(String(err)),
      { storeId, campaignId, newDailyBudget }
    )
    return false
  }
}
