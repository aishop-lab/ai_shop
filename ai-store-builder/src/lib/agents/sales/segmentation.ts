// src/lib/agents/sales/segmentation.ts
// RFM (Recency, Frequency, Monetary) customer segmentation

import { getSupabaseAdmin } from '@/lib/supabase/admin'

export type CustomerSegment = 'champions' | 'loyal' | 'potential' | 'at_risk' | 'dormant' | 'new'

export interface SegmentedCustomer {
  customer_id: string
  email: string
  full_name: string | null
  segment: CustomerSegment
  rfm_score: { recency: number; frequency: number; monetary: number }
  total_orders: number
  total_spent: number
  last_order_at: string | null
  days_since_last_order: number
}

export interface SegmentSummary {
  segment: CustomerSegment
  count: number
  total_revenue: number
  avg_order_value: number
  customers: SegmentedCustomer[]
}

interface RawCustomer {
  id: string
  email: string
  full_name: string | null
  total_orders: number
  total_spent: number
  last_order_at: string | null
}

/**
 * Calculate percentile-based score (1-5) for a value within a dataset.
 * Higher values get higher scores.
 */
function percentileScore(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 3
  const rank = sortedValues.filter(v => v <= value).length
  const percentile = rank / sortedValues.length
  if (percentile >= 0.8) return 5
  if (percentile >= 0.6) return 4
  if (percentile >= 0.4) return 3
  if (percentile >= 0.2) return 2
  return 1
}

/**
 * Calculate percentile-based recency score (1-5).
 * Fewer days since last order = higher score (inverted).
 */
function recencyScore(daysSinceLastOrder: number, sortedDays: number[]): number {
  if (sortedDays.length === 0) return 3
  // Invert: fewer days = higher percentile
  const rank = sortedDays.filter(d => d >= daysSinceLastOrder).length
  const percentile = rank / sortedDays.length
  if (percentile >= 0.8) return 5
  if (percentile >= 0.6) return 4
  if (percentile >= 0.4) return 3
  if (percentile >= 0.2) return 2
  return 1
}

/**
 * Classify a customer into a segment based on RFM scores.
 */
function classifySegment(
  r: number,
  f: number,
  m: number,
  totalOrders: number,
  daysSinceLastOrder: number
): CustomerSegment {
  // New customers: only 1 order and ordered recently (within 30 days)
  if (totalOrders === 1 && daysSinceLastOrder <= 30) return 'new'

  // Champions: high across all dimensions
  if (r >= 4 && f >= 4 && m >= 4) return 'champions'

  // Loyal: strong frequency and monetary
  if (f >= 3 && m >= 3) return 'loyal'

  // At Risk: low recency but has purchase history
  if (r <= 2 && f >= 2) return 'at_risk'

  // Potential: recent activity with some frequency
  if (r >= 3 && f >= 2) return 'potential'

  // Dormant: low recency and low frequency
  if (r <= 1 && f <= 1) return 'dormant'

  // Default to potential if nothing else matches
  return 'potential'
}

/**
 * Segment all customers for a store using RFM analysis.
 */
export async function segmentCustomers(storeId: string): Promise<SegmentSummary[]> {
  const supabase = getSupabaseAdmin()

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, email, full_name, total_orders, total_spent, last_order_at')
    .eq('store_id', storeId)
    .gt('total_orders', 0)

  if (error) {
    throw new Error(`Failed to fetch customers: ${error.message}`)
  }

  if (!customers || customers.length === 0) {
    return []
  }

  const now = Date.now()
  const rawCustomers = customers as RawCustomer[]

  // Calculate days since last order for each customer
  const daysSinceValues = rawCustomers.map(c => {
    if (!c.last_order_at) return 365 // Default to 1 year if no order date
    return Math.floor((now - new Date(c.last_order_at).getTime()) / (1000 * 60 * 60 * 24))
  })

  // Prepare sorted arrays for percentile scoring
  const sortedDays = [...daysSinceValues].sort((a, b) => a - b)
  const sortedFrequency = rawCustomers.map(c => c.total_orders).sort((a, b) => a - b)
  const sortedMonetary = rawCustomers.map(c => c.total_spent).sort((a, b) => a - b)

  // Score and segment each customer
  const segmented: SegmentedCustomer[] = rawCustomers.map((customer, i) => {
    const daysSince = daysSinceValues[i]
    const r = recencyScore(daysSince, sortedDays)
    const f = percentileScore(customer.total_orders, sortedFrequency)
    const m = percentileScore(customer.total_spent, sortedMonetary)
    const segment = classifySegment(r, f, m, customer.total_orders, daysSince)

    return {
      customer_id: customer.id,
      email: customer.email,
      full_name: customer.full_name,
      segment,
      rfm_score: { recency: r, frequency: f, monetary: m },
      total_orders: customer.total_orders,
      total_spent: customer.total_spent,
      last_order_at: customer.last_order_at,
      days_since_last_order: daysSince,
    }
  })

  // Group into segment summaries
  const segmentMap = new Map<CustomerSegment, SegmentedCustomer[]>()
  for (const customer of segmented) {
    const existing = segmentMap.get(customer.segment) || []
    existing.push(customer)
    segmentMap.set(customer.segment, existing)
  }

  const allSegments: CustomerSegment[] = ['champions', 'loyal', 'potential', 'at_risk', 'dormant', 'new']

  return allSegments
    .map(segment => {
      const customers = segmentMap.get(segment) || []
      const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0)
      const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0)

      return {
        segment,
        count: customers.length,
        total_revenue: totalRevenue,
        avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        customers,
      }
    })
    .filter(s => s.count > 0)
}
