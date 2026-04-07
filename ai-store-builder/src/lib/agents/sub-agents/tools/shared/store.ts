// src/lib/agents/sub-agents/tools/shared/store.ts
// Shared store config/policy query tools — used by 8+ sub-agents

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_store_config — Core store settings
// ---------------------------------------------------------------------------

export const get_store_config = tool({
  description:
    'Get core store configuration — name, currency, category, payment methods enabled, checkout settings.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('stores')
      .select('id, name, slug, currency, category, description, blueprint, notification_settings')
      .eq('id', store_id)
      .single()

    if (error) {
      return { success: false, error: error.message, config: null }
    }

    const blueprint = (data?.blueprint as Record<string, unknown>) ?? {}

    return {
      success: true,
      config: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        currency: data.currency,
        category: data.category,
        description: data.description,
        notification_settings: data.notification_settings,
        checkout: blueprint.checkout ?? null,
      },
    }
  },
})

// ---------------------------------------------------------------------------
// get_store_policies — Return, shipping, privacy policies
// ---------------------------------------------------------------------------

export const get_store_policies = tool({
  description:
    'Retrieve store policies including return policy, shipping policy, privacy policy, and terms. ' +
    'Use this to answer customer questions about returns, shipping, and policies.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('stores')
      .select('name, policies, blueprint')
      .eq('id', store_id)
      .single()

    if (error) {
      return { success: false, error: error.message, policies: null }
    }

    return {
      success: true,
      store_name: data?.name,
      policies: data?.policies ?? {},
      shipping_info: (data?.blueprint as Record<string, unknown>)?.shipping ?? null,
    }
  },
})

// ---------------------------------------------------------------------------
// get_brand_guidelines — Brand vibe, colors, logo
// ---------------------------------------------------------------------------

export const get_brand_guidelines = tool({
  description:
    'Get brand guidelines — vibe, primary/secondary colors, logo URL, description, and category. ' +
    'Use this to ensure content matches the store brand.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('stores')
      .select('name, category, description, logo_url, blueprint')
      .eq('id', store_id)
      .single()

    if (error) {
      return { success: false, error: error.message, brand: null }
    }

    const blueprint = (data?.blueprint as Record<string, unknown>) ?? {}
    const design = (blueprint.design as Record<string, unknown>) ?? {}

    return {
      success: true,
      brand: {
        store_name: data.name,
        category: data.category,
        description: data.description,
        logo_url: data.logo_url,
        brand_vibe: (design.vibe as string) ?? 'modern',
        primary_color: (design.primaryColor as string) ?? '#000000',
        secondary_color: (design.secondaryColor as string) ?? null,
        font: (design.font as string) ?? null,
      },
    }
  },
})

// ---------------------------------------------------------------------------
// get_shipping_config — Configured shipping providers
// ---------------------------------------------------------------------------

export const get_shipping_config = tool({
  description:
    'Get configured shipping providers and methods for a store. ' +
    'Returns which providers are active and what options are available.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('stores')
      .select('name, shipping_providers, blueprint')
      .eq('id', store_id)
      .single()

    if (error) {
      return { success: false, error: error.message, providers: [] }
    }

    const providers = (data?.shipping_providers as Array<Record<string, unknown>>) ?? []
    const blueprint = (data?.blueprint as Record<string, unknown>) ?? {}
    const shippingConfig = (blueprint.shipping as Record<string, unknown>) ?? {}

    const formattedProviders = providers.map((p) => ({
      type: p.type,
      name: p.name || p.type,
      is_configured: !!(p.credentials || p.is_configured),
      is_default: p.is_default ?? false,
    }))

    return {
      success: true,
      store_name: data?.name,
      providers: formattedProviders,
      shipping_settings: shippingConfig,
      has_any_provider: formattedProviders.some((p) => p.is_configured),
    }
  },
})
