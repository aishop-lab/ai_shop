/**
 * Meta Marketing API Client
 *
 * Wraps the Meta (Facebook) Marketing API for campaign management,
 * organic posts, and audience targeting. Used by the Marketing Agent
 * to autonomously manage a merchant's ad campaigns.
 */

import { decrypt } from '@/lib/encryption'
import { logger } from '@/lib/logger'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetaAdCampaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  objective: string
  dailyBudget: number
  lifetimeBudget?: number
  startTime: string
  endTime?: string
  insights?: MetaCampaignInsights
}

export interface MetaCampaignInsights {
  impressions: number
  clicks: number
  spend: number
  ctr: number
  cpc: number
  conversions: number
  roas: number
}

export interface MetaAudience {
  id: string
  name: string
  size: number
  targeting: Record<string, unknown>
}

interface MetaApiError {
  error: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

interface MetaCredentials {
  token: string
  accountId: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const META_API_BASE = 'https://graph.facebook.com/v22.0'
const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1000

const log = logger.child({ traceId: `meta-ads:${Date.now()}` })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check whether a Meta API response is an error payload.
 */
function isMetaApiError(body: unknown): body is MetaApiError {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as MetaApiError).error?.message === 'string'
  )
}

/**
 * Execute a fetch request against the Meta Graph API with automatic
 * exponential-backoff retry on rate-limit (code 32) or transient errors.
 */
async function metaFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
  attempt = 1
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const body = await res.json()

  if (isMetaApiError(body)) {
    const { error } = body

    // Retry on rate-limit (code 32) or transient server errors (code 2)
    const retryable = error.code === 32 || error.code === 2
    if (retryable && attempt < MAX_RETRIES) {
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)
      log.warn('Meta API rate-limited, retrying', {
        code: error.code,
        attempt,
        delayMs: delay,
      })
      await sleep(delay)
      return metaFetch<T>(url, options, attempt + 1)
    }

    const err = new Error(`Meta API error: ${error.message}`)
    ;(err as Error & { code?: string }).code = String(error.code)
    throw err
  }

  return body as T
}

// ---------------------------------------------------------------------------
// Token retrieval
// ---------------------------------------------------------------------------

/**
 * Retrieve the Meta API access token and ad account ID for a store.
 * Reads from the `connected_accounts` table and decrypts the stored token.
 */
async function getMetaToken(storeId: string): Promise<MetaCredentials | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('token_encrypted, provider_account_id')
    .eq('store_id', storeId)
    .eq('provider', 'meta')
    .eq('status', 'active')
    .single()

  if (error || !data) {
    log.warn('No active Meta connection found for store', { storeId })
    return null
  }

  try {
    const token = decrypt(data.token_encrypted)
    return { token, accountId: data.provider_account_id }
  } catch (err) {
    log.error(
      'Failed to decrypt Meta token',
      err instanceof Error ? err : new Error(String(err)),
      { storeId }
    )
    return null
  }
}

/**
 * Require a valid Meta token or throw a user-friendly error.
 */
async function requireMetaToken(storeId: string): Promise<MetaCredentials> {
  const creds = await getMetaToken(storeId)
  if (!creds) {
    throw new Error(
      'Meta account not connected. Please connect your Meta Business account in Settings > Connections before using Meta ads features.'
    )
  }
  return creds
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

/**
 * List campaigns for the connected Meta ad account.
 */
export async function listCampaigns(
  storeId: string,
  status?: string
): Promise<MetaAdCampaign[]> {
  const { token, accountId } = await requireMetaToken(storeId)

  const fields = 'id,name,status,objective,daily_budget,lifetime_budget,start_time,end_time'
  let url = `${META_API_BASE}/act_${accountId}/campaigns?fields=${fields}&access_token=${token}`

  if (status) {
    const filterParam = encodeURIComponent(JSON.stringify([{ field: 'effective_status', operator: 'IN', value: [status] }]))
    url += `&filtering=${filterParam}`
  }

  const response = await metaFetch<{
    data: Array<{
      id: string
      name: string
      status: string
      objective: string
      daily_budget: string
      lifetime_budget?: string
      start_time: string
      end_time?: string
    }>
  }>(url)

  return (response.data || []).map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status as MetaAdCampaign['status'],
    objective: c.objective,
    dailyBudget: parseInt(c.daily_budget || '0', 10),
    lifetimeBudget: c.lifetime_budget ? parseInt(c.lifetime_budget, 10) : undefined,
    startTime: c.start_time,
    endTime: c.end_time,
  }))
}

/**
 * Create a new ad campaign with an associated ad set.
 *
 * Meta requires campaigns and ad sets to be created separately.
 * This function creates both in sequence and returns their IDs.
 */
