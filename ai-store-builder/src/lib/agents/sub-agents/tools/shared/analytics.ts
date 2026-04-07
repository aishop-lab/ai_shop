// src/lib/agents/sub-agents/tools/shared/analytics.ts
// Shared analytics query tools — used by checkout-doctor, cart-whisperer, report-writer

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_funnel_data — Enhanced checkout funnel
// ---------------------------------------------------------------------------

export const get_funnel_data = tool({
  description:
    'Get checkout funnel data with granular stages — carts, abandonments, payments, completions. ' +
    'More detailed than basic checkout funnel — includes payment failure breakdown.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z.number().optional().describe('Period in days (default: 30)'),
  }),
  execute: async ({ store_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const [cartsResult, ordersResult] = await Promise.all([
      supabase
        .from('abandoned_carts')
        .select('id, recovery_status', { count: 'exact' })
        .eq('store_id', store_id)
        .gte('created_at', since),
      supabase
        .from('orders')
        .select('id, payment_status, fulfillment_status')
        .eq('store_id', store_id)
        .gte('created_at', since),
    ])

    const abandonedCount = cartsResult.count ?? 0
    const orders = ordersResult.data ?? []
    const orderCount = orders.length
    const paid = orders.filter((o) => o.payment_status === 'paid').length
    const failed = orders.filter((o) => o.payment_status === 'failed').length
    const pending = orders.filter((o) => o.payment_status === 'pending').length
    const totalFunnel = abandonedCount + orderCount

    // Recovery stats from abandoned carts
    const recovered = (cartsResult.data ?? []).filter((c) => c.recovery_status === 'recovered').length

    return {
      success: true,
      period_days: days,
      funnel: {
        total_carts: totalFunnel,
        abandoned: abandonedCount,
        recovered,
        checkout_completed: orderCount,
        payments_successful: paid,
        payments_failed: failed,
        payments_pending: pending,
        cart_to_checkout_rate: totalFunnel > 0 ? Math.round((orderCount / totalFunnel) * 10000) / 100 : 0,
        checkout_to_payment_rate: orderCount > 0 ? Math.round((paid / orderCount) * 10000) / 100 : 0,
        overall_conversion_rate: totalFunnel > 0 ? Math.round((paid / totalFunnel) * 10000) / 100 : 0,
        recovery_rate: abandonedCount > 0 ? Math.round((recovered / abandonedCount) * 10000) / 100 : 0,
      },
    }
  },
})

// ---------------------------------------------------------------------------
// get_payment_failures — Failed payment analysis
// ---------------------------------------------------------------------------

export const get_payment_failures = tool({
  description:
    'Analyze orders with failed payments. Groups by payment method and failure patterns.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z.number().optional().describe('Period in days (default: 30)'),
  }),
  execute: async ({ store_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, payment_status, payment_method, total_amount, currency, notes, created_at')
      .eq('store_id', store_id)
      .eq('payment_status', 'failed')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return { success: false, error: error.message, failures: [] }
    }

    const failedOrders = data ?? []

    // Group by payment method
    const byMethod: Record<string, number> = {}
    for (const o of failedOrders) {
      const method = (o.payment_method as string) || 'unknown'
      byMethod[method] = (byMethod[method] || 0) + 1
    }

    const totalLostRevenue = failedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

    return {
      success: true,
      period_days: days,
      total_failures: failedOrders.length,
      lost_revenue: Math.round(totalLostRevenue * 100) / 100,
      currency: failedOrders[0]?.currency ?? 'INR',
      by_payment_method: byMethod,
      recent_failures: failedOrders.slice(0, 10).map((o) => ({
        order_number: o.order_number,
        amount: o.total_amount,
        payment_method: o.payment_method,
        notes: o.notes,
        created_at: o.created_at,
      })),
    }
  },
})

// ---------------------------------------------------------------------------
// get_recovery_stats — Cart recovery performance
// ---------------------------------------------------------------------------

export const get_recovery_stats = tool({
  description:
    'Get cart recovery performance — total abandoned, recovered, and recovery rate by email sequence step.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z.number().optional().describe('Period in days (default: 30)'),
  }),
  execute: async ({ store_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('abandoned_carts')
      .select('id, recovery_status, emails_sent, subtotal')
      .eq('store_id', store_id)
      .gte('created_at', since)

    if (error) {
      return { success: false, error: error.message, stats: null }
    }

    const carts = data ?? []
    const total = carts.length
    const recovered = carts.filter((c) => c.recovery_status === 'recovered').length
    const totalValue = carts.reduce((sum, c) => sum + (Number(c.subtotal) || 0), 0)
    const recoveredValue = carts
      .filter((c) => c.recovery_status === 'recovered')
      .reduce((sum, c) => sum + (Number(c.subtotal) || 0), 0)

    // Breakdown by emails_sent stage
    const byStep: Record<string, { total: number; recovered: number }> = {}
    for (const c of carts) {
      const step = String(c.emails_sent ?? 0)
      if (!byStep[step]) byStep[step] = { total: 0, recovered: 0 }
      byStep[step].total++
      if (c.recovery_status === 'recovered') byStep[step].recovered++
    }

    return {
      success: true,
      period_days: days,
      stats: {
        total_abandoned: total,
        recovered,
        recovery_rate: total > 0 ? Math.round((recovered / total) * 10000) / 100 : 0,
        total_abandoned_value: Math.round(totalValue * 100) / 100,
        recovered_value: Math.round(recoveredValue * 100) / 100,
        by_email_step: Object.entries(byStep).map(([step, s]) => ({
          emails_sent: Number(step),
          total: s.total,
          recovered: s.recovered,
          recovery_rate: s.total > 0 ? Math.round((s.recovered / s.total) * 10000) / 100 : 0,
        })),
      },
    }
  },
})
