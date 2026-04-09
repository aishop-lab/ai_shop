// PRISM (Marketing) Sub-Agent Tool Definitions — Visual/Ad/SEO agents
// AI SDK tool syntax using `tool()` from 'ai' + zod inputSchema

import { tool, generateText } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getFastModel } from '@/lib/ai/provider'
// vertex-imagen uses google-auth-library (Node-only). Must be loaded lazily
// at runtime to avoid pulling node:net into client bundles.
// These tools only execute server-side (inside generateText tool callbacks).
interface LazyVertexImagen {
  isAvailable(): Promise<boolean>
  generateImageFromPrompt(prompt: string, opts?: { aspectRatio?: string }): Promise<{ buffer: Buffer; mimeType: string } | null>
}
let _cachedVertex: LazyVertexImagen | null = null
async function getVertexImagen(): Promise<LazyVertexImagen> {
  if (!_cachedVertex) {
    // webpackIgnore tells webpack/Turbopack to skip bundling this import
    const mod = await import(/* webpackIgnore: true */ '@/lib/ai/vertex-imagen')
    _cachedVertex = mod.vertexImagen as LazyVertexImagen
  }
  return _cachedVertex
}
import {
  listCampaigns as metaListCampaigns,
  getCampaignInsights as metaGetCampaignInsights,
  updateCampaignStatus as metaUpdateCampaignStatus,
  updateCampaignBudget as metaUpdateCampaignBudget,
} from '@/lib/agents/marketing/meta-ads'
import {
  listCampaigns as googleListCampaigns,
  getCampaignInsights as googleGetCampaignInsights,
  updateCampaignStatus as googleUpdateCampaignStatus,
  adjustBudget as googleAdjustBudget,
} from '@/lib/agents/marketing/google-ads'
import { logger } from '@/lib/logger'

const adPilotLog = logger.child({ traceId: `ad-pilot-tools:${Date.now()}` })

// ---------------------------------------------------------------------------
// VISUAL-CRAFTER tools
// ---------------------------------------------------------------------------

