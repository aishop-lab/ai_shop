// FORGE (Sales) Sub-Agent Tool Definitions
// AI SDK v4/v6 tool syntax using `tool()` from 'ai' + zod parameters

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'

// ---------------------------------------------------------------------------
// CART-WHISPERER tools
// ---------------------------------------------------------------------------

const list_abandoned_carts = tool({
  description:
    'Query the abandoned_carts table for a store and return carts with their items and totals. ' +
    'Use this to identify which customers have abandoned their carts.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID to query abandoned carts for'),
    hours_since_abandonment: z
      .number()
      .optional()
      .describe('Filter carts abandoned in the last N hours (default: 72)'),
    limit: z.number().optional().describe('Maximum number of carts to return (default: 50)'),
  }),
  execute: async ({ store_id, hours_since_abandonment = 72, limit = 50 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - hours_since_abandonment * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('abandoned_carts')
      .select(
        `
        id,
        customer_id,
        email,
        phone,
        items,
        subtotal,
        currency,
        recovery_status,
        emails_sent,
        last_email_sent_at,
        created_at,
        updated_at
      `
      )
      .eq('store_id', store_id)
      .gte('created_at', since)
      .in('recovery_status', ['abandoned', 'email_1_sent', 'email_2_sent'])
      .order('subtotal', { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: error.message, carts: [] }
    }

    return {
      success: true,
      count: data?.length ?? 0,
      carts: data ?? [],
    }
  },
})

const send_recovery_email = tool({
  description:
    'Send a cart recovery email to a customer via Resend. ' +
    'Use this to trigger a recovery message for an abandoned cart.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID (used to look up per-store Resend credentials)'),
    cart_id: z.string().describe('The abandoned cart ID to mark as email sent'),
    to_email: z.string().email().describe('Customer email address'),
    subject: z.string().describe('Email subject line'),
    body_html: z.string().describe('HTML body of the recovery email'),
    sequence_step: z.number().min(1).max(3).describe('Recovery sequence step: 1, 2, or 3'),
  }),
  execute: async ({ store_id, cart_id, to_email, subject, body_html, sequence_step }) => {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@storeforge.site'

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: to_email,
      subject,
      html: body_html,
    })

    if (sendError) {
      return { success: false, error: String(sendError) }
    }

    // Update the cart's recovery status
    const supabase = getSupabaseAdmin()
    const statusMap: Record<number, string> = {
      1: 'email_1_sent',
      2: 'email_2_sent',
      3: 'email_3_sent',
    }

    await supabase
      .from('abandoned_carts')
      .update({
        recovery_status: statusMap[sequence_step] ?? 'email_1_sent',
        emails_sent: sequence_step,
        last_email_sent_at: new Date().toISOString(),
      })
      .eq('id', cart_id)
      .eq('store_id', store_id)

    return { success: true, message: `Recovery email step ${sequence_step} sent to ${to_email}` }
  },
})

export const CART_WHISPERER_TOOLS = {
  list_abandoned_carts,
  send_recovery_email,
}

// ---------------------------------------------------------------------------
// PRICE-STRATEGIST tools
// ---------------------------------------------------------------------------

const get_product_prices = tool({
  description:
    'Query the products table to get current prices, compare_at_prices, and inventory levels. ' +
    'Use this to analyze the current pricing landscape before making recommendations.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    category: z
      .string()
      .optional()
      .describe('Filter by product category (optional)'),
    include_unpublished: z
      .boolean()
      .optional()
      .describe('Include unpublished products (default: false)'),
    limit: z.number().optional().describe('Max products to return (default: 100)'),
  }),
  execute: async ({ store_id, category, include_unpublished = false, limit = 100 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('products')
      .select(
        `
        id,
        title,
        price,
        compare_at_price,
        cost_per_item,
        category,
        inventory_quantity,
        status,
        created_at
      `
      )
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .order('price', { ascending: false })
      .limit(limit)

    if (!include_unpublished) {
      query = query.eq('status', 'active')
    }
    if (category) {
      query = query.ilike('category', `%${category}%`)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, products: [] }
    }

    return {
      success: true,
      count: data?.length ?? 0,
      products: data ?? [],
    }
  },
})

const update_product_price = tool({
  description:
    'Update a product\'s price in the products table. ' +
    'IMPORTANT: This action requires merchant approval — always flag before calling.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    product_id: z.string().describe('The product ID to update'),
    new_price: z.number().positive().describe('The new price to set'),
    new_compare_at_price: z
      .number()
      .positive()
      .optional()
      .describe('The new compare-at (original) price to show as strikethrough'),
    reason: z.string().describe('Brief explanation of why the price is changing'),
  }),
  execute: async ({ store_id, product_id, new_price, new_compare_at_price, reason }) => {
    const supabase = getSupabaseAdmin()

    const updatePayload: Record<string, unknown> = {
      price: new_price,
      updated_at: new Date().toISOString(),
    }
    if (new_compare_at_price !== undefined) {
      updatePayload.compare_at_price = new_compare_at_price
    }

    const { data, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', product_id)
      .eq('store_id', store_id)
      .select('id, title, price, compare_at_price')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      product: data,
      reason,
      message: `Price updated to ${new_price} for product ${data?.title ?? product_id}`,
    }
  },
})

export const PRICE_STRATEGIST_TOOLS = {
  get_product_prices,
  update_product_price,
}

