// src/lib/agents/analytics/attribution.ts
// Multi-touch attribution models for the Analytics Agent.
// Calculates revenue attribution across marketing channels using five
// standard models: first-touch, last-touch, linear, time-decay, position-based.

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getDateRange } from './queries'
import { getGA4Config, queryGA4 } from './ga4-client'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AttributionModel =
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'time_decay'
  | 'position_based'

export interface TouchPoint {
  channel: string // 'organic', 'paid_search', 'social', 'email', 'direct', 'referral'
  source: string
  medium: string
  timestamp: string
  page_path?: string
}

export interface AttributionResult {
  channel: string
  model: AttributionModel
  attributed_revenue: number
  attributed_conversions: number
  percentage: number
}

export interface ChannelPerformance {
  channel: string
  total_revenue: number
  total_conversions: number
  models: Record<AttributionModel, {
    attributed_revenue: number
    attributed_conversions: number
    percentage: number
  }>
}

export interface CustomerJourney {
  customer_id: string | null
  order_id: string
  order_total: number
  touchpoints: TouchPoint[]
  conversion_date: string
}

const log = logger

// ---------------------------------------------------------------------------
// Channel classification
// ---------------------------------------------------------------------------

const TIME_DECAY_HALF_LIFE_DAYS = 7

/**
 * Classify a source/medium pair into a standard channel.
 */
function classifyChannel(source: string, medium: string): string {
  const src = (source || '').toLowerCase()
  const med = (medium || '').toLowerCase()

  if (src === '(direct)' || src === 'direct' || (!src && !med)) return 'direct'
  if (med === 'cpc' || med === 'ppc' || med === 'paid' || med.includes('paid')) return 'paid_search'
  if (med === 'organic' || src === 'google' || src === 'bing' || src === 'yahoo') {
    if (med === 'cpc' || med === 'ppc') return 'paid_search'
    return 'organic'
  }
  if (med === 'social' || src.includes('facebook') || src.includes('instagram') ||
      src.includes('twitter') || src.includes('linkedin') || src.includes('tiktok')) {
    return 'social'
  }
  if (med === 'email' || src.includes('email') || src.includes('newsletter')) return 'email'
  if (med === 'referral' || med === 'link') return 'referral'
  if (med === 'display' || med === 'banner' || med === 'cpm') return 'display'

  return 'other'
}

// ---------------------------------------------------------------------------
// Data collection — builds customer journeys from orders + GA4
// ---------------------------------------------------------------------------

/**
 * Collect customer journeys for a store within a time period.
 * Combines order-level UTM/source data with GA4 session data when available.
 */
