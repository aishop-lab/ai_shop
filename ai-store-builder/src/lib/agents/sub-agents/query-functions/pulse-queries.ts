// src/lib/agents/sub-agents/query-functions/pulse-queries.ts
// queryFn implementations for the 6 data-only PULSE sub-agents.
// These are pure Supabase queries — no LLM calls.

import {
  getDateRange,
  queryRevenue,
  queryCustomerMetrics,
  queryTopProducts,
  compareTimePeriods,
  type DateRange,
  type RevenueResult,
  type CustomerMetrics,
  type TopProduct,
  type PeriodComparison,
} from '@/lib/agents/analytics/queries'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { StoreContext } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPeriod(params: Record<string, unknown>): '7d' | '30d' | '90d' {
  const p = params.period
  if (p === '7d' || p === '30d' || p === '90d') return p
  return '30d'
}

/** Shift a DateRange back by its own duration to get the "previous" period. */
function previousRange(range: DateRange): DateRange {
  const from = new Date(range.from)
  const to = new Date(range.to)
  const durationMs = to.getTime() - from.getTime()
  return {
    from: new Date(from.getTime() - durationMs).toISOString(),
    to: range.from,
  }
}

// ---------------------------------------------------------------------------
// 1. revenue-tracker
// ---------------------------------------------------------------------------

export type RevenueTrackerResult = {
  revenue: RevenueResult
  comparison: PeriodComparison
  period: string
}

export async function revenueTrackerQuery(
  ctx: StoreContext,
  params: Record<string, unknown>
): Promise<RevenueTrackerResult> {
  const period = getPeriod(params)
  const range = getDateRange(period)
  const prev = previousRange(range)

  const [revenue, comparison] = await Promise.all([
    queryRevenue(ctx.storeId, range),
    compareTimePeriods(ctx.storeId, range, prev),
  ])

  return { revenue, comparison, period }
}

// ---------------------------------------------------------------------------
// 2. traffic-analyst
// ---------------------------------------------------------------------------

export type TrafficAnalystResult = {
  ordersByDay: Record<string, number>
  totalOrders: number
  periodDays: number
  note: string
}

export async function trafficAnalystQuery(
  ctx: StoreContext,
  params: Record<string, unknown>
): Promise<TrafficAnalystResult> {
  const period = getPeriod(params)
  const range = getDateRange(period)

  const supabase = getSupabaseAdmin()
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, created_at')
    .eq('store_id', ctx.storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  if (error) throw new Error(`Traffic analyst query failed: ${error.message}`)

  const ordersByDay: Record<string, number> = {}
  for (const order of orders || []) {
    const day = new Date(order.created_at).toISOString().split('T')[0]
    ordersByDay[day] = (ordersByDay[day] || 0) + 1
  }

  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90

  return {
    ordersByDay,
    totalOrders: (orders || []).length,
    periodDays,
    note: 'Order-based proxy for traffic — page_views table not yet implemented',
  }
}

// ---------------------------------------------------------------------------
// 3. customer-profiler
// ---------------------------------------------------------------------------

export type TopCustomer = {
  id: string
  name: string | null
  email: string
  orderCount: number
  totalSpent: number
}

export type CustomerProfilerResult = {
  metrics: CustomerMetrics
  topCustomers: TopCustomer[]
  period: string
}

export async function customerProfilerQuery(
  ctx: StoreContext,
  params: Record<string, unknown>
): Promise<CustomerProfilerResult> {
  const period = getPeriod(params)
  const range = getDateRange(period)

  const supabase = getSupabaseAdmin()

  const [metrics, ordersResult] = await Promise.all([
    queryCustomerMetrics(ctx.storeId, range),
    supabase
      .from('orders')
      .select('customer_id, total_amount, customers!left(id, name, email)')
      .eq('store_id', ctx.storeId)
      .gte('created_at', range.from)
      .lte('created_at', range.to)
      .not('customer_id', 'is', null),
  ])

  if (ordersResult.error) {
    throw new Error(`Customer profiler query failed: ${ordersResult.error.message}`)
  }

  // Aggregate per customer
  const customerMap: Record<
    string,
    { name: string | null; email: string; orderCount: number; totalSpent: number }
  > = {}

  for (const order of ordersResult.data || []) {
    const cid = order.customer_id as string
    if (!cid) continue
    const customer = order.customers as unknown as { id: string; name: string | null; email: string } | null
    if (!customerMap[cid]) {
      customerMap[cid] = {
        name: customer?.name ?? null,
        email: customer?.email ?? '',
        orderCount: 0,
        totalSpent: 0,
      }
    }
    customerMap[cid].orderCount += 1
    customerMap[cid].totalSpent += order.total_amount || 0
  }

  const topCustomers: TopCustomer[] = Object.entries(customerMap)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)

  return { metrics, topCustomers, period }
}

// ---------------------------------------------------------------------------
// 4. product-ranker
// ---------------------------------------------------------------------------

export type ProductRankerResult = {
  topProducts: TopProduct[]
  bottomProducts: TopProduct[]
  totalProducts: number
  period: string
}

