// src/app/api/agents/[agentId]/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateAgentRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'
import { createDefaultSchedules, deactivateSchedules } from '@/lib/agents/scheduler'
import type { AutonomyLevel, AgentConfig } from '@/lib/agents/types'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ agentId: string }>
}

/**
 * GET /api/agents/[agentId]
 * Returns the full agent state for a given agent.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { agentId } = await params

  const authResult = await authenticateAgentRequest(req, agentId)
  if (authResult instanceof Response) return authResult
  const { storeId } = authResult

  const admin = getSupabaseAdmin()
  const { data: agent, error } = await admin
    .from('agent_states')
    .select('*')
    .eq('id', agentId)
    .eq('store_id', storeId)
    .single()

  if (error || !agent) {
    return jsonError('Agent not found', 404)
  }

  return jsonSuccess(agent)
}

/**
 * PATCH /api/agents/[agentId]
 * Update agent config: autonomy_level, is_enabled, config.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { agentId } = await params

  const authResult = await authenticateAgentRequest(req, agentId)
  if (authResult instanceof Response) return authResult
  const { storeId } = authResult

  let body: {
    autonomy_level?: AutonomyLevel
    is_enabled?: boolean
    config?: AgentConfig
  }

  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  // Validate autonomy_level range
  if (body.autonomy_level !== undefined) {
    if (![1, 2, 3, 4, 5].includes(body.autonomy_level)) {
      return jsonError('autonomy_level must be 1-5', 400)
    }
  }

  // Build update object with only allowed fields
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.autonomy_level !== undefined) update.autonomy_level = body.autonomy_level
  if (body.is_enabled !== undefined) update.is_enabled = body.is_enabled
  if (body.config !== undefined) update.config = body.config

  const admin = getSupabaseAdmin()
  const { data: updated, error } = await admin
    .from('agent_states')
    .update(update)
    .eq('id', agentId)
    .eq('store_id', storeId)
    .select('*')
    .single()

  if (error) {
    console.error('[Agents API] Failed to update agent:', error)
    return jsonError('Failed to update agent', 500)
  }

  // Auto-create or deactivate schedules when agent is enabled/disabled
  if (body.is_enabled !== undefined && updated?.agent_type) {
    try {
      if (body.is_enabled) {
        await createDefaultSchedules(storeId, updated.agent_type)
      } else {
        await deactivateSchedules(storeId, updated.agent_type)
      }
    } catch (scheduleError) {
      // Log but don't fail the request — agent state update already succeeded
      console.error('[Agents API] Schedule sync error:', scheduleError)
    }
  }

  return jsonSuccess(updated)
}