async function collectJourneys(
  storeId: string,
  period: '7d' | '30d' | '90d'
): Promise<CustomerJourney[]> {
  const supabase = getSupabaseAdmin()
  const range = getDateRange(period)

  // Fetch orders with source/medium data
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, customer_id, total, created_at, source, medium, utm_source, utm_medium, utm_campaign, referrer')
    .eq('store_id', storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)
    .in('fulfillment_status', ['confirmed', 'processing', 'shipped', 'delivered', 'out_for_delivery'])
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch orders for attribution: ${error.message}`)
  }

  if (!orders || orders.length === 0) {
    return []
  }

  // Try to enrich with GA4 session data if available
  let ga4Sessions: Map<string, TouchPoint[]> = new Map()
  try {
    const config = await getGA4Config(storeId)
    if (config) {
      ga4Sessions = await fetchGA4SessionData(config, period)
    }
  } catch {
    log.info(`GA4 data not available for attribution enrichment (store: ${storeId})`)
  }

  // Build journeys
  const journeys: CustomerJourney[] = []

  for (const order of orders) {
    const touchpoints: TouchPoint[] = []

    // Add GA4 touchpoints for this customer if available
    const customerId = order.customer_id
    if (customerId && ga4Sessions.has(customerId)) {
      const sessionTouchpoints = ga4Sessions.get(customerId)!
      // Only include touchpoints before the order
      const orderDate = new Date(order.created_at).getTime()
      for (const tp of sessionTouchpoints) {
        if (new Date(tp.timestamp).getTime() <= orderDate) {
          touchpoints.push(tp)
        }
      }
    }

    // Add the order-level touchpoint (from UTM params or source/medium on the order)
    const orderSource = order.utm_source || order.source || '(direct)'
    const orderMedium = order.utm_medium || order.medium || '(none)'
    const channel = classifyChannel(orderSource, orderMedium)

    touchpoints.push({
      channel,
      source: orderSource,
      medium: orderMedium,
      timestamp: order.created_at,
    })

    // If no touchpoints at all, attribute to direct
    if (touchpoints.length === 0) {
      touchpoints.push({
        channel: 'direct',
        source: '(direct)',
        medium: '(none)',
        timestamp: order.created_at,
      })
    }

    // Sort touchpoints chronologically
    touchpoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    journeys.push({
      customer_id: customerId,
      order_id: order.id,
      order_total: order.total || 0,
      touchpoints,
      conversion_date: order.created_at,
    })
  }

  return journeys
}

/**
 * Fetch session-level data from GA4 to enrich attribution touchpoints.
 */
async function fetchGA4SessionData(
  config: { propertyId: string; accessToken: string },
  period: '7d' | '30d' | '90d'
): Promise<Map<string, TouchPoint[]>> {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)

  const dateRange = {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }

  try {
    const report = await queryGA4(config, {
      dimensions: ['sessionSource', 'sessionMedium', 'date'],
      metrics: ['sessions', 'totalUsers'],
      dateRanges: [dateRange],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 100,
    })

    // Since GA4 doesn't expose per-customer session data via the Data API,
    // we aggregate source/medium data and use it as supplementary context.
    // The per-customer mapping would require GA4 user-ID or BigQuery export.
    const sessions = new Map<string, TouchPoint[]>()

    for (const row of report.rows) {
      const source = row.dimensionValues[0] || '(direct)'
      const medium = row.dimensionValues[1] || '(none)'
      const dateStr = row.dimensionValues[2]
      const formatted = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`

      // Store as aggregate session data (keyed by '__aggregate__')
      const key = '__aggregate__'
      if (!sessions.has(key)) sessions.set(key, [])
      sessions.get(key)!.push({
        channel: classifyChannel(source, medium),
        source,
        medium,
        timestamp: `${formatted}T12:00:00.000Z`,
      })
    }

    return sessions
  } catch {
    log.info('Failed to fetch GA4 session data for attribution')
    return new Map()
  }
}

// ---------------------------------------------------------------------------
// Attribution models
// ---------------------------------------------------------------------------

/**
 * Apply an attribution model to a set of customer journeys.
 */
