// src/lib/agents/marketing/meta-capi.ts
// Meta Conversions API (CAPI) — server-side event tracking for Facebook/Instagram
// Sends purchase, cart, and other conversion events directly from the server
// to improve attribution accuracy and work around browser tracking limitations.

import { createHash } from 'crypto'
import { decrypt } from '@/lib/encryption'
import { logger } from '@/lib/logger'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ============================================
// TYPES
// ============================================

export interface ConversionEvent {
  event_name:
    | 'Purchase'
    | 'AddToCart'
    | 'InitiateCheckout'
    | 'ViewContent'
    | 'Lead'
    | 'CompleteRegistration'
  event_time: number // Unix timestamp
  user_data: {
    em?: string[] // Hashed emails
    ph?: string[] // Hashed phones
    client_ip_address?: string
    client_user_agent?: string
    fbc?: string // Click ID (_fbc cookie)
    fbp?: string // Browser ID (_fbp cookie)
    fn?: string[] // Hashed first names
    ln?: string[] // Hashed last names
    ct?: string[] // Hashed city
    st?: string[] // Hashed state
    zp?: string[] // Hashed zip code
    country?: string[] // Hashed country code
    external_id?: string[] // Hashed external IDs (e.g., customer ID)
  }
  custom_data?: {
    currency?: string
    value?: number
    content_ids?: string[]
    content_type?: string
    content_name?: string
    content_category?: string
    num_items?: number
    order_id?: string
  }
  event_source_url?: string
  action_source: 'website'
  event_id?: string // For deduplication with browser pixel
}

export interface MetaCapiCredentials {
  pixelId: string
  accessToken: string
}

export interface BatchEventResult {
  events_received: number
  messages: string[]
  fbtrace_id: string
}

interface MetaCapiApiError {
  error: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

// ============================================
// CONSTANTS
// ============================================

const META_CAPI_BASE = 'https://graph.facebook.com/v21.0'
const MAX_BATCH_SIZE = 1000 // Meta allows up to 1000 events per batch
const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1000

const log = logger.child({ traceId: `meta-capi:${Date.now()}` })

// ============================================
// HELPERS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * SHA-256 hash a string value for Meta CAPI PII compliance.
 * Meta requires all user data (email, phone, name, etc.) to be
 * lowercase-trimmed and SHA-256 hashed before sending.
 */
export function hashUserData(data: string): string {
  const normalized = data.trim().toLowerCase()
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Convenience: hash an array of strings. Returns empty array if input is falsy.
 */
export function hashUserDataArray(values: string[] | undefined): string[] {
  if (!values || values.length === 0) return []
  return values.map(hashUserData)
}

/**
 * Check whether a string is already a 64-char hex SHA-256 hash.
 */
function isAlreadyHashed(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value)
}

/**
 * Ensure a user data field is hashed. If already hashed, pass through.
 */
function ensureHashed(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) return undefined
  return values.map((v) => (isAlreadyHashed(v) ? v : hashUserData(v)))
}

/**
 * Normalize and hash all PII fields in user_data before sending to Meta.
 */
function normalizeUserData(userData: ConversionEvent['user_data']): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}

  if (userData.em) normalized.em = ensureHashed(userData.em)
  if (userData.ph) normalized.ph = ensureHashed(userData.ph)
  if (userData.fn) normalized.fn = ensureHashed(userData.fn)
  if (userData.ln) normalized.ln = ensureHashed(userData.ln)
  if (userData.ct) normalized.ct = ensureHashed(userData.ct)
  if (userData.st) normalized.st = ensureHashed(userData.st)
  if (userData.zp) normalized.zp = ensureHashed(userData.zp)
  if (userData.country) normalized.country = ensureHashed(userData.country)
  if (userData.external_id) normalized.external_id = ensureHashed(userData.external_id)

  // Non-PII fields — pass through as-is
  if (userData.client_ip_address) normalized.client_ip_address = userData.client_ip_address
  if (userData.client_user_agent) normalized.client_user_agent = userData.client_user_agent
  if (userData.fbc) normalized.fbc = userData.fbc
  if (userData.fbp) normalized.fbp = userData.fbp

  return normalized
}

