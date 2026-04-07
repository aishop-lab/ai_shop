// src/lib/agents/analytics/queries.ts
// Analytics data query layer — pure Supabase queries, no AI/LLM calls.
// Used by both agent tools and the analytics dashboard page.

import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DateRange = {
  from: string // ISO date
  to: string // ISO date
}

export type GroupBy = 'day' | 'week' | 'month'

// ---------------------------------------------------------------------------
// Revenue query result
// ---------------------------------------------------------------------------

export type RevenueResult = {
  total: number
  count: number
  avgOrderValue: number
  byDay: Record<string, number>
}

// ---------------------------------------------------------------------------
// Top product entry
// ---------------------------------------------------------------------------

export type TopProduct = {
  id: string
  name: string
  units: number
  revenue: number
}

// ---------------------------------------------------------------------------
// Customer metrics
// ---------------------------------------------------------------------------

export type CustomerMetrics = {
  totalCustomers: number
  newCustomers: number
  repeatCustomers: number
  activeCustomers: number
}

// ---------------------------------------------------------------------------
// Abandoned cart metrics
// ---------------------------------------------------------------------------

export type AbandonedCartMetrics = {
  total: number
  recovered: number
  totalValue: number
  recoveryRate: number
}

// ---------------------------------------------------------------------------
// Period comparison
// ---------------------------------------------------------------------------

export type PeriodComparison = {
  current: { revenue: number; orders: number; aov: number }
  previous: { revenue: number; orders: number; aov: number }
  changes: { revenue: number; orders: number; aov: number }
}

// ---------------------------------------------------------------------------
// Valid order statuses that count toward revenue
// ---------------------------------------------------------------------------

const REVENUE_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered', 'out_for_delivery']

// ---------------------------------------------------------------------------
// getDateRange — utility to compute ISO date ranges
// ---------------------------------------------------------------------------

export function getDateRange(
  period: '7d' | '30d' | '90d' | 'custom',
  custom?: DateRange
): DateRange {
  const to = new Date().toISOString()
  const from = new Date()

  switch (period) {
    case '7d':
      from.setDate(from.getDate() - 7)
      break
    case '30d':
      from.setDate(from.getDate() - 30)
      break
    case '90d':
      from.setDate(from.getDate() - 90)
      break
    case 'custom':
      return custom!
  }

  return { from: from.toISOString(), to }
}

// ---------------------------------------------------------------------------
// queryRevenue — revenue, count, AOV, daily breakdown
// ---------------------------------------------------------------------------

export async function queryRevenue(
  storeId: string,
  range: DateRange
): Promise<RevenueResult> {
  const supabase = getSupabaseAdmin()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('total_amount, created_at, fulfillment_status')
    .eq('store_id', storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)
    .in('fulfillment_status', REVENUE_STATUSES)

  if (error) throw new Error(`Revenue query failed: ${error.message}`)

  const total = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const count = (orders || []).length
  const avgOrderValue = count > 0 ? total / count : 0

  // Group by day
  const byDay: Record<string, number> = {}
  for (const order of orders || []) {
    const day = new Date(order.created_at).toISOString().split('T')[0]
    byDay[day] = (byDay[day] || 0) + (order.total_amount || 0)
  }

  return { total, count, avgOrderValue, byDay }
}

// ---------------------------------------------------------------------------
// queryOrders — all orders with status breakdown
// ---------------------------------------------------------------------------