const generate_product_image = tool({
  description:
    'Generate a professional product image using AI. ' +
    'Step 1: Uses Gemini to produce a detailed creative brief. ' +
    'Step 2: Calls Vertex AI Imagen 3.0 to render the actual image. ' +
    'Step 3: Optionally uploads to Supabase Storage if store_id is provided.',
  inputSchema: z.object({
    product_title: z.string().describe('Product title to generate imagery for'),
    description: z.string().describe('Product description with key features and materials'),
    style: z
      .string()
      .describe(
        'Visual style direction (e.g. "minimalist white background", "lifestyle outdoor", "luxury dark studio")'
      ),
    store_id: z
      .string()
      .optional()
      .describe('If provided, uploads the generated image to Supabase Storage under this store'),
    product_id: z
      .string()
      .optional()
      .describe('If provided with store_id, creates a product_images record linking the image to this product'),
  }),
  execute: async ({ product_title, description, style, store_id, product_id }) => {
    // ── Step 1: Generate creative brief via Gemini ──────────────────────
    const { text } = await generateText({
      model: getFastModel(),
      prompt: `You are a professional product photographer and creative director.

Create a detailed image generation prompt for a product photo shoot.

Product: ${product_title}
Description: ${description}
Style direction: ${style}

Produce a single JSON object (no markdown fences) with:
{
  "image_prompt": "detailed Imagen-ready prompt string (under 300 words)",
  "composition": "camera angle, framing, depth of field",
  "lighting": "lighting setup description",
  "background": "background description",
  "mood": "overall mood and tone",
  "negative_prompt": "what to avoid in the image",
  "recommended_dimensions": "e.g. 1024x1024 square for product, 1200x628 for banner"
}`,
    })

    let brief: Record<string, unknown>
    try {
      brief = JSON.parse(text.trim())
    } catch {
      brief = { image_prompt: text.trim(), raw: true }
    }

    const imagePrompt = (brief.image_prompt as string) || text.trim()

    // ── Step 2: Generate image via Vertex AI Imagen 3.0 ────────────────
    const vertexImagen = await getVertexImagen()
    const available = await vertexImagen.isAvailable()
    if (!available) {
      return {
        success: true,
        product_title,
        style,
        creative_brief: brief,
        image_generated: false,
        image_url: null,
        note: 'Vertex AI Imagen is not configured (missing GOOGLE_CLOUD_PROJECT_ID or GOOGLE_CLOUD_CREDENTIALS). The creative brief is ready — configure Vertex AI to enable image generation.',
      }
    }

    let imageBuffer: Buffer | null = null
    let imageMimeType = 'image/png'

    try {
      const result = await vertexImagen.generateImageFromPrompt(imagePrompt)
      if (result) {
        imageBuffer = result.buffer
        imageMimeType = result.mimeType
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return {
        success: true,
        product_title,
        style,
        creative_brief: brief,
        image_generated: false,
        image_url: null,
        note: `Imagen 3.0 generation failed: ${errMsg}. The creative brief is still usable.`,
      }
    }

    if (!imageBuffer) {
      return {
        success: true,
        product_title,
        style,
        creative_brief: brief,
        image_generated: false,
        image_url: null,
        note: 'Imagen 3.0 returned no image. The creative brief is still usable.',
      }
    }

    // ── Step 3: Upload to Supabase Storage (if store_id provided) ──────
    let imageUrl: string | null = null
    let productImageRecord: Record<string, unknown> | null = null

    if (store_id) {
      try {
        const supabase = getSupabaseAdmin()
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8)
        const ext = imageMimeType === 'image/jpeg' ? 'jpg' : 'png'
        const storagePath = `products/${store_id}/ai-generated/${timestamp}_${random}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(storagePath, imageBuffer, {
            contentType: imageMimeType,
            cacheControl: '31536000',
            upsert: false,
          })

        if (uploadError) {
          return {
            success: true,
            product_title,
            style,
            creative_brief: brief,
            image_generated: true,
            image_url: null,
            note: `Image generated but upload failed: ${uploadError.message}`,
          }
        }

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(storagePath)
        imageUrl = urlData.publicUrl

        // ── Step 4: Create product_images record (if product_id also provided) ──
        if (product_id) {
          // Determine next position
          const { count } = await supabase
            .from('product_images')
            .select('id', { count: 'exact', head: true })
            .eq('product_id', product_id)

          const position = count ?? 0

          const { data: imgRecord, error: dbError } = await supabase
            .from('product_images')
            .insert({
              product_id,
              original_url: imageUrl,
              thumbnail_url: imageUrl, // AI-generated images are already sized
              position,
              alt_text: `AI-generated image for ${product_title}`,
              is_primary: position === 0,
            })
            .select()
            .single()

          if (dbError) {
            logger.child({ traceId: `visual-crafter:${Date.now()}` }).error(
              'Failed to insert product_images record',
              dbError,
              { store_id, product_id }
            )
          } else {
            productImageRecord = imgRecord as Record<string, unknown>
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        return {
          success: true,
          product_title,
          style,
          creative_brief: brief,
          image_generated: true,
          image_url: null,
          note: `Image generated but storage upload failed: ${errMsg}`,
        }
      }
    }

    return {
      success: true,
      product_title,
      style,
      creative_brief: brief,
      image_generated: true,
      image_url: imageUrl,
      product_image_record: productImageRecord,
      note: imageUrl
        ? `Image generated and uploaded successfully.${productImageRecord ? ' Product image record created.' : ''}`
        : 'Image generated successfully. Provide a store_id to upload to storage.',
    }
  },
})

const get_brand_assets = tool({
  description:
    'Retrieve the store logo URL and brand color palette. ' +
    'Use this before generating any visual asset to anchor to the store brand.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('stores')
      .select('name, logo_url, blueprint')
      .eq('id', store_id)
      .single()

    if (error) {
      return { success: false, error: error.message, assets: null }
    }

    const blueprint = (data?.blueprint as Record<string, unknown>) ?? {}
    const design = (blueprint.design as Record<string, unknown>) ?? {}
    const primaryColor = (design.primaryColor as string) ?? '#000000'
    const brandVibe = (design.vibe as string) ?? 'modern'

    return {
      success: true,
      assets: {
        store_name: data?.name,
        logo_url: data?.logo_url ?? null,
        primary_color: primaryColor,
        brand_vibe: brandVibe,
      },
    }
  },
})

const render_image_from_prompt = tool({
  description:
    'Generate an image directly from a raw text prompt using Vertex AI Imagen 3.0 and upload it to Supabase Storage. ' +
    'Use this for quick image generation without the Gemini creative brief step. ' +
    'Requires a store_id for storage upload.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID — image will be uploaded to this store\'s storage'),
    prompt: z
      .string()
      .describe('The image generation prompt — be descriptive for best results'),
    aspect_ratio: z
      .string()
      .optional()
      .describe('Aspect ratio for the image (default "1:1"). Options: "1:1", "16:9", "9:16", "4:3", "3:4"'),
  }),
  execute: async ({ store_id, prompt, aspect_ratio }) => {
    // Check Imagen availability
    const vertexImagen = await getVertexImagen()
    const available = await vertexImagen.isAvailable()
    if (!available) {
      return {
        success: false,
        image_url: null,
        error: 'Vertex AI Imagen is not configured. Set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_CREDENTIALS environment variables.',
      }
    }

    // Generate image
    let imageBuffer: Buffer
    let imageMimeType: string

    try {
      const result = await vertexImagen.generateImageFromPrompt(prompt, {
        aspectRatio: aspect_ratio || '1:1',
      })

      if (!result) {
        return {
          success: false,
          image_url: null,
          error: 'Imagen 3.0 returned no image. The prompt may have been filtered by safety settings — try rephrasing.',
        }
      }

      imageBuffer = result.buffer
      imageMimeType = result.mimeType
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        image_url: null,
        error: `Imagen 3.0 generation failed: ${errMsg}`,
      }
    }

    // Upload to Supabase Storage
    try {
      const supabase = getSupabaseAdmin()
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const ext = imageMimeType === 'image/jpeg' ? 'jpg' : 'png'
      const storagePath = `products/${store_id}/ai-generated/${timestamp}_${random}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(storagePath, imageBuffer, {
          contentType: imageMimeType,
          cacheControl: '31536000',
          upsert: false,
        })

      if (uploadError) {
        return {
          success: false,
          image_url: null,
          error: `Image generated but upload failed: ${uploadError.message}`,
        }
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath)

      return {
        success: true,
        image_url: urlData.publicUrl,
        mime_type: imageMimeType,
        storage_path: storagePath,
        prompt_used: prompt,
        aspect_ratio: aspect_ratio || '1:1',
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        image_url: null,
        error: `Image generated but storage upload failed: ${errMsg}`,
      }
    }
  },
})

export const VISUAL_CRAFTER_TOOLS = {
  generate_product_image,
  render_image_from_prompt,
  get_brand_assets,
}

// ---------------------------------------------------------------------------
// AD-PILOT tools
// ---------------------------------------------------------------------------

const create_ad_campaign_plan = tool({
  description:
    'Generate a structured paid advertising campaign plan using LLM reasoning. ' +
    'Returns a complete campaign structure with targeting, creatives, and schedule. ' +
    'NOTE: This is a planning tool — no actual Meta or Google Ads API calls are made (integration pending).',
  inputSchema: z.object({
    objective: z
      .string()
      .describe(
        'Campaign objective (e.g. "increase sales", "grow brand awareness", "retarget cart abandoners")'
      ),
    budget: z.number().positive().describe('Total campaign budget in the store currency'),
    target_audience: z
      .string()
      .describe('Target audience description (demographics, interests, behaviors)'),
    duration_days: z.number().int().positive().describe('Campaign duration in days'),
  }),
  execute: async ({ objective, budget, target_audience, duration_days }) => {
    const { text } = await generateText({
      model: getFastModel(),
      prompt: `You are an expert paid advertising strategist specializing in Meta Ads and Google Ads for e-commerce.

Create a comprehensive campaign plan:

Objective: ${objective}
Total budget: ${budget} (store currency)
Target audience: ${target_audience}
Duration: ${duration_days} days

Return a single JSON object (no markdown fences):
{
  "campaign_name": string,
  "platform_split": { "meta_pct": number, "google_pct": number },
  "daily_budget": number,
  "audience": {
    "primary": string,
    "lookalike_source": string,
    "exclusions": string[],
    "interests": string[]
  },
  "ad_sets": [
    {
      "name": string,
      "objective": string,
      "placement": string,
      "creative_format": string,
      "bid_strategy": string,
      "daily_budget_pct": number
    }
  ],
  "creative_direction": string,
  "ab_tests": [{ "element": string, "variant_a": string, "variant_b": string }],
  "kpis": [{ "metric": string, "target": string }],
  "optimization_schedule": string
}`,
    })

    let plan: Record<string, unknown>
    try {
      plan = JSON.parse(text.trim())
    } catch {
      plan = { raw_plan: text.trim(), parse_error: true }
    }

    return {
      success: true,
      campaign_plan: plan,
      note: 'Meta Ads API and Google Ads API integration is pending. This plan is ready for manual setup or future automation.',
    }
  },
})

const get_ad_spend_analysis = tool({
  description:
    'Analyze store order and coupon data to estimate ad spend effectiveness. ' +
    'Calculates revenue, order volume, and coupon-driven conversions to inform ad strategy. ' +
    'NOTE: For live Meta/Google Ads metrics, connect ad accounts in Settings > Integrations.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    days: z
      .number()
      .optional()
      .describe('Number of past days to analyze (default: 30)'),
  }),
  execute: async ({ store_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const [ordersResult, couponsResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total_amount, currency, payment_status, created_at')
        .eq('store_id', store_id)
        .gte('created_at', since),
      supabase
        .from('coupons')
        .select('id, code, discount_type, discount_value, current_uses')
        .eq('store_id', store_id)
        .eq('is_active', true),
    ])

    const orders = ordersResult.data ?? []
    const coupons = couponsResult.data ?? []
    const paidOrders = orders.filter((o) => o.payment_status === 'paid')
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
    const totalCouponUses = coupons.reduce((sum, c) => sum + ((c.current_uses as number) || 0), 0)

    return {
      success: true,
      period_days: days,
      revenue: {
        total: Math.round(totalRevenue * 100) / 100,
        order_count: paidOrders.length,
        avg_order_value: paidOrders.length > 0 ? Math.round((totalRevenue / paidOrders.length) * 100) / 100 : 0,
        currency: orders[0]?.currency ?? 'INR',
      },
      promotions: {
        active_coupons: coupons.length,
        total_coupon_uses: totalCouponUses,
        coupon_codes: coupons.map((c) => ({ code: c.code, uses: c.current_uses })),
      },
      ad_integration_status: {
        meta_ads: (await checkAdPlatformConnection(store_id, 'meta')).connected
          ? 'connected'
          : 'not_connected',
        google_ads: (await checkAdPlatformConnection(store_id, 'google')).connected
          ? 'connected'
          : 'not_connected',
        note: 'Use get_ad_campaigns and get_campaign_performance tools for live campaign metrics when accounts are connected.',
      },
    }
  },
})