// ============================================
// CREDENTIAL RETRIEVAL
// ============================================

/**
 * Get Meta Pixel ID and access token from the store's connected accounts.
 * Looks for a 'meta' connection with pixel_id in metadata.
 */
async function getMetaCapiCredentials(storeId: string): Promise<MetaCapiCredentials | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('token_encrypted, metadata')
    .eq('store_id', storeId)
    .eq('provider', 'meta')
    .eq('status', 'active')
    .single()

  if (error || !data) {
    log.warn('No active Meta connection found for store', { storeId })
    return null
  }

  const metadata = data.metadata as Record<string, unknown> | null
  const pixelId = metadata?.pixel_id as string | undefined

  if (!pixelId) {
    log.warn('Meta connection found but no pixel_id in metadata', { storeId })
    return null
  }

  try {
    const accessToken = decrypt(data.token_encrypted)
    return { pixelId, accessToken }
  } catch (err) {
    log.error(
      'Failed to decrypt Meta token for CAPI',
      err instanceof Error ? err : new Error(String(err)),
      { storeId }
    )
    return null
  }
}

/**
 * Require valid CAPI credentials or throw.
 */
async function requireCapiCredentials(storeId: string): Promise<MetaCapiCredentials> {
  const creds = await getMetaCapiCredentials(storeId)
  if (!creds) {
    throw new Error(
      'Meta account not connected or Pixel ID not configured. Please connect your Meta Business account and configure your Pixel in Settings > Connections.'
    )
  }
  return creds
}

// ============================================
// API CALLS
// ============================================

/**
 * Send events to Meta Conversions API with exponential backoff retry.
 */
