// src/lib/billing/index.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type Stripe from 'stripe'

// =============================================================================
// Types
// =============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'business'
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'

export interface MerchantSubscription {
  id: string
  storeId: string
  tierId: SubscriptionTier
  status: SubscriptionStatus
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export interface TierLimits {
  maxProducts: number | null
  maxAgentActionsPerDay: number | null
  llmBudgetUsd: number
  features: string[]
}

// Helper to safely extract error message from Supabase PostgrestError
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: string }).message)
  return String(error)
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(getErrorMessage(error))
}

// =============================================================================
// Tier Limits Cache (5-min TTL, same pattern as payment/stripe.ts)
// =============================================================================

const tierLimitsCache: Map<string, { limits: TierLimits; timestamp: number }> = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// =============================================================================
// Subscription Queries
// =============================================================================

/**
 * Get the current subscription for a store
 */
export async function getSubscription(storeId: string): Promise<MerchantSubscription | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('merchant_subscriptions')
    .select('*')
    .eq('store_id', storeId)
    .single()

  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).code === 'PGRST116') {
      // No subscription found — not an error for free tier stores
      return null
    }
    logger.error('Failed to fetch subscription', toError(error), { storeId })
    return null
  }

  return {
    id: data.id,
    storeId: data.store_id,
    tierId: data.tier_id as SubscriptionTier,
    status: data.status as SubscriptionStatus,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  }
}

/**
 * Get limits and features for a subscription tier
 */
export async function getTierLimits(tierId: SubscriptionTier): Promise<TierLimits> {
  // Check cache
  const cached = tierLimitsCache.get(tierId)
  const now = Date.now()
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.limits
  }

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('max_products, max_agent_actions_per_day, llm_budget_usd, features')
    .eq('id', tierId)
    .single()

  if (error || !data) {
    logger.error('Failed to fetch tier limits', toError(error ?? new Error('No data')), { tierId })
    // Return safe defaults (free tier)
    return { maxProducts: 50, maxAgentActionsPerDay: 5, llmBudgetUsd: 2.0, features: [] }
  }

  const limits: TierLimits = {
    maxProducts: data.max_products,
    maxAgentActionsPerDay: data.max_agent_actions_per_day,
    llmBudgetUsd: Number(data.llm_budget_usd),
    features: data.features as string[],
  }

  // Cache the result
  tierLimitsCache.set(tierId, { limits, timestamp: now })

  return limits
}

// =============================================================================
// Usage Tracking
// =============================================================================

/**
 * Check if a store can perform another agent action today
 */
export async function checkActionLimit(storeId: string): Promise<{
  allowed: boolean
  remaining: number | null
  limit: number | null
}> {
  // Determine the store's tier
  const supabase = getSupabaseAdmin()
  const { data: store } = await supabase
    .from('stores')
    .select('subscription_tier')
    .eq('id', storeId)
    .single()

  const tierId = (store?.subscription_tier ?? 'free') as SubscriptionTier
  const limits = await getTierLimits(tierId)

  // Unlimited actions
  if (limits.maxAgentActionsPerDay === null) {
    return { allowed: true, remaining: null, limit: null }
  }

  const usage = await getDailyUsage(storeId)
  const remaining = Math.max(0, limits.maxAgentActionsPerDay - usage.actionsCount)

  return {
    allowed: remaining > 0,
    remaining,
    limit: limits.maxAgentActionsPerDay,
  }
}

/**
 * Increment daily usage counters for a store.
 * Upserts a row in subscription_usage for today's date.
 */