// ---------------------------------------------------------------------------
// AD-PILOT: Helper to check if an ad platform is connected for a store
// ---------------------------------------------------------------------------

async function checkAdPlatformConnection(
  storeId: string,
  platform: 'meta' | 'google'
): Promise<{ connected: boolean; accountId?: string }> {
  const supabase = getSupabaseAdmin()
  const provider = platform === 'meta' ? 'meta' : 'google_ads'

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('provider_account_id')
    .eq('store_id', storeId)
    .eq('provider', provider)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return { connected: false }
  }
  return { connected: true, accountId: data.provider_account_id }
}

// ---------------------------------------------------------------------------
// AD-PILOT: Live API tools
// ---------------------------------------------------------------------------

const get_ad_campaigns = tool({
  description:
    'Retrieve active ad campaigns from Meta Ads and/or Google Ads for a store. ' +
    'Returns real campaign data including status, budget, and summary metrics from the live ad platform APIs. ' +
    'Requires the store to have connected the relevant ad account in Settings > Connections.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    platform: z
      .enum(['meta', 'google', 'both'])
      .describe('Which ad platform to query: "meta", "google", or "both"'),
    status_filter: z
      .string()
      .optional()
      .describe(
        'Optional status filter (Meta: ACTIVE, PAUSED; Google: ENABLED, PAUSED). Leave empty for all non-removed campaigns.'
      ),
  }),
  execute: async ({ store_id, platform, status_filter }) => {
    const results: {
      meta?: { connected: boolean; campaigns?: unknown[]; error?: string }
      google?: { connected: boolean; campaigns?: unknown[]; error?: string }
    } = {}

    // --- Meta Ads ---
    if (platform === 'meta' || platform === 'both') {
      const metaConn = await checkAdPlatformConnection(store_id, 'meta')
      if (!metaConn.connected) {
        results.meta = {
          connected: false,
          error: 'Meta Ads account not connected. Connect in Settings > Connections.',
        }
      } else {
        try {
          const campaigns = await metaListCampaigns(store_id, status_filter)
          results.meta = {
            connected: true,
            campaigns: campaigns.map((c) => ({
              id: c.id,
              name: c.name,
              status: c.status,
              objective: c.objective,
              daily_budget: c.dailyBudget,
              lifetime_budget: c.lifetimeBudget ?? null,
              start_time: c.startTime,
              end_time: c.endTime ?? null,
            })),
          }
        } catch (err) {
          adPilotLog.error(
            'Failed to fetch Meta campaigns',
            err instanceof Error ? err : new Error(String(err)),
            { store_id }
          )
          results.meta = {
            connected: true,
            error: err instanceof Error ? err.message : 'Failed to fetch Meta campaigns',
          }
        }
      }
    }

    // --- Google Ads ---
    if (platform === 'google' || platform === 'both') {
      const googleConn = await checkAdPlatformConnection(store_id, 'google')
      if (!googleConn.connected) {
        results.google = {
          connected: false,
          error: 'Google Ads account not connected. Connect in Settings > Connections.',
        }
      } else {
        try {
          const campaigns = await googleListCampaigns(store_id, status_filter)
          results.google = {
            connected: true,
            campaigns: campaigns.map((c) => ({
              id: c.id,
              name: c.name,
              status: c.status,
              type: c.type,
              daily_budget: c.dailyBudget,
              start_date: c.startDate ?? null,
              end_date: c.endDate ?? null,
              metrics: c.insights
                ? {
                    impressions: c.insights.impressions,
                    clicks: c.insights.clicks,
                    cost: c.insights.cost,
                    ctr: c.insights.ctr,
                    conversions: c.insights.conversions,
                    roas: c.insights.roas,
                  }
                : null,
            })),
          }
        } catch (err) {
          adPilotLog.error(
            'Failed to fetch Google Ads campaigns',
            err instanceof Error ? err : new Error(String(err)),
            { store_id }
          )
          results.google = {
            connected: true,
            error: err instanceof Error ? err.message : 'Failed to fetch Google Ads campaigns',
          }
        }
      }
    }

    return { success: true, ...results }
  },
})

