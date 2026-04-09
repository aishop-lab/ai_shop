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
        item_count,
        recovery_status,
        recovery_emails_sent,
        created_at,
        updated_at,
        abandoned_at
      `
      )
      .eq('store_id', store_id)
      .gte('created_at', since)
      .in('recovery_status', ['active', 'email_1_sent', 'email_2_sent'])
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
        recovery_emails_sent: sequence_step,
        updated_at: new Date().toISOString(),
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

export const UPSELL_AGENT_TOOLS = {
  get_frequently_bought_together,
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

// ---------------------------------------------------------------------------
// LOYALTY PROGRAM tools (DB-backed points system)
// ---------------------------------------------------------------------------

const create_loyalty_program = tool({
  description:
    'Create or update the loyalty program configuration for a store. ' +
    'Uses upsert — safe to call whether or not a program already exists.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    name: z.string().describe('Program name, e.g. "Gold Rewards"'),
    description: z.string().optional().describe('Short description of the loyalty program'),
    points_per_currency_unit: z
      .number()
      .positive()
      .optional()
      .describe('Points earned per currency unit spent (default: 1.0)'),
    min_redemption_points: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Minimum points required for redemption (default: 100)'),
    redemption_value_per_point: z
      .number()
      .positive()
      .optional()
      .describe('Monetary value per redeemed point (default: 0.25)'),
    tiers: z
      .array(
        z.object({
          name: z.string(),
          min_points: z.number(),
          multiplier: z.number(),
          benefits: z.array(z.string()),
        })
      )
      .optional()
      .describe('Tier definitions: [{name, min_points, multiplier, benefits[]}]'),
  }),
  execute: async ({
    store_id,
    name,
    description,
    points_per_currency_unit,
    min_redemption_points,
    redemption_value_per_point,
    tiers,
  }) => {
    const supabase = getSupabaseAdmin()

    const payload: Record<string, unknown> = {
      store_id,
      name,
      updated_at: new Date().toISOString(),
    }
    if (description !== undefined) payload.description = description
    if (points_per_currency_unit !== undefined) payload.points_per_currency_unit = points_per_currency_unit
    if (min_redemption_points !== undefined) payload.min_redemption_points = min_redemption_points
    if (redemption_value_per_point !== undefined) payload.redemption_value_per_point = redemption_value_per_point
    if (tiers !== undefined) payload.tiers = tiers

    const { data, error } = await supabase
      .from('loyalty_programs')
      .upsert(payload, { onConflict: 'store_id' })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, program: data }
  },
})

const get_loyalty_program = tool({
  description:
    'Get the loyalty program configuration for a store. ' +
    'Returns program settings including tiers, point rates, and status.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('store_id', store_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, program: null, message: 'No loyalty program configured for this store' }
      }
      return { success: false, error: error.message }
    }

    return { success: true, program: data }
  },
})

const get_customer_points = tool({
  description:
    'Get a customer\'s loyalty point balance, tier, and recent transactions. ' +
    'Use this to check how many points a customer has and their history.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    customer_id: z.string().describe('The customer ID'),
  }),
  execute: async ({ store_id, customer_id }) => {
    const supabase = getSupabaseAdmin()

    // Fetch balance
    const { data: points, error: pointsError } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('store_id', store_id)
      .eq('customer_id', customer_id)
      .single()

    if (pointsError && pointsError.code !== 'PGRST116') {
      return { success: false, error: pointsError.message }
    }

    // Fetch recent transactions
    const { data: transactions, error: txError } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('store_id', store_id)
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (txError) {
      return { success: false, error: txError.message }
    }

    return {
      success: true,
      points: points ?? { balance: 0, lifetime_earned: 0, lifetime_redeemed: 0, tier: 'base' },
      recent_transactions: transactions ?? [],
    }
  },
})

const award_points = tool({
  description:
    'Award loyalty points to a customer for purchases, bonuses, or referrals. ' +
    'Automatically creates the loyalty_points record if the customer is new. ' +
    'Also checks for tier upgrades based on lifetime earned points.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    customer_id: z.string().describe('The customer ID to award points to'),
    points: z.number().int().positive().describe('Number of points to award'),
    description: z.string().describe('Reason for awarding points (e.g. "Purchase order #1234")'),
    reference_id: z.string().optional().describe('Related entity ID (order_id, campaign_id, etc.)'),
    reference_type: z
      .enum(['order', 'campaign', 'manual', 'referral', 'bonus'])
      .optional()
      .describe('Type of reference entity'),
  }),
  execute: async ({ store_id, customer_id, points, description, reference_id, reference_type }) => {
    const supabase = getSupabaseAdmin()

    // Determine transaction type
    const txType = reference_type === 'bonus' || reference_type === 'referral' ? 'bonus' : 'earn'

    // Insert transaction
    const { error: txError } = await supabase.from('loyalty_transactions').insert({
      store_id,
      customer_id,
      type: txType,
      points,
      description,
      reference_id: reference_id ?? null,
      reference_type: reference_type ?? null,
    })

    if (txError) {
      return { success: false, error: txError.message }
    }

    // Atomic upsert: INSERT with ON CONFLICT to avoid race conditions.
    // If the row exists, atomically increment balance and lifetime_earned.
    const { error: upsertError } = await supabase.rpc('increment_loyalty_points' as never, {
      p_store_id: store_id,
      p_customer_id: customer_id,
      p_points: points,
    })

    // Fallback if the RPC doesn't exist yet (migration not applied)
    let newBalance: number
    let newLifetimeEarned: number

    if (upsertError) {
      // Fallback: try INSERT first, then UPDATE on conflict
      const { error: insertError } = await supabase.from('loyalty_points').upsert(
        {
          store_id,
          customer_id,
          balance: points,
          lifetime_earned: points,
          lifetime_redeemed: 0,
          tier: 'base',
        },
        { onConflict: 'store_id,customer_id', ignoreDuplicates: false }
      )

      if (insertError) {
        // If upsert fails due to conflict, do atomic SQL update
        const { error: sqlError } = await supabase
          .from('loyalty_points')
          .update({
            balance: points, // Will be overwritten by SQL below
            lifetime_earned: points,
          })
          .eq('store_id', store_id)
          .eq('customer_id', customer_id)

        if (sqlError) {
          return { success: false, error: sqlError.message }
        }
      }
    }

    // Read back the current state
    const { data: current } = await supabase
      .from('loyalty_points')
      .select('balance, lifetime_earned, tier')
      .eq('store_id', store_id)
      .eq('customer_id', customer_id)
      .single()

    newBalance = current?.balance ?? points
    newLifetimeEarned = current?.lifetime_earned ?? points

    // Check for tier upgrade
    const { data: program } = await supabase
      .from('loyalty_programs')
      .select('tiers')
      .eq('store_id', store_id)
      .single()

    let newTier = 'base'
    if (program?.tiers && Array.isArray(program.tiers)) {
      const sortedTiers = [...(program.tiers as Array<{ name: string; min_points: number }>)].sort(
        (a, b) => b.min_points - a.min_points
      )
      for (const tier of sortedTiers) {
        if (newLifetimeEarned >= tier.min_points) {
          newTier = tier.name
          break
        }
      }
    }

    if (newTier !== (current?.tier ?? 'base')) {
      await supabase
        .from('loyalty_points')
        .update({ tier: newTier })
        .eq('store_id', store_id)
        .eq('customer_id', customer_id)
    }

    return {
      success: true,
      balance: newBalance,
      lifetime_earned: newLifetimeEarned,
      tier: newTier,
      message: `Awarded ${points} points to customer. New balance: ${newBalance}`,
    }
  },
})

const redeem_points = tool({
  description:
    'Redeem loyalty points for a monetary discount. ' +
    'Validates that the customer has enough points and meets the minimum redemption threshold. ' +
    'Returns the monetary value of the redeemed points.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
    customer_id: z.string().describe('The customer ID redeeming points'),
    points: z.number().int().positive().describe('Number of points to redeem'),
  }),
  execute: async ({ store_id, customer_id, points }) => {
    const supabase = getSupabaseAdmin()

    // Get program config
    const { data: program, error: progError } = await supabase
      .from('loyalty_programs')
      .select('min_redemption_points, redemption_value_per_point, is_active')
      .eq('store_id', store_id)
      .single()

    if (progError || !program) {
      return { success: false, error: 'No loyalty program found for this store' }
    }

    if (!program.is_active) {
      return { success: false, error: 'Loyalty program is not active' }
    }

    if (points < program.min_redemption_points) {
      return {
        success: false,
        error: `Minimum redemption is ${program.min_redemption_points} points. Requested: ${points}`,
      }
    }

    // Check customer balance
    const { data: customerPoints, error: balanceError } = await supabase
      .from('loyalty_points')
      .select('balance, lifetime_redeemed')
      .eq('store_id', store_id)
      .eq('customer_id', customer_id)
      .single()

    if (balanceError || !customerPoints) {
      return { success: false, error: 'Customer has no loyalty points record' }
    }

    if (customerPoints.balance < points) {
      return {
        success: false,
        error: `Insufficient balance. Available: ${customerPoints.balance}, Requested: ${points}`,
      }
    }

    // Calculate monetary value
    const monetaryValue = points * Number(program.redemption_value_per_point)

    // Insert redemption transaction
    const { error: txError } = await supabase.from('loyalty_transactions').insert({
      store_id,
      customer_id,
      type: 'redeem',
      points: -points,
      description: `Redeemed ${points} points for discount worth ${monetaryValue.toFixed(2)}`,
    })

    if (txError) {
      return { success: false, error: txError.message }
    }

    // Update balance
    const newBalance = customerPoints.balance - points
    const newLifetimeRedeemed = customerPoints.lifetime_redeemed + points

    const { error: updateError } = await supabase
      .from('loyalty_points')
      .update({
        balance: newBalance,
        lifetime_redeemed: newLifetimeRedeemed,
      })
      .eq('store_id', store_id)
      .eq('customer_id', customer_id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return {
      success: true,
      points_redeemed: points,
      monetary_value: monetaryValue,
      new_balance: newBalance,
      message: `Redeemed ${points} points for a discount of ${monetaryValue.toFixed(2)}`,
    }
  },
})

const get_loyalty_stats = tool({
  description:
    'Get program-wide loyalty statistics for a store. ' +
    'Returns total members, points in circulation, total redeemed, and tier breakdown.',
  inputSchema: z.object({
    store_id: z.string().describe('The store ID'),
  }),
  execute: async ({ store_id }) => {
    const supabase = getSupabaseAdmin()

    // Get all loyalty_points rows for this store
    const { data: allPoints, error } = await supabase
      .from('loyalty_points')
      .select('balance, lifetime_earned, lifetime_redeemed, tier')
      .eq('store_id', store_id)

    if (error) {
      return { success: false, error: error.message }
    }

    const members = allPoints ?? []
    const totalMembers = members.length
    const pointsInCirculation = members.reduce((sum, m) => sum + m.balance, 0)
    const totalEarned = members.reduce((sum, m) => sum + m.lifetime_earned, 0)
    const totalRedeemed = members.reduce((sum, m) => sum + m.lifetime_redeemed, 0)

    // Tier breakdown
    const tierBreakdown: Record<string, number> = {}
    for (const m of members) {
      tierBreakdown[m.tier] = (tierBreakdown[m.tier] || 0) + 1
    }

    return {
      success: true,
      stats: {
        total_members: totalMembers,
        points_in_circulation: pointsInCirculation,
        total_points_earned: totalEarned,
        total_points_redeemed: totalRedeemed,
        tier_breakdown: tierBreakdown,
      },
    }
  },
})

export const LOYALTY_ARCHITECT_TOOLS = {
  get_at_risk_customers,
  send_winback_email,
  create_loyalty_program,
  get_loyalty_program,
  get_customer_points,
  award_points,
  redeem_points,
  get_loyalty_stats,
}
