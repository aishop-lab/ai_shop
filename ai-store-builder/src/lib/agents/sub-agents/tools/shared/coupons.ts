// src/lib/agents/sub-agents/tools/shared/coupons.ts
// Shared coupon query tools — used by deal-engineer, chat-responder, cart-whisperer

import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// get_coupons — List coupons with status
// ---------------------------------------------------------------------------

export const get_coupons = tool({
  description:
    'List coupons for a store with optional active-only filter. ' +
    'Returns coupon details including usage counts and expiry.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    active_only: z.boolean().optional().describe('Only return active coupons (default: true)'),
    limit: z.number().optional().describe('Max coupons to return (default: 50)'),
  }),
  execute: async ({ store_id, active_only = true, limit = 50 }) => {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('coupons')
      .select(
        'id, code, discount_type, discount_value, min_order_amount, max_uses, current_uses, is_active, valid_until, created_at'
      )
      .eq('store_id', store_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (active_only) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message, coupons: [] }
    }

    return { success: true, count: data?.length ?? 0, coupons: data ?? [] }
  },
})

// ---------------------------------------------------------------------------
// get_coupon_performance — Usage stats and revenue impact
// ---------------------------------------------------------------------------

export const get_coupon_performance = tool({
  description:
    'Get performance metrics for coupons — usage rates, revenue impact, and conversion data. ' +
    'Analyzes orders that used each coupon code.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    coupon_id: z.string().optional().describe('Filter to a specific coupon'),
    days: z.number().optional().describe('Analysis period in days (default: 30)'),
  }),
  execute: async ({ store_id, coupon_id, days = 30 }) => {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Get coupons
    let couponQuery = supabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, max_uses, current_uses, is_active, created_at')
      .eq('store_id', store_id)

    if (coupon_id) {
      couponQuery = couponQuery.eq('id', coupon_id)
    }

    const { data: coupons, error } = await couponQuery

    if (error) {
      return { success: false, error: error.message, coupons: [] }
    }

    // Note: orders table does not have a coupon_code column, so we rely on coupons.current_uses
    const performance = (coupons ?? []).map((c) => {
      return {
        coupon_id: c.id,
        code: c.code,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        is_active: c.is_active,
        max_uses: c.max_uses,
        total_uses: c.current_uses ?? 0,
        utilization_pct: c.max_uses ? Math.round(((c.current_uses ?? 0) / c.max_uses) * 100) : null,
      }
    })

    return { success: true, period_days: days, count: performance.length, coupons: performance }
  },
})

// ---------------------------------------------------------------------------
// deactivate_coupon — Set is_active=false
// ---------------------------------------------------------------------------

export const deactivate_coupon = tool({
  description:
    'Deactivate a coupon by setting is_active to false. Use to clean up expired or underperforming promotions.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    coupon_id: z.string().describe('The coupon UUID to deactivate'),
  }),
  execute: async ({ store_id, coupon_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('coupons')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', coupon_id)
      .eq('store_id', store_id)
      .select('id, code, is_active')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, coupon: data, message: `Coupon ${data?.code} deactivated` }
  },
})
