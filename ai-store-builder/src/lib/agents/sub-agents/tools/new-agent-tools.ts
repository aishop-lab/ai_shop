// New Agent Tools — real database-backed tools for previously LLM-only sub-agents
// AI SDK tool syntax using `tool()` from 'ai' + zod parameters

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'

// ---------------------------------------------------------------------------
// DEAL-ENGINEER tools (coupon CRUD)
// ---------------------------------------------------------------------------

const create_coupon = tool({
  description: 'Create a coupon/discount code in the coupons table for a store.',
  inputSchema: z.object({
    store_id: z.string(),
    code: z.string().describe('Coupon code (e.g. SUMMER20)'),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.number().positive(),
    min_order_amount: z.number().optional(),
    max_uses: z.number().optional(),
    expires_at: z.string().optional().describe('ISO date string for expiry'),
  }),
  execute: async ({
    store_id,
    code,
    discount_type,
    discount_value,
    min_order_amount,
    max_uses,
    expires_at,
  }) => {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        store_id,
        code: code.toUpperCase(),
        discount_type,
        discount_value,
        min_order_amount: min_order_amount ?? 0,
        max_uses: max_uses ?? null,
        expires_at: expires_at ?? null,
        is_active: true,
      })
      .select('id, code, discount_type, discount_value')
      .single()
    if (error) return { success: false, error: error.message }
    return {
      success: true,
      coupon: data,
      message: `Coupon ${code.toUpperCase()} created`,
    }
  },
})