const get_campaign_performance = tool({
  description:
    'Get detailed performance insights (impressions, clicks, spend, conversions, ROAS) for a specific campaign ' +
    'from the live Meta Ads or Google Ads API. Requires the store to have the ad platform connected.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    campaign_id: z.string().describe('The campaign ID to get insights for'),
    platform: z
      .enum(['meta', 'google'])
      .describe('Which ad platform the campaign belongs to'),
    date_range: z
      .object({
        start_date: z.string().describe('Start date in YYYY-MM-DD format'),
        end_date: z.string().describe('End date in YYYY-MM-DD format'),
      })
      .optional()
      .describe('Optional date range for insights. Defaults to last 30 days.'),
  }),
  execute: async ({ store_id, campaign_id, platform, date_range }) => {
    const conn = await checkAdPlatformConnection(store_id, platform)
    if (!conn.connected) {
      const platformName = platform === 'meta' ? 'Meta Ads' : 'Google Ads'
      return {
        success: false,
        error: `${platformName} account not connected. Connect in Settings > Connections.`,
      }
    }

    try {
      if (platform === 'meta') {
        const range = date_range
          ? { since: date_range.start_date, until: date_range.end_date }
          : undefined
        const insights = await metaGetCampaignInsights(store_id, campaign_id, range)
        return {
          success: true,
          platform: 'meta',
          campaign_id,
          insights: {
            impressions: insights.impressions,
            clicks: insights.clicks,
            spend: insights.spend,
            ctr: insights.ctr,
            cpc: insights.cpc,
            conversions: insights.conversions,
            roas: insights.roas,
          },
        }
      } else {
        const range = date_range
          ? { startDate: date_range.start_date, endDate: date_range.end_date }
          : undefined
        const insights = await googleGetCampaignInsights(store_id, campaign_id, range)
        return {
          success: true,
          platform: 'google',
          campaign_id,
          insights: {
            impressions: insights.impressions,
            clicks: insights.clicks,
            cost: insights.cost,
            ctr: insights.ctr,
            average_cpc: insights.averageCpc,
            conversions: insights.conversions,
            conversion_value: insights.conversionValue,
            roas: insights.roas,
          },
        }
      }
    } catch (err) {
      adPilotLog.error(
        'Failed to fetch campaign insights',
        err instanceof Error ? err : new Error(String(err)),
        { store_id, campaign_id, platform }
      )
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch campaign insights',
      }
    }
  },
})

