// src/app/api/agents/execute/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { jsonError, jsonSuccess } from '@/lib/agents/auth'
import { processAbandonedCarts } from '@/lib/cart/abandoned-cart'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min for fan-out

/**
 * Task definitions: which agent type handles each task.
 */
const TASK_AGENT_MAP: Record<string, string> = {
  expire_approvals: '_system', // No specific agent, system-level task
  abandoned_cart_scan: 'sales',
  daily_digest: 'analytics',
  weekly_report: 'analytics',
}

/**
 * GET/POST /api/agents/execute?task=expire_approvals
 * Cron-callable endpoint. Validates CRON_SECRET, then executes the specified task
 * across all relevant stores.
 */
export async function GET(req: NextRequest) {
  return handleExecute(req)
}

export async function POST(req: NextRequest) {
  return handleExecute(req)
}

async function handleExecute(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return jsonError('Unauthorized', 401)
  }

  const url = new URL(req.url)
  const task = url.searchParams.get('task')

  if (!task) {
    return jsonError('task query parameter is required', 400)
  }

  if (!TASK_AGENT_MAP[task]) {
    return jsonError(`Unknown task: ${task}`, 400)
  }

  const admin = getSupabaseAdmin()

  console.log(`[Agent Cron] Starting task: ${task}`)

  try {
    switch (task) {
      case 'expire_approvals':
        return await expireApprovals(admin)

      case 'abandoned_cart_scan':
        return await abandonedCartScan(admin)

      default:
        return jsonError(`Task handler not implemented: ${task}`, 501)
    }
  } catch (error) {
    console.error(`[Agent Cron] Task ${task} failed:`, error)
    return jsonError(
      `Task ${task} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}

/**
 * Expire approvals that have passed their expires_at timestamp.
 * Runs across all stores — no agent-specific filtering needed.
 */
async function expireApprovals(admin: ReturnType<typeof getSupabaseAdmin>) {
  const now = new Date().toISOString()

  const { data: expired, error } = await admin
    .from('agent_approvals')
    .update({
      status: 'expired',
      updated_at: now,
    })
    .eq('status', 'pending')
    .lt('expires_at', now)
    .select('id, store_id, agent_type')

  if (error) {
    console.error('[Agent Cron] Failed to expire approvals:', error)
    return jsonError('Failed to expire approvals', 500)
  }

  const expiredCount = expired?.length || 0

  // Update corresponding agent_actions
  if (expired && expired.length > 0) {
    await admin
      .from('agent_actions')
      .update({ status: 'expired', completed_at: now })
      .in(
        'approval_id',
        expired.map((a) => a.id)
      )
      .eq('status', 'pending_approval')

    // Reset waiting_approval agents back to idle if they have no more pending approvals
    const storeAgentPairs = [...new Set(expired.map((a) => `${a.store_id}|${a.agent_type}`))]
    for (const pair of storeAgentPairs) {
      const [storeId, agentType] = pair.split('|')

      // Check if there are still pending approvals for this agent
      const { count } = await admin
        .from('agent_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('agent_type', agentType)
        .eq('status', 'pending')

      if (count === 0) {
        await admin
          .from('agent_states')
          .update({ status: 'idle', updated_at: now })
          .eq('store_id', storeId)
          .eq('agent_type', agentType)
          .eq('status', 'waiting_approval')
      }
    }
  }

  console.log(`[Agent Cron] Expired ${expiredCount} approvals`)
  return jsonSuccess({ task: 'expire_approvals', expired: expiredCount })
}

/**
 * Scan for abandoned carts across all stores and send recovery emails.
 * Uses processAbandonedCarts() from lib/cart/abandoned-cart.ts which handles:
 * - Per-store Resend credentials with platform fallback
 * - 3-email sequence with configurable delay per store
 * - Proper recovery_emails_sent / last_email_sent_at tracking
 * - Cart expiry and status management
 */
async function abandonedCartScan(admin: ReturnType<typeof getSupabaseAdmin>) {
  const startedAt = new Date().toISOString()

  console.log('[Agent Cron] Starting abandoned cart recovery scan...')

  try {
    // processAbandonedCarts handles everything: finding eligible carts across all
    // stores, determining the correct sequence step, sending emails via per-store
    // Resend credentials, and updating cart records.
    const result = await processAbandonedCarts()

    const completedAt = new Date().toISOString()

    // Log a summary agent_action for each store that had carts processed
    // (processAbandonedCarts works across all stores internally, so we log one summary action)
    if (result.processed > 0 || result.emailsSent > 0) {
      await admin.from('agent_actions').insert({
        store_id: null, // cross-store system action
        agent_type: 'sales',
        action_type: 'abandoned_cart_recovery',
        action_category: 'campaign',
        summary: `Processed ${result.processed} abandoned cart(s), sent ${result.emailsSent} recovery email(s)`,
        details: {
          carts_processed: result.processed,
          emails_sent: result.emailsSent,
          errors: result.errors.length > 0 ? result.errors : undefined,
        },
        status: 'completed',
        execution_mode: 'auto',
        tokens_input: 0,
        tokens_output: 0,
        estimated_cost_usd: 0,
        api_costs: {},
        started_at: startedAt,
        completed_at: completedAt,
        duration_ms: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      })
    }

    console.log(
      `[Agent Cron] Cart recovery complete: ${result.processed} carts processed, ${result.emailsSent} emails sent` +
        (result.errors.length > 0 ? `, ${result.errors.length} error(s)` : '')
    )

    return jsonSuccess({
      task: 'abandoned_cart_scan',
      cartsProcessed: result.processed,
      emailsSent: result.emailsSent,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (error) {
    console.error('[Agent Cron] Abandoned cart recovery failed:', error)

    // Log the failure
    await admin.from('agent_actions').insert({
      store_id: null,
      agent_type: 'sales',
      action_type: 'abandoned_cart_recovery',
      action_category: 'campaign',
      summary: `Abandoned cart recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      status: 'failed',
      execution_mode: 'auto',
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost_usd: 0,
      api_costs: {},
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
    })

    return jsonError(
      `Abandoned cart recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}