function applyModel(
  journeys: CustomerJourney[],
  model: AttributionModel
): AttributionResult[] {
  // Accumulate credit per channel
  const channelCredit: Record<string, { revenue: number; conversions: number }> = {}
  let totalRevenue = 0

  for (const journey of journeys) {
    const { touchpoints, order_total } = journey
    if (touchpoints.length === 0) continue

    totalRevenue += order_total
    const credits = calculateCredits(touchpoints, order_total, model, journey.conversion_date)

    for (const { channel, revenue, conversions } of credits) {
      if (!channelCredit[channel]) {
        channelCredit[channel] = { revenue: 0, conversions: 0 }
      }
      channelCredit[channel].revenue += revenue
      channelCredit[channel].conversions += conversions
    }
  }

  // Build results sorted by attributed revenue
  const results: AttributionResult[] = Object.entries(channelCredit)
    .map(([channel, { revenue, conversions }]) => ({
      channel,
      model,
      attributed_revenue: Math.round(revenue * 100) / 100,
      attributed_conversions: Math.round(conversions * 100) / 100,
      percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.attributed_revenue - a.attributed_revenue)

  return results
}

/**
 * Calculate credit allocation for a single journey under a given model.
 */
function calculateCredits(
  touchpoints: TouchPoint[],
  orderTotal: number,
  model: AttributionModel,
  conversionDate: string
): Array<{ channel: string; revenue: number; conversions: number }> {
  const n = touchpoints.length

  switch (model) {
    case 'first_touch': {
      const first = touchpoints[0]
      return [{ channel: first.channel, revenue: orderTotal, conversions: 1 }]
    }

    case 'last_touch': {
      const last = touchpoints[n - 1]
      return [{ channel: last.channel, revenue: orderTotal, conversions: 1 }]
    }

    case 'linear': {
      const share = orderTotal / n
      const convShare = 1 / n
      return touchpoints.map((tp) => ({
        channel: tp.channel,
        revenue: share,
        conversions: convShare,
      }))
    }

    case 'time_decay': {
      const conversionTime = new Date(conversionDate).getTime()
      const halfLifeMs = TIME_DECAY_HALF_LIFE_DAYS * 24 * 60 * 60 * 1000

      // Calculate decay weights
      const weights = touchpoints.map((tp) => {
        const timeDiff = conversionTime - new Date(tp.timestamp).getTime()
        // More recent = higher weight; weight = 2^(-timeDiff / halfLife)
        return Math.pow(2, -timeDiff / halfLifeMs)
      })

      const totalWeight = weights.reduce((sum, w) => sum + w, 0)

      return touchpoints.map((tp, i) => ({
        channel: tp.channel,
        revenue: totalWeight > 0 ? orderTotal * (weights[i] / totalWeight) : orderTotal / n,
        conversions: totalWeight > 0 ? weights[i] / totalWeight : 1 / n,
      }))
    }

    case 'position_based': {
      // 40% first, 40% last, 20% split among middle
      return touchpoints.map((tp, i) => {
        let weight: number
        if (n === 1) {
          weight = 1
        } else if (n === 2) {
          weight = 0.5 // split evenly between first and last
        } else if (i === 0) {
          weight = 0.4
        } else if (i === n - 1) {
          weight = 0.4
        } else {
          weight = 0.2 / (n - 2)
        }
        return {
          channel: tp.channel,
          revenue: orderTotal * weight,
          conversions: weight,
        }
      })
    }

    default:
      return [{ channel: touchpoints[0].channel, revenue: orderTotal, conversions: 1 }]
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate attribution for a store using a specific model.
 */
export async function calculateAttribution(
  storeId: string,
  model: AttributionModel,
  period: '7d' | '30d' | '90d'
): Promise<AttributionResult[]> {
  const journeys = await collectJourneys(storeId, period)

  if (journeys.length === 0) {
    return []
  }

  return applyModel(journeys, model)
}

/**
 * Get channel performance with all attribution models compared side by side.
 */
export async function getChannelPerformance(
  storeId: string,
  period: '7d' | '30d' | '90d'
): Promise<ChannelPerformance[]> {
  const journeys = await collectJourneys(storeId, period)

  if (journeys.length === 0) {
    return []
  }

  const models: AttributionModel[] = [
    'first_touch',
    'last_touch',
    'linear',
    'time_decay',
    'position_based',
  ]

  // Run all models
  const resultsByModel: Record<AttributionModel, AttributionResult[]> = {} as Record<
    AttributionModel,
    AttributionResult[]
  >
  for (const model of models) {
    resultsByModel[model] = applyModel(journeys, model)
  }

  // Collect all unique channels
  const allChannels = new Set<string>()
  for (const results of Object.values(resultsByModel)) {
    for (const r of results) allChannels.add(r.channel)
  }

  // Aggregate per channel
  const performances: ChannelPerformance[] = []

  for (const channel of Array.from(allChannels)) {
    const modelData = {} as ChannelPerformance['models']
    let maxRevenue = 0

    for (const model of models) {
      const result = resultsByModel[model].find((r) => r.channel === channel)
      modelData[model] = {
        attributed_revenue: result?.attributed_revenue ?? 0,
        attributed_conversions: result?.attributed_conversions ?? 0,
        percentage: result?.percentage ?? 0,
      }
      if ((result?.attributed_revenue ?? 0) > maxRevenue) {
        maxRevenue = result?.attributed_revenue ?? 0
      }
    }

    // Use linear model as the "total" reference
    const linearResult = resultsByModel.linear.find((r) => r.channel === channel)

    performances.push({
      channel,
      total_revenue: linearResult?.attributed_revenue ?? 0,
      total_conversions: linearResult?.attributed_conversions ?? 0,
      models: modelData,
    })
  }

  // Sort by linear attributed revenue
  performances.sort((a, b) => b.total_revenue - a.total_revenue)

  return performances
}

/**
 * Get sample customer journeys showing touchpoints before conversion.
 */
export async function getCustomerJourneys(
  storeId: string,
  limit: number = 10
): Promise<CustomerJourney[]> {
  const journeys = await collectJourneys(storeId, '30d')

  // Return the most interesting journeys (those with multiple touchpoints first)
  const sorted = journeys.sort((a, b) => {
    // Prefer journeys with more touchpoints
    const tpDiff = b.touchpoints.length - a.touchpoints.length
    if (tpDiff !== 0) return tpDiff
    // Then by order total
    return b.order_total - a.order_total
  })

  return sorted.slice(0, limit)
}