const pause_resume_campaign = tool({
  description:
    'Pause or resume an active ad campaign on Meta Ads or Google Ads. ' +
    'This is a HIGH-RISK action that modifies live ad spend — REQUIRES merchant approval before execution.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    campaign_id: z.string().describe('The campaign ID to pause or resume'),
    platform: z
      .enum(['meta', 'google'])
      .describe('Which ad platform the campaign belongs to'),
    action: z
      .enum(['pause', 'resume'])
      .describe('Whether to pause or resume the campaign'),
  }),
  execute: async ({ store_id, campaign_id, platform, action }) => {
    const conn = await checkAdPlatformConnection(store_id, platform)
    if (!conn.connected) {
      const platformName = platform === 'meta' ? 'Meta Ads' : 'Google Ads'
      return {
        success: false,
        error: `${platformName} account not connected. Connect in Settings > Connections.`,
      }
    }

    try {
      let updated: boolean

      if (platform === 'meta') {
        const status = action === 'pause' ? 'PAUSED' : 'ACTIVE'
        updated = await metaUpdateCampaignStatus(store_id, campaign_id, status)
      } else {
        const status = action === 'pause' ? 'PAUSED' : 'ENABLED'
        updated = await googleUpdateCampaignStatus(store_id, campaign_id, status)
      }

      if (!updated) {
        return {
          success: false,
          error: `Failed to ${action} campaign ${campaign_id} on ${platform}. The API did not confirm the change.`,
        }
      }

      return {
        success: true,
        platform,
        campaign_id,
        action,
        new_status: action === 'pause'
          ? (platform === 'meta' ? 'PAUSED' : 'PAUSED')
          : (platform === 'meta' ? 'ACTIVE' : 'ENABLED'),
        message: `Campaign ${campaign_id} has been ${action === 'pause' ? 'paused' : 'resumed'} on ${platform === 'meta' ? 'Meta Ads' : 'Google Ads'}.`,
      }
    } catch (err) {
      adPilotLog.error(
        `Failed to ${action} campaign`,
        err instanceof Error ? err : new Error(String(err)),
        { store_id, campaign_id, platform, action }
      )
      return {
        success: false,
        error: err instanceof Error ? err.message : `Failed to ${action} campaign`,
      }
    }
  },
})

