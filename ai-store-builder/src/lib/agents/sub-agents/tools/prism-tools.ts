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

const get_campaign_performance = tool({
  description:
    'Get performance data for a paid advertising campaign. ' +
    'NOTE: Returns placeholder data — actual metrics require Meta Ads API integration.',
  inputSchema: z.object({
    campaign_id: z
      .string()
      .optional()
      .describe('Campaign ID to fetch metrics for (optional — returns overview if omitted)'),
  }),
  execute: async ({ campaign_id }) => {
    return {
      success: true,
      integration_status: 'pending',
      note: 'Meta Ads API integration is not yet configured. Connect your Meta Business account in Settings > Integrations to see live campaign metrics.',
      placeholder_data: {
        campaign_id: campaign_id ?? 'all',
        impressions: null,
        clicks: null,
        spend: null,
        roas: null,
        ctr: null,
        cpc: null,
        conversions: null,
      },
      action_required:
        'Go to Dashboard > Settings > Integrations > Meta Ads and connect your ad account.',
    }
  },
})

export const AD_PILOT_TOOLS = {
  create_ad_campaign_plan,
  get_campaign_performance,
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

const get_search_performance = tool({
  description:
    'Get organic search performance metrics for the store. ' +
    'NOTE: Returns placeholder data — actual metrics require Google Search Console API integration.',
  inputSchema: z.object({
    period: z
      .string()
      .optional()
      .describe('Time period to analyze (e.g. "last_7_days", "last_30_days") — default: last_30_days'),
  }),
  execute: async ({ period = 'last_30_days' }) => {
    return {
      success: true,
      integration_status: 'pending',
      period,
      note: 'Google Search Console API integration is not yet configured. Verify store ownership in Google Search Console and connect via Settings > Integrations.',
      placeholder_data: {
        total_clicks: null,
        total_impressions: null,
        average_ctr: null,
        average_position: null,
        top_queries: null,
        top_pages: null,
        crawl_errors: null,
      },
      action_required:
        'Connect Google Search Console at search.google.com/search-console and add the store URL as a property.',
    }
  },
})

export const SEO_SCOUT_TOOLS = {
  analyze_keywords,
  get_search_performance,
}
