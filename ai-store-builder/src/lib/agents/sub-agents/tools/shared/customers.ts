// src/lib/agents/sub-agents/tools/shared/customers.ts
// Shared customer query tools — used by 8+ sub-agents

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_customers — List customers with segment filters
// ---------------------------------------------------------------------------

export const get_customers = tool({
  description:
    'Query customers for a store with RFM-style segment filters. ' +
    'Supports filtering by activity segment, minimum orders, and spend.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    segment: z
      .enum(['active', 'at_risk', 'churned', 'new', 'all'])
      .optional()
      .describe('Customer segment: active (<30d), at_risk (30-90d), churned (>90d), new (<1 order), all (default: all)'),
    min_orders: z.number().optional().describe('Minimum total orders'),
    min_spent: z.number().optional().describe('Minimum total spent'),
    limit: z.number().optional().describe('Max customers to return (default: 100)'),
  }),
  execute: async ({ store_id, segment = 'all', min_orders, min_spent, limit = 100 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('customers')
      .select('id, name, email, total_orders, total_spent, last_order_at, created_at')
      .eq('store_id', store_id)
      .order('total_spent', { ascending: false })
      .limit(limit)

    if (min_orders) {
      query = query.gte('total_orders', min_orders)
    }
    if (min_spent) {
      query = query.gte('total_spent', min_spent)
    }

    // Segment filters based on last_order_at
    const now = new Date()
    if (segment === 'active') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('last_order_at', cutoff)
    } else if (segment === 'at_risk') {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const end = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('last_order_at', start).lt('last_order_at', end)
    } else if (segment === 'churned') {
      const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
      query = query.lt('last_order_at', cutoff).gte('total_orders', 1)
    } else if (segment === 'new') {
      query = query.lt('total_orders', 1)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, customers: [] }
    }

    return { success: true, count: data?.length ?? 0, customers: data ?? [] }
  },
})

// ---------------------------------------------------------------------------
// get_customer_history — Full history for a single customer
// ---------------------------------------------------------------------------

export const get_customer_history = tool({
  description:
    'Get complete purchase history for a customer by customer_id or email. ' +
    'Returns customer profile, all orders, and computed metrics.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    customer_id: z.string().optional().describe('Customer UUID'),
    customer_email: z.string().optional().describe('Customer email address'),
  }),
  execute: async ({ store_id, customer_id, customer_email }) => {
    if (!customer_id && !customer_email) {
      return { success: false, error: 'Provide either customer_id or customer_email', customer: null }
    }

    const supabase = getSupabaseAdmin()

    // Find the customer
    let customerQuery = supabase
      .from('customers')
      .select('id, name, email, phone, total_orders, total_spent, last_order_at, created_at')
      .eq('store_id', store_id)

    if (customer_id) {
      customerQuery = customerQuery.eq('id', customer_id)
    } else if (customer_email) {
      customerQuery = customerQuery.eq('email', customer_email)
    }

    const { data: customer, error: customerError } = await customerQuery.single()

    if (customerError) {
      return { success: false, error: customerError.message, customer: null }
    }

    // Fetch their orders
    const { data: orders } = await supabase
      .from('orders')
      .select(
        `id, order_number, total_amount, currency, payment_status, fulfillment_status,
         created_at, order_items(title, quantity, price)`
      )
      .eq('store_id', store_id)
      .eq('customer_email', customer?.email)
      .order('created_at', { ascending: false })
      .limit(50)

    const orderList = orders ?? []
    const paidOrders = orderList.filter((o) => o.payment_status === 'paid')

    return {
      success: true,
      customer,
      orders: orderList,
      metrics: {
        total_orders: orderList.length,
        paid_orders: paidOrders.length,
        total_spent: paidOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
        avg_order_value:
          paidOrders.length > 0
            ? Math.round(
                (paidOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) / paidOrders.length) * 100
              ) / 100
            : 0,
        first_order_at: orderList.length > 0 ? orderList[orderList.length - 1].created_at : null,
        last_order_at: orderList.length > 0 ? orderList[0].created_at : null,
      },
    }
  },
})

// ---------------------------------------------------------------------------
// get_customer_segments — Aggregate segment breakdown
// ---------------------------------------------------------------------------

export const get_customer_segments = tool({
  description:
    'Get aggregate customer segment breakdown with counts and average metrics. ' +
    'Segments: active (<30d), at_risk (30-90d), churned (>90d), new (0 orders).',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('customers')
      .select('id, total_orders, total_spent, last_order_at')
      .eq('store_id', store_id)

    if (error) {
      return { success: false, error: error.message, segments: [] }
    }

    const now = Date.now()
    const day30 = 30 * 24 * 60 * 60 * 1000
    const day90 = 90 * 24 * 60 * 60 * 1000

    const segments = {
      active: { count: 0, total_spent: 0, total_orders: 0 },
      at_risk: { count: 0, total_spent: 0, total_orders: 0 },
      churned: { count: 0, total_spent: 0, total_orders: 0 },
      new: { count: 0, total_spent: 0, total_orders: 0 },
    }

    for (const c of data ?? []) {
      const orders = c.total_orders || 0
      const spent = c.total_spent || 0

      if (orders === 0) {
        segments.new.count++
        segments.new.total_spent += spent
        segments.new.total_orders += orders
      } else {
        const lastOrder = c.last_order_at ? now - new Date(c.last_order_at).getTime() : Infinity
        if (lastOrder <= day30) {
          segments.active.count++
          segments.active.total_spent += spent
          segments.active.total_orders += orders
        } else if (lastOrder <= day90) {
          segments.at_risk.count++
          segments.at_risk.total_spent += spent
          segments.at_risk.total_orders += orders
        } else {
          segments.churned.count++
          segments.churned.total_spent += spent
          segments.churned.total_orders += orders
        }
      }
    }

    const result = Object.entries(segments).map(([name, s]) => ({
      segment: name,
      count: s.count,
      avg_spent: s.count > 0 ? Math.round((s.total_spent / s.count) * 100) / 100 : 0,
      avg_orders: s.count > 0 ? Math.round((s.total_orders / s.count) * 10) / 10 : 0,
    }))

    return {
      success: true,
      total_customers: (data ?? []).length,
      segments: result,
    }
  },
})