export async function createCampaign(
  storeId: string,
  params: {
    name: string
    objective:
      | 'OUTCOME_AWARENESS'
      | 'OUTCOME_TRAFFIC'
      | 'OUTCOME_ENGAGEMENT'
      | 'OUTCOME_SALES'
    dailyBudget: number // in cents
    startTime: string
    endTime?: string
    targeting?: {
      ageMin?: number
      ageMax?: number
      genders?: number[]
      geoLocations?: { countries: string[] }
      interests?: Array<{ id: string; name: string }>
    }
  }
): Promise<{ campaignId: string; adSetId: string }> {
  const { token, accountId } = await requireMetaToken(storeId)

  // Step 1: Create the campaign
  const campaignBody = new URLSearchParams({
    name: params.name,
    objective: params.objective,
    status: 'PAUSED', // Always start paused so merchant can review
    special_ad_categories: '[]',
    access_token: token,
  })

  const campaignRes = await metaFetch<{ id: string }>(
    `${META_API_BASE}/act_${accountId}/campaigns`,
    { method: 'POST', body: campaignBody, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  const campaignId = campaignRes.id

  log.info('Created Meta campaign', { storeId, campaignId, name: params.name })

  // Step 2: Build targeting spec
  const targetingSpec: Record<string, unknown> = {}
  if (params.targeting) {
    const t = params.targeting
    if (t.ageMin) targetingSpec.age_min = t.ageMin
    if (t.ageMax) targetingSpec.age_max = t.ageMax
    if (t.genders) targetingSpec.genders = t.genders
    if (t.geoLocations) {
      targetingSpec.geo_locations = { countries: t.geoLocations.countries }
    }
    if (t.interests && t.interests.length > 0) {
      targetingSpec.flexible_spec = [{ interests: t.interests }]
    }
  }

  // Step 3: Create the ad set
  const adSetBody = new URLSearchParams({
    name: `${params.name} - Ad Set`,
    campaign_id: campaignId,
    daily_budget: String(params.dailyBudget),
    billing_event: 'IMPRESSIONS',
    optimization_goal: objectiveToOptimizationGoal(params.objective),
    start_time: params.startTime,
    status: 'PAUSED',
    targeting: JSON.stringify(
      Object.keys(targetingSpec).length > 0
        ? targetingSpec
        : { geo_locations: { countries: ['US'] }, age_min: 18 }
    ),
    access_token: token,
  })

  if (params.endTime) {
    adSetBody.set('end_time', params.endTime)
  }

  const adSetRes = await metaFetch<{ id: string }>(
    `${META_API_BASE}/act_${accountId}/adsets`,
    { method: 'POST', body: adSetBody, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  log.info('Created Meta ad set', {
    storeId,
    campaignId,
    adSetId: adSetRes.id,
  })

  return { campaignId, adSetId: adSetRes.id }
}

/**
 * Map a campaign objective to an ad set optimization goal.
 */
function objectiveToOptimizationGoal(
  objective: string
): string {
  switch (objective) {
    case 'OUTCOME_AWARENESS':
      return 'REACH'
    case 'OUTCOME_TRAFFIC':
      return 'LINK_CLICKS'
    case 'OUTCOME_ENGAGEMENT':
      return 'POST_ENGAGEMENT'
    case 'OUTCOME_SALES':
      return 'OFFSITE_CONVERSIONS'
    default:
      return 'LINK_CLICKS'
  }
}

/**
 * Pause or resume a campaign.
 */
export async function updateCampaignStatus(
  storeId: string,
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED'
): Promise<boolean> {
  const { token } = await requireMetaToken(storeId)

  const body = new URLSearchParams({ status, access_token: token })

  const res = await metaFetch<{ success?: boolean }>(
    `${META_API_BASE}/${campaignId}`,
    { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  log.info('Updated Meta campaign status', { storeId, campaignId, status })

  return res.success === true
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

/**
 * Get performance metrics for a campaign.
 */
export async function getCampaignInsights(
  storeId: string,
  campaignId: string,
  dateRange?: { since: string; until: string }
): Promise<MetaCampaignInsights> {
  const { token } = await requireMetaToken(storeId)

  const fields =
    'impressions,clicks,spend,ctr,cpc,actions,action_values'

  let url = `${META_API_BASE}/${campaignId}/insights?fields=${fields}&access_token=${token}`

  if (dateRange) {
    url += `&time_range=${encodeURIComponent(
      JSON.stringify({ since: dateRange.since, until: dateRange.until })
    )}`
  }

  const response = await metaFetch<{
    data: Array<{
      impressions?: string
      clicks?: string
      spend?: string
      ctr?: string
      cpc?: string
      actions?: Array<{ action_type: string; value: string }>
      action_values?: Array<{ action_type: string; value: string }>
    }>
  }>(url)

  const raw = response.data?.[0]

  if (!raw) {
    return {
      impressions: 0,
      clicks: 0,
      spend: 0,
      ctr: 0,
      cpc: 0,
      conversions: 0,
      roas: 0,
    }
  }

  const conversions = parseActionValue(raw.actions, 'offsite_conversion.fb_pixel_purchase')
  const conversionValue = parseActionValue(raw.action_values, 'offsite_conversion.fb_pixel_purchase')
  const spend = parseFloat(raw.spend || '0')

  return {
    impressions: parseInt(raw.impressions || '0', 10),
    clicks: parseInt(raw.clicks || '0', 10),
    spend,
    ctr: parseFloat(raw.ctr || '0'),
    cpc: parseFloat(raw.cpc || '0'),
    conversions,
    roas: spend > 0 ? conversionValue / spend : 0,
  }
}

/**
 * Extract a numeric value from Meta's actions/action_values arrays.
 */
function parseActionValue(
  actions: Array<{ action_type: string; value: string }> | undefined,
  actionType: string
): number {
  if (!actions) return 0
  const entry = actions.find((a) => a.action_type === actionType)
  return entry ? parseFloat(entry.value) : 0
}

// ---------------------------------------------------------------------------
// Organic Posts
// ---------------------------------------------------------------------------

/**
 * Create an organic post on the merchant's connected Facebook Page.
 *
 * Requires a Page access token. The connected account should have
 * `pages_manage_posts` permission granted.
 */
export async function createPost(
  storeId: string,
  params: {
    message: string
    imageUrl?: string
    link?: string
    scheduledTime?: string // ISO date for scheduled posts
  }
): Promise<{ postId: string; permalink?: string }> {
  const { token } = await requireMetaToken(storeId)

  // Retrieve the merchant's Page ID from connected account metadata
  const supabase = getSupabaseAdmin()
  const { data: account } = await supabase
    .from('connected_accounts')
    .select('metadata')
    .eq('store_id', storeId)
    .eq('provider', 'meta')
    .eq('status', 'active')
    .single()

  const pageId = (account?.metadata as Record<string, unknown> | null)?.page_id as string | undefined
  if (!pageId) {
    throw new Error(
      'No Facebook Page linked. Please select a Page in Settings > Connections to publish posts.'
    )
  }

  // Get page access token
  const pageTokenRes = await metaFetch<{
    data: Array<{ id: string; access_token: string }>
  }>(`${META_API_BASE}/me/accounts?access_token=${token}`)

  const page = pageTokenRes.data?.find((p) => p.id === pageId)
  if (!page) {
    throw new Error(
      'Cannot access the linked Facebook Page. Please reconnect your Meta account.'
    )
  }

  const pageToken = page.access_token

  // Build post parameters
  const postBody = new URLSearchParams({
    message: params.message,
    access_token: pageToken,
  })

  if (params.link) {
    postBody.set('link', params.link)
  }

  if (params.scheduledTime) {
    const unixTimestamp = Math.floor(new Date(params.scheduledTime).getTime() / 1000)
    postBody.set('scheduled_publish_time', String(unixTimestamp))
    postBody.set('published', 'false')
  }

  // If there's an image, use the photos endpoint instead
  let endpoint = `${META_API_BASE}/${pageId}/feed`
  if (params.imageUrl && !params.link) {
    endpoint = `${META_API_BASE}/${pageId}/photos`
    postBody.set('url', params.imageUrl)
  }

  const res = await metaFetch<{ id: string; post_id?: string; permalink_url?: string }>(
    endpoint,
    { method: 'POST', body: postBody, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  const postId = res.post_id || res.id

  log.info('Created Meta post', { storeId, postId })

  return { postId, permalink: res.permalink_url }
}

// ---------------------------------------------------------------------------
// Audience Suggestions
// ---------------------------------------------------------------------------

/**
 * Get audience targeting suggestions based on the store's ad account data.
 *
 * Queries Meta's targeting search API for interest-based audiences relevant
 * to the merchant's product categories.
 */
export async function getAudienceSuggestions(
  storeId: string
): Promise<MetaAudience[]> {
  const { token, accountId } = await requireMetaToken(storeId)

  // Fetch store categories to seed audience suggestions
  const supabase = getSupabaseAdmin()
  const { data: products } = await supabase
    .from('products')
    .select('category')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .not('category', 'is', null)
    .limit(10)

  const categories = [
    ...new Set((products || []).map((p) => p.category as string).filter(Boolean)),
  ]

  if (categories.length === 0) {
    return []
  }

  const audiences: MetaAudience[] = []

  // Query targeting search for each product category
  for (const category of categories.slice(0, 5)) {
    try {
      const res = await metaFetch<{
        data: Array<{
          id: string
          name: string
          audience_size_lower_bound?: number
          audience_size_upper_bound?: number
          type: string
          path: string[]
        }>
      }>(
        `${META_API_BASE}/search?type=adinterest&q=${encodeURIComponent(
          category
        )}&access_token=${token}`
      )

      for (const interest of (res.data || []).slice(0, 3)) {
        const size =
          interest.audience_size_upper_bound ||
          interest.audience_size_lower_bound ||
          0

        audiences.push({
          id: interest.id,
          name: interest.name,
          size,
          targeting: {
            flexible_spec: [{ interests: [{ id: interest.id, name: interest.name }] }],
            geo_locations: { countries: ['US', 'IN'] },
            age_min: 18,
            age_max: 65,
          },
        })
      }
    } catch (err) {
      log.warn('Failed to fetch audience suggestion for category', {
        category,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Deduplicate by ID
  const seen = new Set<string>()
  return audiences.filter((a) => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })
}
