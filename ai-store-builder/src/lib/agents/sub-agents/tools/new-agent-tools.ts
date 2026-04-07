// New Agent Tools — real database-backed tools for previously LLM-only sub-agents
// AI SDK tool syntax using `tool()` from 'ai' + zod parameters

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/encryption'
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

export const DEAL_ENGINEER_TOOLS = { create_coupon }

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

export const CAMPAIGN_ARCHITECT_TOOLS = {}

// ---------------------------------------------------------------------------
// SOCIAL-COMPOSER tools (get products for social content)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Meta Graph API helper for sub-agent publishing tools
// ---------------------------------------------------------------------------

const META_API_BASE = 'https://graph.facebook.com/v22.0'

interface MetaApiErrorBody {
  error: { message: string; type: string; code: number }
}

function isMetaError(body: unknown): body is MetaApiErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as MetaApiErrorBody).error?.message === 'string'
  )
}

/**
 * Retrieve the store's Meta connection: decrypted access token, page ID,
 * page access token, and optional Instagram Business Account ID.
 */
async function getMetaConnection(storeId: string) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('token_encrypted, provider_account_id, metadata')
    .eq('store_id', storeId)
    .eq('provider', 'meta')
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return { connected: false as const, error: 'Meta account not connected. Please connect your Meta Business account in Settings > Connections.' }
  }

  let token: string
  try {
    token = decrypt(data.token_encrypted)
  } catch {
    return { connected: false as const, error: 'Failed to decrypt Meta access token. Please reconnect your Meta account.' }
  }

  const metadata = (data.metadata as Record<string, unknown>) ?? {}
  const pageId = metadata.page_id as string | undefined
  const instagramBusinessId = metadata.instagram_business_id as string | undefined

  if (!pageId) {
    return { connected: false as const, error: 'No Facebook Page linked. Please select a Page in Settings > Connections.' }
  }

  // Exchange user token for page access token
  const pagesRes = await fetch(
    `${META_API_BASE}/me/accounts?access_token=${token}`
  )
  const pagesBody = await pagesRes.json()

  if (isMetaError(pagesBody)) {
    return { connected: false as const, error: `Meta API error: ${pagesBody.error.message}` }
  }

  const pageEntry = (pagesBody.data as Array<{ id: string; access_token: string }> | undefined)?.find(
    (p) => p.id === pageId
  )

  if (!pageEntry) {
    return { connected: false as const, error: 'Cannot access the linked Facebook Page. Please reconnect your Meta account.' }
  }

  return {
    connected: true as const,
    userToken: token,
    pageToken: pageEntry.access_token,
    pageId,
    instagramBusinessId,
  }
}

// ---------------------------------------------------------------------------
// SOCIAL-COMPOSER publishing tools
// ---------------------------------------------------------------------------

const publish_social_post = tool({
  description:
    'Publish a post to Facebook via Meta Graph API. ' +
    'Posts to the merchant\'s connected Facebook Page using /{pageId}/feed for text posts ' +
    'or /{pageId}/photos for image posts. ' +
    'IMPORTANT: This is a high-risk action that publishes publicly — requires merchant approval.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    platform: z
      .enum(['facebook'])
      .describe('Target platform (facebook)'),
    content: z.string().describe('Post text/caption'),
    image_url: z
      .string()
      .optional()
      .describe('Public image URL to include in the post'),
  }),
  execute: async ({ store_id, platform, content, image_url }) => {
    const conn = await getMetaConnection(store_id)
    if (!conn.connected) {
      return { success: false, error: conn.error }
    }

    const postBody = new URLSearchParams({
      message: content,
      access_token: conn.pageToken,
    })

    // Choose endpoint based on whether an image is provided
    let endpoint = `${META_API_BASE}/${conn.pageId}/feed`
    if (image_url) {
      endpoint = `${META_API_BASE}/${conn.pageId}/photos`
      postBody.set('url', image_url)
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      body: postBody,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const body = await res.json()

    if (isMetaError(body)) {
      return {
        success: false,
        error: `Meta API error: ${body.error.message}`,
        error_code: body.error.code,
      }
    }

    const postId = (body as { post_id?: string; id?: string }).post_id || (body as { id: string }).id

    return {
      success: true,
      post_id: postId,
      platform,
      message: `Successfully published ${image_url ? 'photo' : 'text'} post to Facebook`,
      permalink: `https://www.facebook.com/${postId}`,
    }
  },
})

