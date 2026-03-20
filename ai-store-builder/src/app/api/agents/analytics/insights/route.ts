// src/app/api/agents/analytics/insights/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'
import {
  queryRevenue,
  queryOrders,
  queryTopProducts,
  queryCustomerMetrics,
  queryAbandonedCartMetrics,
  compareTimePeriods,
  getDateRange,
} from '@/lib/agents/analytics/queries'
import { detectAnomalies } from '@/lib/agents/analytics/anomaly-detection'

export const runtime = 'nodejs'

const VALID_PERIODS = ['7d', '30d', '90d'] as const
type Period = (typeof VALID_PERIODS)[number]

/**
 * GET /api/agents/analytics/insights?period=7d
 * Returns real analytics data for the authenticated user's store.
 */
export async function GET(req: NextRequest) {
  // Authenticate user (Bearer token first, then cookie)
  const auth = await authenticateRequest(req)
  if (!auth.user) {
    return jsonError(auth.error || 'Unauthorized', auth.status)
  }

  const userId = auth.user.id
  const admin = getSupabaseAdmin()

  // Look up user's store
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('id')
    .eq('owner_id', userId)
    .single()

  if (storeError || !store) {
    return jsonError('Store not found', 404)
  }

  const storeId = store.id

  // Parse period param
  const url = new URL(req.url)
  const periodParam = url.searchParams.get('period') || '7d'
  const period: Period = VALID_PERIODS.includes(periodParam as Period)
    ? (periodParam as Period)
    : '7d'

  // Compute date ranges
  const currentRange = getDateRange(period)
  const durationDays = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const prevFrom = new Date(currentRange.from)
  prevFrom.setDate(prevFrom.getDate() - durationDays)
  const previousRange = { from: prevFrom.toISOString(), to: currentRange.from }

  try {
    // Run all queries in parallel
    const [
      revenue,
      orders,
      topProducts,
      customers,
      carts,
      comparison,
      anomalies,
      recentActions,
    ] = await Promise.all([
      queryRevenue(storeId, currentRange),
      queryOrders(storeId, currentRange),
      queryTopProducts(storeId, currentRange),
      queryCustomerMetrics(storeId, currentRange),
      queryAbandonedCartMetrics(storeId, currentRange),
      compareTimePeriods(storeId, currentRange, previousRange),
      detectAnomalies(storeId),
      // Fetch recent analytics agent actions from DB
      admin
        .from('agent_actions')
        .select('id, summary, details, created_at')
        .eq('store_id', storeId)
        .eq('agent_type', 'analytics')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10)
        .then(({ data }) => data || []),
    ])

    return jsonSuccess({
      period,
      revenue,
      orders,
      topProducts,
      customers,
      carts,
      comparison,
      anomalies,
      insights: recentActions,
    })
  } catch (error) {
    console.error('[Analytics Insights] Failed:', error)
    return jsonError(
      `Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}