const adjust_campaign_budget = tool({
  description:
    'Adjust the daily budget of an existing ad campaign on Meta Ads or Google Ads. ' +
    'This is a HIGH-RISK action that modifies live ad spend — REQUIRES merchant approval before execution.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    campaign_id: z.string().describe('The campaign ID to adjust budget for'),
    platform: z
      .enum(['meta', 'google'])
      .describe('Which ad platform the campaign belongs to'),
    new_daily_budget: z
      .number()
      .positive()
      .describe(
        'New daily budget amount. For Meta: value in cents (smallest currency unit). For Google: value in the main currency unit (e.g. dollars).'
      ),
  }),
  execute: async ({ store_id, campaign_id, platform, new_daily_budget }) => {
    const conn = await checkAdPlatformConnection(store_id, platform)
    if (!conn.connected) {
      const platformName = platform === 'meta' ? 'Meta Ads' : 'Google Ads'
      return {
        success: false,
        error: `${platformName} account not connected. Connect in Settings > Connections.`,
      }
    }

    try {
      let updated: boolean

      if (platform === 'meta') {
        updated = await metaUpdateCampaignBudget(store_id, campaign_id, new_daily_budget)
      } else {
        updated = await googleAdjustBudget(store_id, campaign_id, new_daily_budget)
      }

      if (!updated) {
        return {
          success: false,
          error: `Failed to adjust budget for campaign ${campaign_id} on ${platform}. The API did not confirm the change.`,
        }
      }

      return {
        success: true,
        platform,
        campaign_id,
        new_daily_budget,
        message: `Daily budget for campaign ${campaign_id} on ${platform === 'meta' ? 'Meta Ads' : 'Google Ads'} updated to ${new_daily_budget}.`,
      }
    } catch (err) {
      adPilotLog.error(
        'Failed to adjust campaign budget',
        err instanceof Error ? err : new Error(String(err)),
        { store_id, campaign_id, platform, new_daily_budget }
      )
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to adjust campaign budget',
      }
    }
  },
})