async function postEvents(
  pixelId: string,
  accessToken: string,
  events: Array<Record<string, unknown>>,
  testEventCode?: string,
  attempt: number = 1
): Promise<BatchEventResult> {
  const url = `${META_CAPI_BASE}/${pixelId}/events`

  const body: Record<string, unknown> = {
    data: events,
    access_token: accessToken,
  }

  if (testEventCode) {
    body.test_event_code = testEventCode
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const responseBody = await res.json()

  // Check for errors
  if (responseBody.error) {
    const apiError = responseBody as MetaCapiApiError
    const { error } = apiError

    // Retry on rate-limit (code 32) or transient server errors (code 2)
    const retryable = error.code === 32 || error.code === 2
    if (retryable && attempt < MAX_RETRIES) {
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)
      log.warn('Meta CAPI rate-limited, retrying', {
        code: error.code,
        attempt,
        delayMs: delay,
      })
      await sleep(delay)
      return postEvents(pixelId, accessToken, events, testEventCode, attempt + 1)
    }

    const err = new Error(`Meta CAPI error: ${error.message}`)
    ;(err as Error & { code?: string }).code = String(error.code)
    throw err
  }

  return responseBody as BatchEventResult
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Send a single conversion event to Meta Conversions API.
 */
export async function sendConversionEvent(
  storeId: string,
  event: ConversionEvent
): Promise<BatchEventResult> {
  const creds = await requireCapiCredentials(storeId)

  const normalizedEvent: Record<string, unknown> = {
    event_name: event.event_name,
    event_time: event.event_time,
    user_data: normalizeUserData(event.user_data),
    action_source: event.action_source,
  }

  if (event.custom_data) {
    normalizedEvent.custom_data = event.custom_data
  }

  if (event.event_source_url) {
    normalizedEvent.event_source_url = event.event_source_url
  }

  if (event.event_id) {
    normalizedEvent.event_id = event.event_id
  }

  const result = await postEvents(creds.pixelId, creds.accessToken, [normalizedEvent])

  log.info('Sent Meta CAPI event', {
    storeId,
    eventName: event.event_name,
    eventsReceived: result.events_received,
  })

  return result
}

/**
 * Send multiple conversion events in a batch to Meta Conversions API.
 * Automatically splits into chunks of MAX_BATCH_SIZE (1000) if needed.
 */
export async function sendBatchEvents(
  storeId: string,
  events: ConversionEvent[]
): Promise<BatchEventResult> {
  if (events.length === 0) {
    return { events_received: 0, messages: [], fbtrace_id: '' }
  }

  const creds = await requireCapiCredentials(storeId)

  // Normalize all events
  const normalizedEvents = events.map((event) => {
    const normalized: Record<string, unknown> = {
      event_name: event.event_name,
      event_time: event.event_time,
      user_data: normalizeUserData(event.user_data),
      action_source: event.action_source,
    }

    if (event.custom_data) normalized.custom_data = event.custom_data
    if (event.event_source_url) normalized.event_source_url = event.event_source_url
    if (event.event_id) normalized.event_id = event.event_id

    return normalized
  })

  // Split into chunks if necessary
  let totalReceived = 0
  const allMessages: string[] = []
  let lastTraceId = ''

  for (let i = 0; i < normalizedEvents.length; i += MAX_BATCH_SIZE) {
    const chunk = normalizedEvents.slice(i, i + MAX_BATCH_SIZE)
    const result = await postEvents(creds.pixelId, creds.accessToken, chunk)
    totalReceived += result.events_received
    allMessages.push(...(result.messages || []))
    lastTraceId = result.fbtrace_id || lastTraceId
  }

  log.info('Sent Meta CAPI batch', {
    storeId,
    totalEvents: events.length,
    eventsReceived: totalReceived,
  })

  return {
    events_received: totalReceived,
    messages: allMessages,
    fbtrace_id: lastTraceId,
  }
}

// ============================================
// CONVENIENCE BUILDERS
// ============================================

/**
 * Build a Purchase conversion event from order data.
 */
export function buildPurchaseEvent(params: {
  email?: string
  phone?: string
  clientIp?: string
  userAgent?: string
  fbc?: string
  fbp?: string
  customerId?: string
  currency: string
  value: number
  contentIds: string[]
  numItems: number
  orderId: string
  sourceUrl?: string
}): ConversionEvent {
  const userData: ConversionEvent['user_data'] = {
    client_ip_address: params.clientIp,
    client_user_agent: params.userAgent,
    fbc: params.fbc,
    fbp: params.fbp,
  }

  if (params.email) userData.em = [hashUserData(params.email)]
  if (params.phone) userData.ph = [hashUserData(params.phone)]
  if (params.customerId) userData.external_id = [hashUserData(params.customerId)]

  return {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    user_data: userData,
    custom_data: {
      currency: params.currency,
      value: params.value,
      content_ids: params.contentIds,
      content_type: 'product',
      num_items: params.numItems,
      order_id: params.orderId,
    },
    event_source_url: params.sourceUrl,
    action_source: 'website',
    event_id: `purchase_${params.orderId}`,
  }
}

/**
 * Build an AddToCart conversion event.
 */
export function buildAddToCartEvent(params: {
  email?: string
  phone?: string
  clientIp?: string
  userAgent?: string
  fbc?: string
  fbp?: string
  currency: string
  value: number
  contentId: string
  contentName?: string
  sourceUrl?: string
}): ConversionEvent {
  const userData: ConversionEvent['user_data'] = {
    client_ip_address: params.clientIp,
    client_user_agent: params.userAgent,
    fbc: params.fbc,
    fbp: params.fbp,
  }

  if (params.email) userData.em = [hashUserData(params.email)]
  if (params.phone) userData.ph = [hashUserData(params.phone)]

  return {
    event_name: 'AddToCart',
    event_time: Math.floor(Date.now() / 1000),
    user_data: userData,
    custom_data: {
      currency: params.currency,
      value: params.value,
      content_ids: [params.contentId],
      content_type: 'product',
      content_name: params.contentName,
      num_items: 1,
    },
    event_source_url: params.sourceUrl,
    action_source: 'website',
    event_id: `atc_${params.contentId}_${Date.now()}`,
  }
}

/**
 * Build a ViewContent conversion event.
 */
export function buildViewContentEvent(params: {
  email?: string
  clientIp?: string
  userAgent?: string
  fbc?: string
  fbp?: string
  currency: string
  value: number
  contentId: string
  contentName?: string
  contentCategory?: string
  sourceUrl?: string
}): ConversionEvent {
  const userData: ConversionEvent['user_data'] = {
    client_ip_address: params.clientIp,
    client_user_agent: params.userAgent,
    fbc: params.fbc,
    fbp: params.fbp,
  }

  if (params.email) userData.em = [hashUserData(params.email)]

  return {
    event_name: 'ViewContent',
    event_time: Math.floor(Date.now() / 1000),
    user_data: userData,
    custom_data: {
      currency: params.currency,
      value: params.value,
      content_ids: [params.contentId],
      content_type: 'product',
      content_name: params.contentName,
      content_category: params.contentCategory,
    },
    event_source_url: params.sourceUrl,
    action_source: 'website',
    event_id: `vc_${params.contentId}_${Date.now()}`,
  }
}

/**
 * Build an InitiateCheckout conversion event.
 */
export function buildInitiateCheckoutEvent(params: {
  email?: string
  phone?: string
  clientIp?: string
  userAgent?: string
  fbc?: string
  fbp?: string
  customerId?: string
  currency: string
  value: number
  contentIds: string[]
  numItems: number
  sourceUrl?: string
}): ConversionEvent {
  const userData: ConversionEvent['user_data'] = {
    client_ip_address: params.clientIp,
    client_user_agent: params.userAgent,
    fbc: params.fbc,
    fbp: params.fbp,
  }

  if (params.email) userData.em = [hashUserData(params.email)]
  if (params.phone) userData.ph = [hashUserData(params.phone)]
  if (params.customerId) userData.external_id = [hashUserData(params.customerId)]

  return {
    event_name: 'InitiateCheckout',
    event_time: Math.floor(Date.now() / 1000),
    user_data: userData,
    custom_data: {
      currency: params.currency,
      value: params.value,
      content_ids: params.contentIds,
      content_type: 'product',
      num_items: params.numItems,
    },
    event_source_url: params.sourceUrl,
    action_source: 'website',
    event_id: `ic_${params.customerId || 'anon'}_${Date.now()}`,
  }
}

/**
 * Build a Lead conversion event (e.g., newsletter signup, wishlist add).
 */
export function buildLeadEvent(params: {
  email?: string
  phone?: string
  clientIp?: string
  userAgent?: string
  fbc?: string
  fbp?: string
  sourceUrl?: string
}): ConversionEvent {
  const userData: ConversionEvent['user_data'] = {
    client_ip_address: params.clientIp,
    client_user_agent: params.userAgent,
    fbc: params.fbc,
    fbp: params.fbp,
  }

  if (params.email) userData.em = [hashUserData(params.email)]
  if (params.phone) userData.ph = [hashUserData(params.phone)]

  return {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    user_data: userData,
    action_source: 'website',
    event_source_url: params.sourceUrl,
    event_id: `lead_${Date.now()}`,
  }
}

/**
 * Build a CompleteRegistration conversion event.
 */
export function buildCompleteRegistrationEvent(params: {
  email?: string
  phone?: string
  clientIp?: string
  userAgent?: string
  fbc?: string
  fbp?: string
  customerId?: string
  sourceUrl?: string
}): ConversionEvent {
  const userData: ConversionEvent['user_data'] = {
    client_ip_address: params.clientIp,
    client_user_agent: params.userAgent,
    fbc: params.fbc,
    fbp: params.fbp,
  }

  if (params.email) userData.em = [hashUserData(params.email)]
  if (params.phone) userData.ph = [hashUserData(params.phone)]
  if (params.customerId) userData.external_id = [hashUserData(params.customerId)]

  return {
    event_name: 'CompleteRegistration',
    event_time: Math.floor(Date.now() / 1000),
    user_data: userData,
    action_source: 'website',
    event_source_url: params.sourceUrl,
    event_id: `reg_${params.customerId || Date.now()}`,
  }
}