const get_active_coupons = tool({
  description: 'List active coupons for a store.',
  inputSchema: z.object({
    store_id: z.string(),
    limit: z.number().optional(),
  }),
  execute: async ({ store_id, limit = 50 }) => {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('coupons')
      .select(
        'id, code, discount_type, discount_value, min_order_amount, max_uses, uses_count, is_active, expires_at, created_at'
      )
      .eq('store_id', store_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return { success: false, error: error.message, coupons: [] }
    return { success: true, count: data?.length ?? 0, coupons: data ?? [] }
  },
})

export const DEAL_ENGINEER_TOOLS = { create_coupon, get_active_coupons }

// ---------------------------------------------------------------------------
// CHECKOUT-DOCTOR tools (checkout funnel analysis)
// ---------------------------------------------------------------------------

const get_checkout_funnel = tool({
  description:
    'Analyze checkout funnel data — cart creation, checkout starts, payment attempts, completions.',
  inputSchema: z.object({
    store_id: z.string(),
    days: z.number().optional().describe('Past N days, default 30'),
  }),
  execute: async ({ store_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString()

    // Get abandoned carts as funnel top
    const { count: cartCount } = await supabase
      .from('abandoned_carts')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store_id)
      .gte('created_at', since)

    // Get orders (completed checkouts)
    const { data: orders, count: orderCount } = await supabase
      .from('orders')
      .select('payment_status, fulfillment_status', { count: 'exact' })
      .eq('store_id', store_id)
      .gte('created_at', since)

    const paid = (orders ?? []).filter(
      (o) => o.payment_status === 'paid'
    ).length
    const failed = (orders ?? []).filter(
      (o) => o.payment_status === 'failed'
    ).length
    const totalFunnel = (cartCount ?? 0) + (orderCount ?? 0)

    return {
      success: true,
      period_days: days,
      funnel: {
        carts_created: totalFunnel,
        abandoned: cartCount ?? 0,
        checkout_completed: orderCount ?? 0,
        payments_successful: paid,
        payments_failed: failed,
        conversion_rate:
          totalFunnel > 0
            ? Math.round((paid / totalFunnel) * 10000) / 100
            : 0,
      },
    }
  },
})

export const CHECKOUT_DOCTOR_TOOLS = { get_checkout_funnel }

// ---------------------------------------------------------------------------
// LEAD-SCORER tools (customer scoring by RFM)
// ---------------------------------------------------------------------------

const score_customers = tool({
  description:
    'Score customers by engagement, purchase frequency, and recency. Returns scored customer list.',
  inputSchema: z.object({
    store_id: z.string(),
    limit: z.number().optional(),
  }),
  execute: async ({ store_id, limit = 100 }) => {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('customers')
      .select(
        'id, name, email, total_orders, total_spent, last_order_at, created_at'
      )
      .eq('store_id', store_id)
      .order('total_spent', { ascending: false })
      .limit(limit)

    if (error) return { success: false, error: error.message }

    const now = Date.now()
    const scored = (data ?? [])
      .map((c) => {
        const daysSinceLastOrder = c.last_order_at
          ? Math.floor(
              (now - new Date(c.last_order_at).getTime()) / 86400000
            )
          : 999
        const recencyScore =
          daysSinceLastOrder <= 7
            ? 30
            : daysSinceLastOrder <= 30
              ? 20
              : daysSinceLastOrder <= 90
                ? 10
                : 0
        const frequencyScore = Math.min((c.total_orders || 0) * 10, 30)
        const monetaryScore = Math.min(
          Math.floor((c.total_spent || 0) / 100) * 5,
          40
        )
        const totalScore = recencyScore + frequencyScore + monetaryScore
        const tier =
          totalScore >= 70
            ? 'hot'
            : totalScore >= 40
              ? 'warm'
              : totalScore >= 20
                ? 'cool'
                : 'cold'
        return {
          ...c,
          score: totalScore,
          tier,
          recencyScore,
          frequencyScore,
          monetaryScore,
          daysSinceLastOrder,
        }
      })
      .sort((a, b) => b.score - a.score)

    return { success: true, count: scored.length, customers: scored }
  },
})

export const LEAD_SCORER_TOOLS = { score_customers }

// ---------------------------------------------------------------------------
// FAQ-BUILDER tools (identify common support patterns)
// ---------------------------------------------------------------------------

const get_common_queries = tool({
  description:
    'Analyze recent agent actions and orders to identify common customer questions and build FAQ suggestions.',
  inputSchema: z.object({
    store_id: z.string(),
    days: z.number().optional(),
  }),
  execute: async ({ store_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString()

    // Get recent support actions
    const { data: actions } = await supabase
      .from('agent_actions')
      .select('action_type, summary, details')
      .eq('store_id', store_id)
      .eq('agent_type', 'support')
      .gte('started_at', since)
      .limit(200)

    // Get return/refund orders
    const { count: returnCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store_id)
      .in('fulfillment_status', ['returned', 'refund_initiated', 'refunded'])
      .gte('created_at', since)

    // Get pending reviews
    const { count: unrepliedReviews } = await supabase
      .from('product_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store_id)
      .is('merchant_reply', null)

    // Get store policies
    const { data: store } = await supabase
      .from('stores')
      .select('policies')
      .eq('id', store_id)
      .single()

    return {
      success: true,
      period_days: days,
      support_volume: actions?.length ?? 0,
      returns_refunds: returnCount ?? 0,
      unreplied_reviews: unrepliedReviews ?? 0,
      has_policies: !!store?.policies,
      action_types: [
        ...new Set((actions ?? []).map((a) => a.action_type)),
      ],
      suggested_faq_topics: [
        'Order tracking and delivery status',
        'Return and refund policy',
        'Payment methods and issues',
        'Product availability and restocking',
        'Shipping times and costs',
        'Coupon and discount codes',
      ],
    }
  },
})

export const FAQ_BUILDER_TOOLS = { get_common_queries }

// ---------------------------------------------------------------------------
// ESCALATION-DETECTOR tools (monitor negative signals)
// ---------------------------------------------------------------------------

const get_negative_signals = tool({
  description:
    'Query recent negative reviews, failed orders, and refund requests to identify escalation risks.',
  inputSchema: z.object({
    store_id: z.string(),
    days: z.number().optional(),
  }),
  execute: async ({ store_id, days = 7 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString()

    // Low-rating reviews
    const { data: badReviews } = await supabase
      .from('product_reviews')
      .select(
        'id, customer_name, rating, title, body, created_at, products(title)'
      )
      .eq('store_id', store_id)
      .lte('rating', 2)
      .gte('created_at', since)
      .order('rating', { ascending: true })
      .limit(20)

    // Failed/cancelled orders
    const { data: problemOrders } = await supabase
      .from('orders')
      .select(
        'id, order_number, fulfillment_status, payment_status, total_amount, customer_email, created_at'
      )
      .eq('store_id', store_id)
      .gte('created_at', since)
      .in('fulfillment_status', ['cancelled', 'refund_initiated', 'returned'])
      .limit(20)

    // Multiple abandoned carts from same customer (frustrated)
    const { data: repeatAbandons } = await supabase
      .from('abandoned_carts')
      .select('email, id')
      .eq('store_id', store_id)
      .gte('created_at', since)

    const emailCounts: Record<string, number> = {}
    for (const cart of repeatAbandons ?? []) {
      if (cart.email)
        emailCounts[cart.email] = (emailCounts[cart.email] || 0) + 1
    }
    const repeaters = Object.entries(emailCounts)
      .filter(([, c]) => c >= 2)
      .map(([email, count]) => ({ email, abandonments: count }))

    const escalationRisk =
      (badReviews?.length ?? 0) > 3 || (problemOrders?.length ?? 0) > 5
        ? 'high'
        : (badReviews?.length ?? 0) > 0 || (problemOrders?.length ?? 0) > 0
          ? 'medium'
          : 'low'

    return {
      success: true,
      period_days: days,
      escalation_risk: escalationRisk,
      negative_reviews: badReviews ?? [],
      problem_orders: problemOrders ?? [],
      repeat_abandoners: repeaters,
      summary: {
        bad_reviews: badReviews?.length ?? 0,
        problem_orders: problemOrders?.length ?? 0,
        repeat_abandoners: repeaters.length,
      },
    }
  },
})

export const ESCALATION_DETECTOR_TOOLS = { get_negative_signals }

// ---------------------------------------------------------------------------
// COMPETITOR-WATCHER tools (competitive positioning analysis)
// ---------------------------------------------------------------------------

const get_market_position = tool({
  description:
    "Analyze the store's product pricing, categories, and inventory to assess competitive positioning.",
  inputSchema: z.object({
    store_id: z.string(),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()
    const { data: products } = await supabase
      .from('products')
      .select('price, compare_at_price, category, inventory_quantity, status')
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .eq('status', 'active')

    if (!products?.length)
      return { success: true, message: 'No active products to analyze' }

    const prices = products
      .map((p) => p.price)
      .filter(Boolean) as number[]
    const categories = [
      ...new Set(products.map((p) => p.category).filter(Boolean)),
    ]
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    const onSale = products.filter(
      (p) => p.compare_at_price && p.compare_at_price > p.price
    ).length
    const lowStock = products.filter(
      (p) => (p.inventory_quantity ?? 0) < 5
    ).length

    return {
      success: true,
      analysis: {
        total_products: products.length,
        categories: categories.length,
        category_list: categories,
        pricing: {
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: Math.round(avgPrice * 100) / 100,
          median:
            prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
        },
        on_sale_count: onSale,
        on_sale_pct: Math.round((onSale / products.length) * 100),
        low_stock_count: lowStock,
        low_stock_pct: Math.round((lowStock / products.length) * 100),
      },
    }
  },
})

export const COMPETITOR_WATCHER_TOOLS = { get_market_position }

// ---------------------------------------------------------------------------
// REPORT-WRITER tools (pull data + send email reports)
// ---------------------------------------------------------------------------

const get_report_data = tool({
  description:
    'Pull comprehensive store data for generating reports — revenue, orders, customers, products, agent activity.',
  inputSchema: z.object({
    store_id: z.string(),
    days: z
      .number()
      .optional()
      .describe('Report period in days, default 7'),
  }),
  execute: async ({ store_id, days = 7 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString()
    const prevSince = new Date(
      Date.now() - days * 2 * 24 * 60 * 60 * 1000
    ).toISOString()

    // Current period
    const { data: currentOrders } = await supabase
      .from('orders')
      .select('total_amount, payment_status, created_at')
      .eq('store_id', store_id)
      .gte('created_at', since)

    const { data: prevOrders } = await supabase
      .from('orders')
      .select('total_amount, payment_status, created_at')
      .eq('store_id', store_id)
      .gte('created_at', prevSince)
      .lt('created_at', since)

    const { count: newCustomers } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store_id)
      .gte('created_at', since)

    const { count: agentActions } = await supabase
      .from('agent_actions')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store_id)
      .gte('started_at', since)

    const currentRevenue = (currentOrders ?? [])
      .filter((o) => o.payment_status === 'paid')
      .reduce((s, o) => s + (o.total_amount || 0), 0)
    const prevRevenue = (prevOrders ?? [])
      .filter((o) => o.payment_status === 'paid')
      .reduce((s, o) => s + (o.total_amount || 0), 0)

    return {
      success: true,
      period_days: days,
      current: {
        revenue: currentRevenue,
        orders: currentOrders?.length ?? 0,
        new_customers: newCustomers ?? 0,
        agent_actions: agentActions ?? 0,
      },
      previous: {
        revenue: prevRevenue,
        orders: prevOrders?.length ?? 0,
      },
      growth: {
        revenue_pct:
          prevRevenue > 0
            ? Math.round(
                ((currentRevenue - prevRevenue) / prevRevenue) * 100
              )
            : null,
        orders_pct:
          (prevOrders?.length ?? 0) > 0
            ? Math.round(
                (((currentOrders?.length ?? 0) -
                  (prevOrders?.length ?? 0)) /
                  (prevOrders?.length ?? 1)) *
                  100
              )
            : null,
      },
    }
  },
})

const send_report_email = tool({
  description:
    'Send a formatted report email to the store owner via Resend.',
  inputSchema: z.object({
    to_email: z.string().email(),
    store_name: z.string(),
    subject: z.string(),
    body_html: z.string(),
  }),
  execute: async ({ to_email, store_name, subject, body_html }) => {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || 'noreply@storeforge.site'
    const { error } = await resend.emails.send({
      from: `${store_name} Reports <${fromEmail}>`,
      to: to_email,
      subject,
      html: body_html,
    })
    if (error) return { success: false, error: String(error) }
    return { success: true, message: `Report sent to ${to_email}` }
  },
})

export const REPORT_WRITER_TOOLS = { get_report_data, send_report_email }

// ---------------------------------------------------------------------------
// CAMPAIGN-ARCHITECT tools (analytics for campaign planning)
// ---------------------------------------------------------------------------

const get_store_analytics_summary = tool({
  description:
    'Get a summary of store performance data to inform campaign planning.',
  inputSchema: z.object({
    store_id: z.string(),
    days: z.number().optional(),
  }),
  execute: async ({ store_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, payment_status, created_at')
      .eq('store_id', store_id)
      .gte('created_at', since)

    const { data: products } = await supabase
      .from('products')
      .select('id, title, category, price, status')
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .eq('status', 'active')

    const { count: customerCount } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store_id)

    const revenue = (orders ?? [])
      .filter((o) => o.payment_status === 'paid')
      .reduce((s, o) => s + (o.total_amount || 0), 0)

    const categories = [
      ...new Set((products ?? []).map((p) => p.category).filter(Boolean)),
    ]

    return {
      success: true,
      period_days: days,
      summary: {
        revenue,
        order_count: orders?.length ?? 0,
        product_count: products?.length ?? 0,
        customer_count: customerCount ?? 0,
        categories,
        avg_order_value:
          (orders?.length ?? 0) > 0
            ? Math.round(revenue / (orders?.length ?? 1))
            : 0,
      },
    }
  },
})

export const CAMPAIGN_ARCHITECT_TOOLS = { get_store_analytics_summary }

// ---------------------------------------------------------------------------
// SOCIAL-COMPOSER tools (get products for social content)
// ---------------------------------------------------------------------------

const get_trending_products = tool({
  description:
    'Get top-selling and newest products to create social media content about.',
  inputSchema: z.object({
    store_id: z.string(),
    limit: z.number().optional(),
  }),
  execute: async ({ store_id, limit = 10 }) => {
    const supabase = getSupabaseAdmin()

    // Best sellers by order count
    const { data: topItems } = await supabase
      .from('order_items')
      .select('product_id, title, quantity')
      .limit(500)

    // Get products with images
    const { data: products } = await supabase
      .from('products')
      .select(
        'id, title, description, price, category, product_images(original_url, alt_text)'
      )
      .eq('store_id', store_id)
      .eq('status', 'active')
      .eq('is_demo', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    return {
      success: true,
      products: products ?? [],
      trending_note:
        'Sorted by recency — use with sales data for content prioritization',
    }
  },
})

export const SOCIAL_COMPOSER_TOOLS = { get_trending_products }

// ---------------------------------------------------------------------------
// COPYSMITH tools (find + update product descriptions)
// ---------------------------------------------------------------------------

const get_products_needing_copy = tool({
  description:
    'Find products with short or missing descriptions that need copy improvement.',
  inputSchema: z.object({
    store_id: z.string(),
    limit: z.number().optional(),
  }),
  execute: async ({ store_id, limit = 50 }) => {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('products')
      .select('id, title, description, category, tags, price')
      .eq('store_id', store_id)
      .eq('is_demo', false)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return { success: false, error: error.message }

    const needsCopy = (data ?? []).filter(
      (p) => !p.description || (p.description as string).length < 100
    )

    return {
      success: true,
      total_products: data?.length ?? 0,
      needs_copy: needsCopy.length,
      products: needsCopy,
    }
  },
})

const update_product_description = tool({
  description:
    'Update a product description with new AI-generated copy.',
  inputSchema: z.object({
    store_id: z.string(),
    product_id: z.string(),
    description: z.string(),
  }),
  execute: async ({ store_id, product_id, description }) => {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('products')
      .update({ description, updated_at: new Date().toISOString() })
      .eq('id', product_id)
      .eq('store_id', store_id)
      .select('id, title')
      .single()

    if (error) return { success: false, error: error.message }
    return {
      success: true,
      product: data,
      message: `Description updated for ${data?.title}`,
    }
  },
})

export const COPYSMITH_TOOLS = {
  get_products_needing_copy,
  update_product_description,
}