export async function queryOrders(
  storeId: string,
  range: DateRange
): Promise<{ total: number; byStatus: Record<string, number> }> {
  const supabase = getSupabaseAdmin()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, fulfillment_status, total_amount, created_at')
    .eq('store_id', storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  if (error) throw new Error(`Orders query failed: ${error.message}`)

  const byStatus: Record<string, number> = {}
  for (const order of orders || []) {
    const s = order.fulfillment_status || 'unknown'
    byStatus[s] = (byStatus[s] || 0) + 1
  }

  return { total: (orders || []).length, byStatus }
}

// ---------------------------------------------------------------------------
// queryTopProducts — aggregates order_items by product, sorted by revenue
// ---------------------------------------------------------------------------

export async function queryTopProducts(
  storeId: string,
  range: DateRange,
  limit = 10
): Promise<TopProduct[]> {
  const supabase = getSupabaseAdmin()

  const { data: items, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, unit_price, orders!inner(store_id, created_at, fulfillment_status)')
    .eq('orders.store_id', storeId)
    .gte('orders.created_at', range.from)
    .lte('orders.created_at', range.to)
    .in('orders.fulfillment_status', REVENUE_STATUSES)

  if (error) throw new Error(`Top products query failed: ${error.message}`)

  // Aggregate by product
  const productMap: Record<string, { units: number; revenue: number }> = {}
  for (const item of items || []) {
    const pid = item.product_id
    if (!productMap[pid]) productMap[pid] = { units: 0, revenue: 0 }
    productMap[pid].units += item.quantity || 1
    productMap[pid].revenue += (item.unit_price || 0) * (item.quantity || 1)
  }

  // Fetch product names
  const productIds = Object.keys(productMap)
  if (productIds.length === 0) return []

  const { data: products } = await supabase
    .from('products')
    .select('id, title')
    .in('id', productIds)

  const nameMap: Record<string, string> = {}
  for (const p of products || []) nameMap[p.id] = p.title

  return Object.entries(productMap)
    .map(([id, stats]) => ({ id, name: nameMap[id] || 'Unknown', ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

// ---------------------------------------------------------------------------
// queryCustomerMetrics — total, new, repeat, active customers
// ---------------------------------------------------------------------------

export async function queryCustomerMetrics(
  storeId: string,
  range: DateRange
): Promise<CustomerMetrics> {
  const supabase = getSupabaseAdmin()

  // Total customers for the store (all time)
  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)

  // New customers created within the date range
  const { count: newCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  // Repeat purchasers: customers with >1 order in period
  const { data: orderCounts } = await supabase
    .from('orders')
    .select('customer_id')
    .eq('store_id', storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)
    .not('customer_id', 'is', null)

  const customerOrderMap: Record<string, number> = {}
  for (const o of orderCounts || []) {
    if (o.customer_id) {
      customerOrderMap[o.customer_id] = (customerOrderMap[o.customer_id] || 0) + 1
    }
  }
  const repeatCustomers = Object.values(customerOrderMap).filter(c => c > 1).length

  return {
    totalCustomers: totalCustomers || 0,
    newCustomers: newCustomers || 0,
    repeatCustomers,
    activeCustomers: Object.keys(customerOrderMap).length,
  }
}

// ---------------------------------------------------------------------------
// queryAbandonedCartMetrics — total, recovered, value, recovery rate
// ---------------------------------------------------------------------------

export async function queryAbandonedCartMetrics(
  storeId: string,
  range: DateRange
): Promise<AbandonedCartMetrics> {
  const supabase = getSupabaseAdmin()

  const { data: carts, error } = await supabase
    .from('abandoned_carts')
    .select('subtotal, recovery_status, created_at')
    .eq('store_id', storeId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  if (error) throw new Error(`Abandoned cart query failed: ${error.message}`)

  const total = (carts || []).length
  const recovered = (carts || []).filter(c => c.recovery_status === 'recovered').length
  const totalValue = (carts || []).reduce((sum, c) => sum + (c.subtotal || 0), 0)
  const recoveryRate = total > 0 ? recovered / total : 0

  return { total, recovered, totalValue, recoveryRate }
}

// ---------------------------------------------------------------------------
// compareTimePeriods — compares revenue/orders/AOV between two periods
// ---------------------------------------------------------------------------

export async function compareTimePeriods(
  storeId: string,
  currentRange: DateRange,
  previousRange: DateRange
): Promise<PeriodComparison> {
  const [current, previous] = await Promise.all([
    queryRevenue(storeId, currentRange),
    queryRevenue(storeId, previousRange),
  ])

  const revenueChange =
    previous.total > 0
      ? ((current.total - previous.total) / previous.total) * 100
      : 0
  const orderChange =
    previous.count > 0
      ? ((current.count - previous.count) / previous.count) * 100
      : 0
  const aovChange =
    previous.avgOrderValue > 0
      ? ((current.avgOrderValue - previous.avgOrderValue) / previous.avgOrderValue) * 100
      : 0

  return {
    current: { revenue: current.total, orders: current.count, aov: current.avgOrderValue },
    previous: { revenue: previous.total, orders: previous.count, aov: previous.avgOrderValue },
    changes: {
      revenue: Math.round(revenueChange * 10) / 10,
      orders: Math.round(orderChange * 10) / 10,
      aov: Math.round(aovChange * 10) / 10,
    },
  }
}
