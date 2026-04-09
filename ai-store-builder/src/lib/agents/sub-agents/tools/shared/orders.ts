// src/lib/agents/sub-agents/tools/shared/orders.ts
// Shared order query tools — used by 10+ sub-agents

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_orders — Query orders with flexible filters
// ---------------------------------------------------------------------------

export const get_orders = tool({
  description:
    'Query orders for a store with flexible filters. ' +
    'Supports filtering by status, payment status, customer email, and time period.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    status: z
      .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'all'])
      .optional()
      .describe('Filter by fulfillment status (default: all)'),
    payment_status: z
      .enum(['pending', 'paid', 'failed', 'refunded', 'all'])
      .optional()
      .describe('Filter by payment status (default: all)'),
    customer_email: z.string().optional().describe('Filter by customer email'),
    order_number: z.string().optional().describe('Look up by exact order number (e.g. "ORD-1234")'),
    days: z.number().optional().describe('Only orders from the last N days'),
    limit: z.number().optional().describe('Max orders to return (default: 50)'),
  }),
  execute: async ({ store_id, status, payment_status, customer_email, order_number, days, limit = 50 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('orders')
      .select(
        `id, order_number, order_status, payment_status, payment_method,
         total_amount, customer_email, customer_name,
         created_at, updated_at,
         order_items(id, product_id, title, quantity, price, variant_title)`
      )
      .eq('store_id', store_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status && status !== 'all') {
      query = query.eq('order_status', status)
    }
    if (payment_status && payment_status !== 'all') {
      query = query.eq('payment_status', payment_status)
    }
    if (customer_email) {
      query = query.eq('customer_email', customer_email)
    }
    if (order_number) {
      query = query.eq('order_number', order_number)
    }
    if (days) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', since)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, orders: [] }
    }

    return { success: true, count: data?.length ?? 0, orders: data ?? [] }
  },
})

// ---------------------------------------------------------------------------
// get_order_details — Full details for a single order
// ---------------------------------------------------------------------------

export const get_order_details = tool({
  description:
    'Get complete details for a single order by order_id or order_number. ' +
    'Returns items, payment info, shipping address, and tracking.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    order_id: z.string().optional().describe('The order UUID'),
    order_number: z.string().optional().describe('The order number (e.g. "ORD-1234")'),
  }),
  execute: async ({ store_id, order_id, order_number }) => {
    if (!order_id && !order_number) {
      return { success: false, error: 'Provide either order_id or order_number', order: null }
    }

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('orders')
      .select(
        `id, order_number, order_status, payment_status, payment_method,
         subtotal, total_amount,
         customer_email, customer_name, customer_phone,
         shipping_address, billing_address,
         notes, created_at, updated_at,
         order_items(id, product_id, title, quantity, price, variant_title)`
      )
      .eq('store_id', store_id)

    if (order_id) {
      query = query.eq('id', order_id)
    } else if (order_number) {
      query = query.eq('order_number', order_number)
    }

    const { data, error } = await query.single()

    if (error) {
      return { success: false, error: error.message, order: null }
    }

    return { success: true, order: data }
  },
})

// ---------------------------------------------------------------------------
// get_order_stats — Aggregated order metrics
// ---------------------------------------------------------------------------

export const get_order_stats = tool({
  description:
    'Get aggregated order metrics for a store over a time period. ' +
    'Returns total orders, revenue, AOV, status breakdown, and top-selling products.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z.number().optional().describe('Period in days (default: 30)'),
  }),
  execute: async ({ store_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total_amount, payment_status, order_status, order_items(product_id, title, quantity, price)')
      .eq('store_id', store_id)
      .gte('created_at', since)

    if (error) {
      return { success: false, error: error.message, stats: null }
    }

    const allOrders = orders ?? []
    const paidOrders = allOrders.filter((o) => o.payment_status === 'paid')
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

    // Status breakdown
    const statusCounts: Record<string, number> = {}
    for (const o of allOrders) {
      const st = o.order_status || 'unknown'
      statusCounts[st] = (statusCounts[st] || 0) + 1
    }

    const paymentCounts: Record<string, number> = {}
    for (const o of allOrders) {
      const ps = o.payment_status || 'unknown'
      paymentCounts[ps] = (paymentCounts[ps] || 0) + 1
    }

    // Top products by units sold
    const productMap: Record<string, { title: string; units: number; revenue: number }> = {}
    for (const o of paidOrders) {
      const items = (o.order_items as Array<{ product_id: string; title: string; quantity: number; price: number }>) ?? []
      for (const item of items) {
        if (!item.product_id) continue
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = { title: item.title, units: 0, revenue: 0 }
        }
        productMap[item.product_id].units += item.quantity || 1
        productMap[item.product_id].revenue += (item.price || 0) * (item.quantity || 1)
      }
    }

    const topProducts = Object.entries(productMap)
      .map(([id, s]) => ({ product_id: id, title: s.title, units_sold: s.units, revenue: Math.round(s.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return {
      success: true,
      period_days: days,
      stats: {
        total_orders: allOrders.length,
        paid_orders: paidOrders.length,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        avg_order_value: paidOrders.length > 0 ? Math.round((totalRevenue / paidOrders.length) * 100) / 100 : 0,
        currency: 'INR',
        by_order_status: statusCounts,
        by_payment_status: paymentCounts,
        top_products: topProducts,
      },
    }
  },
})

// ---------------------------------------------------------------------------
// get_revenue_summary — Revenue breakdown by period
// ---------------------------------------------------------------------------

export const get_revenue_summary = tool({
  description:
    'Get revenue breakdown grouped by day, week, or month. ' +
    'Useful for spotting trends, timing campaigns, and reporting.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z.number().optional().describe('Look-back period in days (default: 30)'),
    group_by: z
      .enum(['day', 'week', 'month'])
      .optional()
      .describe('Group revenue by period (default: day)'),
  }),
  execute: async ({ store_id, days = 30, group_by = 'day' }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, payment_status, created_at')
      .eq('store_id', store_id)
      .eq('payment_status', 'paid')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    if (error) {
      return { success: false, error: error.message, summary: [] }
    }

    // Group orders by period
    const buckets: Record<string, { revenue: number; order_count: number }> = {}

    for (const o of orders ?? []) {
      const date = new Date(o.created_at)
      let key: string

      switch (group_by) {
        case 'week': {
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        }
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!buckets[key]) buckets[key] = { revenue: 0, order_count: 0 }
      buckets[key].revenue += Number(o.total_amount) || 0
      buckets[key].order_count++
    }

    const summary = Object.entries(buckets)
      .map(([period, stats]) => ({
        period,
        revenue: Math.round(stats.revenue * 100) / 100,
        order_count: stats.order_count,
        avg_order_value: stats.order_count > 0 ? Math.round((stats.revenue / stats.order_count) * 100) / 100 : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))

    return {
      success: true,
      period_days: days,
      group_by,
      currency: 'INR',
      summary,
    }
  },
})