const publish_instagram_post = tool({
  description:
    'Publish a post to Instagram via Meta Graph API. ' +
    'Uses the Instagram Content Publishing API: first creates a media container via ' +
    '/{igUserId}/media, then publishes it via /{igUserId}/media_publish. ' +
    'Requires an image_url (Instagram does not support text-only posts). ' +
    'IMPORTANT: This is a high-risk action that publishes publicly — requires merchant approval.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    caption: z.string().describe('Post caption'),
    image_url: z
      .string()
      .describe(
        'Public image URL for the post (required — Instagram does not support text-only posts)'
      ),
  }),
  execute: async ({ store_id, caption, image_url }) => {
    const conn = await getMetaConnection(store_id)
    if (!conn.connected) {
      return { success: false, error: conn.error }
    }

    if (!conn.instagramBusinessId) {
      return {
        success: false,
        error:
          'No Instagram Business Account linked. Please connect an Instagram Business Account to your Facebook Page in Meta Business Suite, then reconnect in Settings > Connections.',
      }
    }

    // Step 1: Create a media container
    const containerBody = new URLSearchParams({
      image_url,
      caption,
      access_token: conn.pageToken,
    })

    const containerRes = await fetch(
      `${META_API_BASE}/${conn.instagramBusinessId}/media`,
      {
        method: 'POST',
        body: containerBody,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    )
    const containerData = await containerRes.json()

    if (isMetaError(containerData)) {
      return {
        success: false,
        error: `Failed to create Instagram media container: ${containerData.error.message}`,
        error_code: containerData.error.code,
      }
    }

    const creationId = (containerData as { id: string }).id

    // Step 2: Publish the media container
    const publishBody = new URLSearchParams({
      creation_id: creationId,
      access_token: conn.pageToken,
    })

    const publishRes = await fetch(
      `${META_API_BASE}/${conn.instagramBusinessId}/media_publish`,
      {
        method: 'POST',
        body: publishBody,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    )
    const publishData = await publishRes.json()

    if (isMetaError(publishData)) {
      return {
        success: false,
        error: `Failed to publish Instagram post: ${publishData.error.message}`,
        error_code: publishData.error.code,
        container_id: creationId,
      }
    }

    const mediaId = (publishData as { id: string }).id

    return {
      success: true,
      media_id: mediaId,
      container_id: creationId,
      platform: 'instagram',
      message: 'Successfully published photo post to Instagram',
      permalink: `https://www.instagram.com/p/${mediaId}`,
    }
  },
})

export const SOCIAL_COMPOSER_TOOLS = {
  publish_social_post,
  publish_instagram_post,
}

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

// ---------------------------------------------------------------------------
// INFLUENCER-FINDER tools (influencer CRM + outreach)
// ---------------------------------------------------------------------------

/**
 * Get Resend credentials for outreach emails.
 * Tries per-store credentials first, then falls back to platform credentials.
 */