export const AD_PILOT_TOOLS = {
  create_ad_campaign_plan,
  get_ad_spend_analysis,
  get_ad_campaigns,
  get_campaign_performance,
  pause_resume_campaign,
  adjust_campaign_budget,
}

// ---------------------------------------------------------------------------
// SEO-SCOUT tools
// ---------------------------------------------------------------------------

const analyze_keywords = tool({
  description:
    'Analyze product titles and descriptions to suggest high-value SEO keywords, long-tail variants, and content opportunities. ' +
    'Uses LLM analysis — no external keyword API required.',
  inputSchema: z.object({
    product_titles: z
      .array(z.string())
      .min(1)
      .describe('Array of product titles to analyze for keyword opportunities'),
  }),
  execute: async ({ product_titles }) => {
    const titlesText = product_titles.slice(0, 20).join('\n- ')

    const { text } = await generateText({
      model: getFastModel(),
      prompt: `You are an SEO specialist for Indian e-commerce stores.

Analyze these product titles and generate keyword research:

Products:
- ${titlesText}

Return a single JSON object (no markdown fences):
{
  "primary_keywords": [
    {
      "keyword": string,
      "intent": "informational" | "navigational" | "transactional" | "commercial",
      "difficulty": "low" | "medium" | "high",
      "search_volume_estimate": string,
      "applicable_products": string[]
    }
  ],
  "long_tail_keywords": [
    { "phrase": string, "rationale": string }
  ],
  "content_gaps": string[],
  "meta_title_suggestions": [
    { "product": string, "suggested_meta_title": string }
  ],
  "quick_wins": string[]
}

Focus on Indian market search behavior and buying patterns.`,
    })

    let analysis: Record<string, unknown>
    try {
      analysis = JSON.parse(text.trim())
    } catch {
      analysis = { raw_analysis: text.trim(), parse_error: true }
    }

    return {
      success: true,
      products_analyzed: product_titles.length,
      keyword_analysis: analysis,
    }
  },
})