export async function incrementDailyUsage(
  storeId: string,
  tokens: { input: number; output: number; costUsd: number }
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  // Try to get existing row for today
  const { data: existing } = await supabase
    .from('subscription_usage')
    .select('id, agent_actions_count, llm_tokens_input, llm_tokens_output, llm_cost_usd')
    .eq('store_id', storeId)
    .eq('date', today)
    .single()

  if (existing) {
    // Update existing row
    const { error } = await supabase
      .from('subscription_usage')
      .update({
        agent_actions_count: existing.agent_actions_count + 1,
        llm_tokens_input: existing.llm_tokens_input + tokens.input,
        llm_tokens_output: existing.llm_tokens_output + tokens.output,
        llm_cost_usd: Number(existing.llm_cost_usd) + tokens.costUsd,
      })
      .eq('id', existing.id)

    if (error) {
      logger.error('Failed to update daily usage', toError(error), { storeId })
    }
  } else {
    // Insert new row for today
    const { error } = await supabase
      .from('subscription_usage')
      .insert({
        store_id: storeId,
        date: today,
        agent_actions_count: 1,
        llm_tokens_input: tokens.input,
        llm_tokens_output: tokens.output,
        llm_cost_usd: tokens.costUsd,
      })

    if (error) {
      // Handle race condition — another request may have inserted simultaneously
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).code === '23505') {
        // Unique constraint violation — retry as update
        const { data: retryRow } = await supabase
          .from('subscription_usage')
          .select('id, agent_actions_count, llm_tokens_input, llm_tokens_output, llm_cost_usd')
          .eq('store_id', storeId)
          .eq('date', today)
          .single()

        if (retryRow) {
          await supabase
            .from('subscription_usage')
            .update({
              agent_actions_count: retryRow.agent_actions_count + 1,
              llm_tokens_input: retryRow.llm_tokens_input + tokens.input,
              llm_tokens_output: retryRow.llm_tokens_output + tokens.output,
              llm_cost_usd: Number(retryRow.llm_cost_usd) + tokens.costUsd,
            })
            .eq('id', retryRow.id)
        }
      } else {
        logger.error('Failed to insert daily usage', toError(error), { storeId })
      }
    }
  }
}

/**
 * Get usage stats for a store on a given date (defaults to today)
 */
export async function getDailyUsage(
  storeId: string,
  date?: string
): Promise<{ actionsCount: number; llmCostUsd: number }> {
  const supabase = getSupabaseAdmin()
  const targetDate = date ?? new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('subscription_usage')
    .select('agent_actions_count, llm_cost_usd')
    .eq('store_id', storeId)
    .eq('date', targetDate)
    .single()

  if (!data) {
    // No usage record yet — return zeros
    return { actionsCount: 0, llmCostUsd: 0 }
  }

  return {
    actionsCount: data.agent_actions_count,
    llmCostUsd: Number(data.llm_cost_usd),
  }
}

// =============================================================================
// Stripe Checkout & Webhooks
// =============================================================================

/**
 * Create a Stripe Checkout Session for subscribing to a plan.
 * Uses the platform Stripe account (not per-store).
 * Returns the checkout URL.
 */