// ---------------------------------------------------------------------------
// UPSELL-AGENT tools
// ---------------------------------------------------------------------------

const get_frequently_bought_together = tool({
  description:
    'Analyze order_items to find products that are commonly purchased in the same order. ' +
    'Returns product pairs ranked by co-purchase frequency.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    product_id: z
      .string()
      .optional()
      .describe('Anchor product ID — find what is often bought WITH this product (optional)'),
    min_frequency: z
      .number()
      .optional()
      .describe('Minimum number of co-purchases to include in results (default: 2)'),
    limit: z.number().optional().describe('Max product pairs to return (default: 20)'),
  }),
  execute: async ({ store_id, product_id, min_frequency = 2, limit = 20 }) => {
    const supabase = getSupabaseAdmin()

    // Fetch recent orders with their items
    const { data: orders, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        order_items (
          product_id,
          title
        )
      `
      )
      .eq('store_id', store_id)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .limit(500)

    if (error) {
      return { success: false, error: error.message, pairs: [] }
    }

    // Build co-purchase frequency map
    const pairCount: Record<string, { count: number; productA: string; productB: string; titleA: string; titleB: string }> = {}

    for (const order of orders ?? []) {
      const items = (order.order_items as Array<{ product_id: string; title: string }>) ?? []
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i]
          const b = items[j]
          if (!a?.product_id || !b?.product_id) continue

          // If filtering by product_id, only include pairs that contain it
          if (product_id && a.product_id !== product_id && b.product_id !== product_id) {
            continue
          }

          const key = [a.product_id, b.product_id].sort().join('::')
          if (!pairCount[key]) {
            pairCount[key] = { count: 0, productA: a.product_id, productB: b.product_id, titleA: a.title, titleB: b.title }
          }
          pairCount[key].count++
        }
      }
    }

    const pairs = Object.values(pairCount)
      .filter((p) => p.count >= min_frequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return { success: true, count: pairs.length, pairs }
  },
})

const get_product_catalog = tool({
  description:
    'List products with their categories, prices, and inventory for recommendation logic. ' +
    'Returns a compact catalog suitable for cross-sell/upsell analysis.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    status: z
      .enum(['active', 'draft', 'archived', 'all'])
      .optional()
      .describe('Filter by product status (default: active)'),
    limit: z.number().optional().describe('Max products to return (default: 200)'),
  }),
  execute: async ({ store_id, status = 'active', limit = 200 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('products')
      .select(
        `
        id,
        title,
        category,
        tags,
        price,
        inventory_quantity,
        status,
        has_variants
      `
      )
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .order('title')
      .limit(limit)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, products: [] }
    }

    return {
      success: true,
      count: data?.length ?? 0,
      products: data ?? [],
    }
  },
})

export const UPSELL_AGENT_TOOLS = {
  get_frequently_bought_together,
  get_product_catalog,
}

// ---------------------------------------------------------------------------
// LOYALTY-ARCHITECT tools
// ---------------------------------------------------------------------------

const get_at_risk_customers = tool({
  description:
    'Query customers who have not placed an order in the past N days but previously had at least one order. ' +
    'Use this to identify customers at risk of churning.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    inactive_days: z
      .number()
      .optional()
      .describe('Number of days without an order to qualify as at-risk (default: 60)'),
    min_previous_orders: z
      .number()
      .optional()
      .describe('Minimum previous orders to include (default: 1)'),
    limit: z.number().optional().describe('Max customers to return (default: 100)'),
  }),
  execute: async ({ store_id, inactive_days = 60, min_previous_orders = 1, limit = 100 }) => {
    const supabase = getSupabaseAdmin()
    const cutoff = new Date(Date.now() - inactive_days * 24 * 60 * 60 * 1000).toISOString()

    // Get customers with their last order date
    const { data, error } = await supabase
      .from('customers')
      .select(
        `
        id,
        name,
        email,
        total_orders,
        total_spent,
        last_order_at,
        created_at
      `
      )
      .eq('store_id', store_id)
      .gte('total_orders', min_previous_orders)
      .lt('last_order_at', cutoff)
      .order('total_spent', { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: error.message, customers: [] }
    }

    return {
      success: true,
      count: data?.length ?? 0,
      cutoff_date: cutoff,
      customers: data ?? [],
    }
  },
})

const send_winback_email = tool({
  description:
    'Send a personalized win-back email to a lapsed customer via Resend. ' +
    'Use this to re-engage customers who have not ordered in a while.',
  inputSchema: z.object({
    to_email: z.string().email().describe('Customer email address'),
    customer_name: z.string().describe('Customer name for personalization'),
    subject: z.string().describe('Email subject line'),
    body_html: z.string().describe('HTML email body with win-back offer'),
    store_name: z.string().describe('Store name for the From display name'),
  }),
  execute: async ({ to_email, customer_name, subject, body_html, store_name }) => {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@storeforge.site'

    const { error } = await resend.emails.send({
      from: `${store_name} <${fromEmail}>`,
      to: to_email,
      subject,
      html: body_html,
    })

    if (error) {
      return { success: false, error: String(error) }
    }

    return {
      success: true,
      message: `Win-back email sent to ${customer_name} at ${to_email}`,
    }
  },
})

export const LOYALTY_ARCHITECT_TOOLS = {
  get_at_risk_customers,
  send_winback_email,
}
