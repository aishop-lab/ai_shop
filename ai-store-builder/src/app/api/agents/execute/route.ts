// src/app/api/agents/execute/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { jsonError, jsonSuccess } from '@/lib/agents/auth'

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
 * Scan for abandoned carts across all stores with the sales agent enabled.
 * Fans out to each store and triggers the sales agent's cart recovery logic.
 */
async function abandonedCartScan(admin: ReturnType<typeof getSupabaseAdmin>) {
  // Find all stores with the sales agent enabled
  const { data: salesAgents, error: agentError } = await admin
    .from('agent_states')
    .select('store_id, id')
    .eq('agent_type', 'sales')
    .eq('is_enabled', true)
    .neq('status', 'paused')

  if (agentError) {
    console.error('[Agent Cron] Failed to fetch sales agents:', agentError)
    return jsonError('Failed to fetch sales agents', 500)
  }

  if (!salesAgents || salesAgents.length === 0) {
    console.log('[Agent Cron] No enabled sales agents found')
    return jsonSuccess({ task: 'abandoned_cart_scan', storesScanned: 0, cartsFound: 0 })
  }

  let totalCartsFound = 0
  const errors: string[] = []

  for (const agent of salesAgents) {
    try {
      // Find abandoned carts for this store (carts older than 1 hour, no recovery email sent recently)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data: carts, error: cartError } = await admin
        .from('abandoned_carts')
        .select('id')
        .eq('store_id', agent.store_id)
        .eq('recovered', false)
        .lt('updated_at', oneHourAgo)
        .gt('created_at', oneDayAgo)
        .is('last_email_sent_at', null)

      if (cartError) {
        errors.push(`Store ${agent.store_id}: ${cartError.message}`)
        continue
      }

      if (carts && carts.length > 0) {
        totalCartsFound += carts.length

        // Log the action
        await admin.from('agent_actions').insert({
          store_id: agent.store_id,
          agent_type: 'sales',
          action_type: 'abandoned_cart_scan',
          action_category: 'campaign',
          summary: `Found ${carts.length} abandoned cart(s) eligible for recovery`,
          details: { cart_count: carts.length, cart_ids: carts.map((c) => c.id) },
          status: 'completed',
          execution_mode: 'auto',
          tokens_input: 0,
          tokens_output: 0,
          estimated_cost_usd: 0,
          api_costs: {},
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: 0,
        })
      }
    } catch (storeError) {
      errors.push(
        `Store ${agent.store_id}: ${storeError instanceof Error ? storeError.message : 'Unknown error'}`
      )
    }
  }

  console.log(`[Agent Cron] Scanned ${salesAgents.length} stores, found ${totalCartsFound} carts`)

  return jsonSuccess({
    task: 'abandoned_cart_scan',
    storesScanned: salesAgents.length,
    cartsFound: totalCartsFound,
    errors: errors.length > 0 ? errors : undefined,
  })
}
