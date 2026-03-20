// src/app/api/agents/[agentId]/pause/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateAgentRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ agentId: string }>
}

/**
 * POST /api/agents/[agentId]/pause
 * Body: { paused: boolean }
 * Toggles agent between 'paused' and 'idle' status.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { agentId } = await params

  const authResult = await authenticateAgentRequest(req, agentId)
  if (authResult instanceof Response) return authResult
  const { storeId } = authResult

  let body: { paused: boolean }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (typeof body.paused !== 'boolean') {
    return jsonError('paused field (boolean) is required', 400)
  }

  const admin = getSupabaseAdmin()

  // Only allow pausing agents that are idle or running, and resuming agents that are paused
  const { data: agent } = await admin
    .from('agent_states')
    .select('status')
    .eq('id', agentId)
    .eq('store_id', storeId)
    .single()

  if (!agent) {
    return jsonError('Agent not found', 404)
  }

  if (
    body.paused &&
    agent.status !== 'idle' &&
    agent.status !== 'running' &&
    agent.status !== 'waiting_approval'
  ) {
    return jsonError(`Cannot pause agent in '${agent.status}' status`, 400)
  }

  if (!body.paused && agent.status !== 'paused') {
    return jsonError('Agent is not paused', 400)
  }

  const newStatus = body.paused ? 'paused' : 'idle'

  const { data: updated, error } = await admin
    .from('agent_states')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', agentId)
    .eq('store_id', storeId)
    .select('*')
    .single()

  if (error) {
    console.error('[Agents API] Failed to update agent status:', error)
    return jsonError('Failed to update agent status', 500)
  }

  return jsonSuccess(updated)
}
