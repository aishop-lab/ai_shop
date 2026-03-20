// src/app/api/agents/[agentId]/actions/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateAgentRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ agentId: string }>
}

/**
 * GET /api/agents/[agentId]/actions?page=1&limit=20&status=completed&category=communication
 * Returns paginated action history for a specific agent.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { agentId } = await params

  const authResult = await authenticateAgentRequest(req, agentId)
  if (authResult instanceof Response) return authResult
  const { storeId } = authResult

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
  const status = url.searchParams.get('status')
  const category = url.searchParams.get('category')

  // Fetch agent_type from agent_states
  const admin = getSupabaseAdmin()
  const { data: agent } = await admin
    .from('agent_states')
    .select('agent_type')
    .eq('id', agentId)
    .eq('store_id', storeId)
    .single()

  if (!agent) {
    return jsonError('Agent not found', 404)
  }

  const offset = (page - 1) * limit

  let query = admin
    .from('agent_actions')
    .select('*', { count: 'exact' })
    .eq('store_id', storeId)
    .eq('agent_type', agent.agent_type)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }
  if (category) {
    query = query.eq('action_category', category)
  }

  const { data: actions, count, error } = await query

  if (error) {
    console.error('[Agents API] Failed to fetch actions:', error)
    return jsonError('Failed to fetch actions', 500)
  }

  return jsonSuccess({
    actions: actions || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