export async function productRankerQuery(
  ctx: StoreContext,
  params: Record<string, unknown>
): Promise<ProductRankerResult> {
  const period = getPeriod(params)
  const range = getDateRange(period)

  const supabase = getSupabaseAdmin()

  const [topProducts, totalResult] = await Promise.all([
    queryTopProducts(ctx.storeId, range, 20),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', ctx.storeId)
      .eq('status', 'active'),
  ])

  // Bottom products = the tail of the sorted list (lowest revenue, non-zero)
  const bottomProducts = [...topProducts].reverse().slice(0, 5)

  return {
    topProducts: topProducts.slice(0, 10),
    bottomProducts,
    totalProducts: totalResult.count || 0,
    period,
  }
}

// ---------------------------------------------------------------------------
// 5. funnel-analyst
// ---------------------------------------------------------------------------

export type FunnelStage = {
  name: string
  count: number
  dropOffPercent: number
}

export type FunnelAnalystResult = {
  stages: FunnelStage[]
  overallConversionRate: number
  period: string
}

export async function funnelAnalystQuery(
  ctx: StoreContext,
  params: Record<string, unknown>
): Promise<FunnelAnalystResult> {
  const period = getPeriod(params)
  const range = getDateRange(period)

  const supabase = getSupabaseAdmin()
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, fulfillment_status, payment_status')
    .eq('store_id', ctx.storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  if (error) throw new Error(`Funnel analyst query failed: ${error.message}`)

  const all = orders || []

  // Define funnel stages in order
  const created = all.length
  const paid = all.filter(o => o.payment_status === 'paid' || o.payment_status === 'captured').length
  const shipped = all.filter(o =>
    ['shipped', 'out_for_delivery'].includes(o.fulfillment_status)
  ).length
  const delivered = all.filter(o => o.fulfillment_status === 'delivered').length

  const stageCounts = [
    { name: 'Order Created', count: created },
    { name: 'Payment Confirmed', count: paid },
    { name: 'Shipped', count: shipped },
    { name: 'Delivered', count: delivered },
  ]

  const stages: FunnelStage[] = stageCounts.map((stage, i) => {
    const prev = i === 0 ? created : stageCounts[i - 1].count
    const dropOffPercent =
      prev > 0 ? Math.round(((prev - stage.count) / prev) * 100 * 10) / 10 : 0
    return { name: stage.name, count: stage.count, dropOffPercent }
  })

  const overallConversionRate =
    created > 0 ? Math.round((delivered / created) * 100 * 10) / 10 : 0

  return { stages, overallConversionRate, period }
}

// ---------------------------------------------------------------------------
// 6. anomaly-sentinel
// ---------------------------------------------------------------------------

export type Anomaly = {
  metric: string
  current: number
  average: number
  deviation: number
  severity: 'low' | 'medium' | 'high'
}

export type AnomalySentinelResult = {
  anomalies: Anomaly[]
  hasAnomalies: boolean
  checkedAt: string
}

export async function anomalySentinelQuery(
  ctx: StoreContext,
  params: Record<string, unknown>
): Promise<AnomalySentinelResult> {
  const supabase = getSupabaseAdmin()
  const now = new Date()

  // Today's range
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayRange: DateRange = { from: todayStart.toISOString(), to: now.toISOString() }

  // 7-day historical range (excluding today)
  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const historicalRange: DateRange = { from: sevenDaysAgo.toISOString(), to: todayStart.toISOString() }

  const [todayOrders, historicalOrders] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total_amount, fulfillment_status')
      .eq('store_id', ctx.storeId)
      .gte('created_at', todayRange.from)
      .lte('created_at', todayRange.to),
    supabase
      .from('orders')
      .select('id, total_amount, created_at, fulfillment_status')
      .eq('store_id', ctx.storeId)
      .gte('created_at', historicalRange.from)
      .lte('created_at', historicalRange.to),
  ])

  if (todayOrders.error) throw new Error(`Anomaly sentinel query failed: ${todayOrders.error.message}`)
  if (historicalOrders.error) throw new Error(`Anomaly sentinel query failed: ${historicalOrders.error.message}`)

  const todayData = todayOrders.data || []
  const historicalData = historicalOrders.data || []

  // Compute today's metrics
  const todayOrderCount = todayData.length
  const todayRevenue = todayData.reduce((sum, o) => sum + (o.total_amount || 0), 0)

  // Compute 7-day daily averages
  const avgOrderCount = historicalData.length / 7
  const avgRevenue = historicalData.reduce((sum, o) => sum + (o.total_amount || 0), 0) / 7

  const anomalies: Anomaly[] = []

  function checkMetric(metric: string, current: number, average: number) {
    if (average === 0) return // Can't detect deviation from zero baseline
    const deviation = Math.abs(current - average) / average
    if (deviation > 2) {
      const severity: Anomaly['severity'] = deviation > 5 ? 'high' : deviation > 3 ? 'medium' : 'low'
      anomalies.push({
        metric,
        current: Math.round(current * 100) / 100,
        average: Math.round(average * 100) / 100,
        deviation: Math.round(deviation * 100) / 100,
        severity,
      })
    }
  }

  checkMetric('daily_order_count', todayOrderCount, avgOrderCount)
  checkMetric('daily_revenue', todayRevenue, avgRevenue)

  return {
    anomalies,
    hasAnomalies: anomalies.length > 0,
    checkedAt: now.toISOString(),
  }
}