async function getOutreachResendCredentials(storeId: string) {
  const supabase = getSupabaseAdmin()

  try {
    const { data: store } = await supabase
      .from('stores')
      .select(
        'resend_api_key_encrypted, resend_from_email, resend_from_name, resend_credentials_verified, name'
      )
      .eq('id', storeId)
      .single()

    if (store?.resend_credentials_verified && store.resend_api_key_encrypted) {
      const apiKey = decrypt(store.resend_api_key_encrypted)
      return {
        client: new Resend(apiKey),
        fromEmail:
          store.resend_from_email ||
          process.env.RESEND_FROM_EMAIL ||
          'noreply@storeforge.site',
        fromName: store.resend_from_name || store.name || 'Store',
      }
    }
  } catch {
    // Fall through to platform credentials
  }

  const platformKey = process.env.RESEND_API_KEY
  if (!platformKey) return null

  return {
    client: new Resend(platformKey),
    fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@storeforge.site',
    fromName: 'Store',
  }
}

const save_influencer = tool({
  description:
    'Save or update a real influencer contact in the database. Upserts on (store_id, platform, handle).',
  inputSchema: z.object({
    store_id: z.string(),
    handle: z.string().describe('Social handle, e.g. @fashionista_jane'),
    name: z.string().optional(),
    platform: z.enum([
      'instagram',
      'youtube',
      'tiktok',
      'twitter',
      'facebook',
      'other',
    ]),
    tier: z.enum(['nano', 'micro', 'macro', 'mega']).optional(),
    niche: z.string().optional().describe('e.g. fashion, tech, food'),
    followers_count: z.number().int().optional(),
    engagement_rate: z.number().optional().describe('Percentage, e.g. 3.5'),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    profile_url: z.string().url().optional(),
    audience_fit_score: z
      .number()
      .int()
      .min(0)
      .max(100)
      .optional()
      .describe('0-100 score of audience relevance'),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  execute: async ({
    store_id,
    handle,
    name,
    platform,
    tier,
    niche,
    followers_count,
    engagement_rate,
    email,
    phone,
    profile_url,
    audience_fit_score,
    notes,
    tags,
  }) => {
    const supabase = getSupabaseAdmin()

    const record: Record<string, unknown> = {
      store_id,
      handle,
      platform,
    }
    if (name !== undefined) record.name = name
    if (tier !== undefined) record.tier = tier
    if (niche !== undefined) record.niche = niche
    if (followers_count !== undefined) record.followers_count = followers_count
    if (engagement_rate !== undefined) record.engagement_rate = engagement_rate
    if (email !== undefined) record.email = email
    if (phone !== undefined) record.phone = phone
    if (profile_url !== undefined) record.profile_url = profile_url
    if (audience_fit_score !== undefined)
      record.audience_fit_score = audience_fit_score
    if (notes !== undefined) record.notes = notes
    if (tags !== undefined) record.tags = tags

    const { data, error } = await supabase
      .from('influencers')
      .upsert(record, {
        onConflict: 'store_id,platform,handle',
      })
      .select('id, handle, name, platform, tier, status')
      .single()

    if (error) return { success: false, error: error.message }
    return {
      success: true,
      influencer: data,
      message: `Influencer ${handle} saved on ${platform}`,
    }
  },
})

const search_influencers = tool({
  description: 'Search stored influencers with filters.',
  inputSchema: z.object({
    store_id: z.string(),
    platform: z
      .enum(['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'other'])
      .optional(),
    tier: z.enum(['nano', 'micro', 'macro', 'mega']).optional(),
    niche: z.string().optional(),
    status: z
      .enum([
        'prospect',
        'contacted',
        'negotiating',
        'active',
        'declined',
        'inactive',
      ])
      .optional(),
    min_followers: z.number().int().optional(),
    min_engagement_rate: z.number().optional(),
    limit: z.number().int().optional(),
  }),
  execute: async ({
    store_id,
    platform,
    tier,
    niche,
    status,
    min_followers,
    min_engagement_rate,
    limit = 50,
  }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('influencers')
      .select(
        'id, handle, name, platform, tier, niche, followers_count, engagement_rate, email, profile_url, audience_fit_score, status, tags, last_contacted_at, created_at'
      )
      .eq('store_id', store_id)

    if (platform) query = query.eq('platform', platform)
    if (tier) query = query.eq('tier', tier)
    if (niche) query = query.ilike('niche', `%${niche}%`)
    if (status) query = query.eq('status', status)
    if (min_followers) query = query.gte('followers_count', min_followers)
    if (min_engagement_rate)
      query = query.gte('engagement_rate', min_engagement_rate)

    const { data, error } = await query
      .order('audience_fit_score', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) return { success: false, error: error.message, influencers: [] }
    return { success: true, count: data?.length ?? 0, influencers: data ?? [] }
  },
})

const update_influencer_status = tool({
  description: "Update an influencer's pipeline status.",
  inputSchema: z.object({
    store_id: z.string(),
    influencer_id: z.string().describe('UUID of the influencer'),
    status: z.enum([
      'prospect',
      'contacted',
      'negotiating',
      'active',
      'declined',
      'inactive',
    ]),
  }),
  execute: async ({ store_id, influencer_id, status }) => {
    const supabase = getSupabaseAdmin()
    const updateData: Record<string, unknown> = { status }
    if (status === 'contacted') {
      updateData.last_contacted_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('influencers')
      .update(updateData)
      .eq('id', influencer_id)
      .eq('store_id', store_id)
      .select('id, handle, name, platform, status')
      .single()

    if (error) return { success: false, error: error.message }
    return {
      success: true,
      influencer: data,
      message: `Status updated to "${status}"`,
    }
  },
})

const draft_outreach = tool({
  description: 'Create an outreach message draft for an influencer.',
  inputSchema: z.object({
    store_id: z.string(),
    influencer_id: z.string(),
    channel: z.enum(['email', 'dm', 'whatsapp', 'other']),
    subject: z.string().optional().describe('Email subject line'),
    message: z.string().describe('Outreach message body'),
  }),
  execute: async ({ store_id, influencer_id, channel, subject, message }) => {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('influencer_outreach')
      .insert({
        store_id,
        influencer_id,
        channel,
        subject: subject ?? null,
        message,
        status: 'draft',
      })
      .select('id, channel, subject, status, created_at')
      .single()

    if (error) return { success: false, error: error.message }
    return {
      success: true,
      outreach: data,
      message: `Draft outreach created via ${channel}`,
    }
  },
})

const send_outreach = tool({
  description:
    'Send an outreach message. If channel is email, sends via Resend. ' +
    'For dm/whatsapp/other, marks as sent (manual delivery). ' +
    'HIGH-RISK: requires merchant approval.',
  inputSchema: z.object({
    store_id: z.string(),
    outreach_id: z.string().describe('UUID of the outreach draft to send'),
  }),
  execute: async ({ store_id, outreach_id }) => {
    const supabase = getSupabaseAdmin()

    // Fetch the outreach record with influencer details
    const { data: outreach, error: fetchErr } = await supabase
      .from('influencer_outreach')
      .select(
        'id, channel, subject, message, status, influencer_id, influencers(handle, name, email, phone, platform)'
      )
      .eq('id', outreach_id)
      .eq('store_id', store_id)
      .single()

    if (fetchErr || !outreach)
      return { success: false, error: fetchErr?.message || 'Outreach not found' }

    if (outreach.status === 'sent')
      return { success: false, error: 'Outreach already sent' }

    const influencer = outreach.influencers as unknown as {
      handle: string
      name: string | null
      email: string | null
      phone: string | null
      platform: string
    } | null

    // For email channel, actually send via Resend
    if (outreach.channel === 'email') {
      if (!influencer?.email) {
        return {
          success: false,
          error: 'Influencer has no email address. Add an email first.',
        }
      }

      const creds = await getOutreachResendCredentials(store_id)
      if (!creds) {
        return {
          success: false,
          error:
            'No email credentials configured. Set up Resend in Settings > Email or add RESEND_API_KEY.',
        }
      }

      const { error: sendErr } = await creds.client.emails.send({
        from: `${creds.fromName} <${creds.fromEmail}>`,
        to: influencer.email,
        subject: outreach.subject || 'Collaboration Opportunity',
        html: outreach.message.replace(/\n/g, '<br>'),
      })

      if (sendErr) return { success: false, error: String(sendErr) }
    }

    // Mark as sent
    const now = new Date().toISOString()
    const { error: updateErr } = await supabase
      .from('influencer_outreach')
      .update({ status: 'sent', sent_at: now })
      .eq('id', outreach_id)
      .eq('store_id', store_id)

    if (updateErr) return { success: false, error: updateErr.message }

    // Also update influencer status + last_contacted_at
    if (outreach.influencer_id) {
      await supabase
        .from('influencers')
        .update({
          status: 'contacted',
          last_contacted_at: now,
        })
        .eq('id', outreach.influencer_id)
        .eq('store_id', store_id)
    }

    const contactInfo =
      outreach.channel === 'email'
        ? influencer?.email
        : outreach.channel === 'whatsapp'
          ? influencer?.phone || influencer?.handle
          : influencer?.handle

    return {
      success: true,
      message:
        outreach.channel === 'email'
          ? `Email sent to ${influencer?.email}`
          : `Outreach marked as sent via ${outreach.channel} — contact: ${contactInfo} (deliver manually)`,
      sent_at: now,
      contact: contactInfo,
    }
  },
})

const get_outreach_history = tool({
  description: 'Get outreach history, optionally filtered by influencer.',
  inputSchema: z.object({
    store_id: z.string(),
    influencer_id: z.string().optional(),
    limit: z.number().int().optional(),
  }),
  execute: async ({ store_id, influencer_id, limit = 50 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('influencer_outreach')
      .select(
        'id, channel, subject, message, status, sent_at, replied_at, notes, created_at, influencer_id, influencers(handle, name, platform)'
      )
      .eq('store_id', store_id)

    if (influencer_id) query = query.eq('influencer_id', influencer_id)

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return { success: false, error: error.message, outreach: [] }
    return { success: true, count: data?.length ?? 0, outreach: data ?? [] }
  },
})

const get_influencer_stats = tool({
  description:
    'Get summary stats: influencer counts by status, platform, tier, and recent outreach.',
  inputSchema: z.object({
    store_id: z.string(),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data: influencers, error } = await supabase
      .from('influencers')
      .select('id, status, platform, tier')
      .eq('store_id', store_id)

    if (error) return { success: false, error: error.message }

    const all = influencers ?? []
    const byStatus: Record<string, number> = {}
    const byPlatform: Record<string, number> = {}
    const byTier: Record<string, number> = {}

    for (const inf of all) {
      byStatus[inf.status ?? 'prospect'] =
        (byStatus[inf.status ?? 'prospect'] || 0) + 1
      byPlatform[inf.platform] = (byPlatform[inf.platform] || 0) + 1
      if (inf.tier) byTier[inf.tier] = (byTier[inf.tier] || 0) + 1
    }

    // Recent outreach stats (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: outreach } = await supabase
      .from('influencer_outreach')
      .select('status')
      .eq('store_id', store_id)
      .gte('created_at', since)

    const outreachByStatus: Record<string, number> = {}
    for (const o of outreach ?? []) {
      outreachByStatus[o.status ?? 'draft'] =
        (outreachByStatus[o.status ?? 'draft'] || 0) + 1
    }

    return {
      success: true,
      total_influencers: all.length,
      by_status: byStatus,
      by_platform: byPlatform,
      by_tier: byTier,
      outreach_last_30_days: {
        total: (outreach ?? []).length,
        by_status: outreachByStatus,
      },
    }
  },
})

export const INFLUENCER_FINDER_TOOLS = {
  save_influencer,
  search_influencers,
  update_influencer_status,
  draft_outreach,
  send_outreach,
  get_outreach_history,
  get_influencer_stats,
}