export async function createCheckoutSession(
  storeId: string,
  userId: string,
  tierId: SubscriptionTier,
  currency: 'INR' | 'USD'
): Promise<string> {
  const StripeConstructor = (await import('stripe')).default

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    throw new Error('Platform Stripe API key not configured')
  }

  const stripe = new StripeConstructor(stripeKey, {
    apiVersion: '2026-01-28.clover',
  })

  // Fetch the tier to get the correct Stripe price ID
  const supabase = getSupabaseAdmin()
  const { data: tier, error: tierError } = await supabase
    .from('subscription_tiers')
    .select('stripe_price_id_inr, stripe_price_id_usd, name')
    .eq('id', tierId)
    .single()

  if (tierError || !tier) {
    throw new Error(`Subscription tier "${tierId}" not found`)
  }

  const priceId = currency === 'INR' ? tier.stripe_price_id_inr : tier.stripe_price_id_usd
  if (!priceId) {
    throw new Error(`No Stripe price configured for tier "${tierId}" in ${currency}`)
  }

  // Check if merchant already has a Stripe customer ID
  const { data: existingSub } = await supabase
    .from('merchant_subscriptions')
    .select('stripe_customer_id')
    .eq('store_id', storeId)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://storeforge.site'

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/settings/billing?cancelled=true`,
    metadata: {
      store_id: storeId,
      user_id: userId,
      tier_id: tierId,
    },
    subscription_data: {
      metadata: {
        store_id: storeId,
        user_id: userId,
        tier_id: tierId,
      },
    },
  }

  // Reuse existing Stripe customer if available
  if (existingSub?.stripe_customer_id) {
    sessionParams.customer = existingSub.stripe_customer_id
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  if (!session.url) {
    throw new Error('Failed to create Stripe checkout session URL')
  }

  return session.url
}

/**
 * Handle Stripe subscription webhook events.
 * Processes: customer.subscription.created, .updated, .deleted, invoice.payment_failed
 */
export async function handleSubscriptionWebhook(
  event: { type: string; data: { object: Record<string, unknown> } }
): Promise<void> {
  const supabase = getSupabaseAdmin()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object
      const metadata = subscription.metadata as Record<string, string> | undefined
      const storeId = metadata?.store_id
      const userId = metadata?.user_id
      const tierId = metadata?.tier_id as SubscriptionTier | undefined

      if (!storeId || !userId) {
        logger.warn('Subscription webhook missing store_id or user_id in metadata', {
          eventType: event.type,
          subscriptionId: subscription.id,
        })
        return
      }

      const status = mapStripeStatus(subscription.status as string)

      const { error } = await supabase
        .from('merchant_subscriptions')
        .upsert(
          {
            store_id: storeId,
            user_id: userId,
            tier_id: tierId || 'free',
            status,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id as string,
            current_period_start: subscription.current_period_start
              ? new Date((subscription.current_period_start as number) * 1000).toISOString()
              : null,
            current_period_end: subscription.current_period_end
              ? new Date((subscription.current_period_end as number) * 1000).toISOString()
              : null,
            cancel_at_period_end: (subscription.cancel_at_period_end as boolean) || false,
            trial_ends_at: subscription.trial_end
              ? new Date((subscription.trial_end as number) * 1000).toISOString()
              : null,
          },
          { onConflict: 'store_id' }
        )

      if (error) {
        logger.error('Failed to upsert subscription', toError(error), {
          storeId,
          eventType: event.type,
        })
        return
      }

      // Sync subscription_tier on the stores table
      if (tierId) {
        await supabase
          .from('stores')
          .update({ subscription_tier: tierId })
          .eq('id', storeId)
      }

      logger.info('Subscription updated via webhook', {
        storeId,
        tierId,
        status,
        eventType: event.type,
      })
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const metadata = subscription.metadata as Record<string, string> | undefined
      const storeId = metadata?.store_id

      if (!storeId) {
        logger.warn('Subscription deleted webhook missing store_id', {
          subscriptionId: subscription.id,
        })
        return
      }

      // Mark subscription as cancelled and revert store to free tier
      const { error } = await supabase
        .from('merchant_subscriptions')
        .update({ status: 'cancelled', cancel_at_period_end: false })
        .eq('store_id', storeId)

      if (error) {
        logger.error('Failed to cancel subscription', toError(error), { storeId })
      }

      await supabase
        .from('stores')
        .update({ subscription_tier: 'free' })
        .eq('id', storeId)

      logger.info('Subscription cancelled via webhook', { storeId })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const subscriptionId = invoice.subscription as string | undefined

      if (!subscriptionId) return

      // Find the subscription by Stripe subscription ID
      const { data: sub } = await supabase
        .from('merchant_subscriptions')
        .select('store_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single()

      if (sub) {
        await supabase
          .from('merchant_subscriptions')
          .update({ status: 'past_due' })
          .eq('store_id', sub.store_id)

        logger.warn('Invoice payment failed, subscription marked past_due', {
          storeId: sub.store_id,
          subscriptionId,
        })
      }
      break
    }

    default:
      // Ignore unhandled event types
      break
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Map Stripe subscription status to our internal status
 */
function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'cancelled'
    case 'trialing':
      return 'trialing'
    default:
      return 'active'
  }
}
