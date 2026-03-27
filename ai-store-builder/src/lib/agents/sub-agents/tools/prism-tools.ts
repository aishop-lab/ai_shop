// PRISM (Marketing) Sub-Agent Tool Definitions — Visual/Ad/SEO agents
// AI SDK tool syntax using `tool()` from 'ai' + zod inputSchema

import { tool, generateText } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getFastModel } from '@/lib/ai/provider'

// ---------------------------------------------------------------------------
// VISUAL-CRAFTER tools
// ---------------------------------------------------------------------------

const generate_product_image = tool({
  description:
    'Generate a detailed creative brief and image generation prompt for a product. ' +
    'Uses Gemini to produce a structured visual prompt ready for Vertex AI Imagen. ' +
    'Actual image rendering is handled by the Imagen pipeline.',
  inputSchema: z.object({
    product_title: z.string().describe('Product title to generate imagery for'),
    description: z.string().describe('Product description with key features and materials'),
    style: z
      .string()
      .describe(
        'Visual style direction (e.g. "minimalist white background", "lifestyle outdoor", "luxury dark studio")'
      ),
  }),
  execute: async ({ product_title, description, style }) => {
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

    return {
      success: true,
      product_title,
      style,
      creative_brief: brief,
      note: 'Pass image_prompt to Vertex AI Imagen 3.0 via generateLogo pipeline for actual rendering',
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

export const VISUAL_CRAFTER_TOOLS = {
  generate_product_image,
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
        .select('id, code, discount_type, discount_value, usage_count')
        .eq('store_id', store_id)
        .eq('is_active', true),
    ])

    const orders = ordersResult.data ?? []
    const coupons = couponsResult.data ?? []
    const paidOrders = orders.filter((o) => o.payment_status === 'paid')
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
    const totalCouponUses = coupons.reduce((sum, c) => sum + ((c.usage_count as number) || 0), 0)

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
        coupon_codes: coupons.map((c) => ({ code: c.code, uses: c.usage_count })),
      },
      ad_integration_status: {
        meta_ads: 'not_connected',
        google_ads: 'not_connected',
        note: 'Connect Meta Ads and Google Ads in Settings > Integrations for live campaign metrics.',
      },
    }
  },
})

export const AD_PILOT_TOOLS = {
  create_ad_campaign_plan,
  get_ad_spend_analysis,
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