const audit_product_seo = tool({
  description:
    'Audit all active products for SEO completeness — checks for missing/short meta descriptions, ' +
    'missing SEO titles, short descriptions, and missing alt text on images. ' +
    'Returns a prioritized list of products needing SEO attention.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID to audit'),
    limit: z.number().optional().describe('Max products to audit (default: 100)'),
  }),
  execute: async ({ store_id, limit = 100 }) => {
    const supabase = getSupabaseAdmin()

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        title,
        description,
        meta_description,
        seo_title,
        slug,
        category,
        tags,
        product_images(id, alt_text)
      `)
      .eq('store_id', store_id)
      .eq('status', 'active')
      .eq('is_demo', false)
      .limit(limit)

    if (error) {
      return { success: false, error: error.message, products: [] }
    }

    const audited = (products ?? []).map((p) => {
      const issues: string[] = []
      let score = 100

      // Meta description checks
      if (!p.meta_description) {
        issues.push('missing_meta_description')
        score -= 25
      } else if ((p.meta_description as string).length < 50) {
        issues.push('meta_description_too_short')
        score -= 15
      } else if ((p.meta_description as string).length > 160) {
        issues.push('meta_description_too_long')
        score -= 10
      }

      // SEO title checks
      if (!p.seo_title) {
        issues.push('missing_seo_title')
        score -= 20
      } else if ((p.seo_title as string).length > 60) {
        issues.push('seo_title_too_long')
        score -= 10
      }

      // Description checks
      if (!p.description) {
        issues.push('missing_description')
        score -= 20
      } else if ((p.description as string).length < 100) {
        issues.push('description_too_short')
        score -= 10
      }

      // Alt text checks
      const images = (p.product_images as Array<{ id: string; alt_text: string | null }>) ?? []
      const missingAlt = images.filter((img) => !img.alt_text).length
      if (missingAlt > 0) {
        issues.push(`${missingAlt}_images_missing_alt_text`)
        score -= Math.min(missingAlt * 5, 15)
      }

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        seo_score: Math.max(score, 0),
        issues,
        meta_description_length: ((p.meta_description as string) ?? '').length,
        seo_title_length: ((p.seo_title as string) ?? '').length,
        description_length: ((p.description as string) ?? '').length,
        image_count: images.length,
        images_missing_alt: missingAlt,
      }
    })

    // Sort by worst SEO score first
    audited.sort((a, b) => a.seo_score - b.seo_score)

    const avgScore = audited.length > 0
      ? Math.round(audited.reduce((s, p) => s + p.seo_score, 0) / audited.length)
      : 0

    return {
      success: true,
      total_products: audited.length,
      avg_seo_score: avgScore,
      needs_attention: audited.filter((p) => p.seo_score < 70).length,
      summary: {
        missing_meta_description: audited.filter((p) => p.issues.includes('missing_meta_description')).length,
        missing_seo_title: audited.filter((p) => p.issues.includes('missing_seo_title')).length,
        missing_description: audited.filter((p) => p.issues.includes('missing_description')).length,
        has_alt_text_gaps: audited.filter((p) => p.images_missing_alt > 0).length,
      },
      products: audited,
      search_console_status: {
        connected: false,
        note: 'Connect Google Search Console in Settings > Integrations for live organic search metrics.',
      },
    }
  },
})

export const SEO_SCOUT_TOOLS = {
  analyze_keywords,
  audit_product_seo,
}
