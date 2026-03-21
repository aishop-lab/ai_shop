// src/app/api/agents/memory/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateAgentRequest, isAuthError } from '@/lib/agents/api-auth'
import type { AgentType, MemoryType } from '@/lib/agents/types'
import { AGENT_TYPES } from '@/lib/agents/constants'

export const runtime = 'nodejs'

/**
 * GET /api/agents/memory?agent_type=support&memory_type=preference&min_confidence=0.1&limit=100
 * Returns memories for the authenticated user's store, filtered by agent_type.
 */
export async function GET(req: NextRequest) {
  const authResult = await authenticateAgentRequest(req)
  if (isAuthError(authResult)) {
    return Response.json({ error: authResult.error }, { status: authResult.status })
  }

  const { storeId } = authResult
  const url = new URL(req.url)

  const agentType = url.searchParams.get('agent_type') as AgentType | null
  if (!agentType || !AGENT_TYPES.includes(agentType)) {
    return Response.json({ error: 'Valid agent_type query parameter is required' }, { status: 400 })
  }

  const memoryType = url.searchParams.get('memory_type') as MemoryType | null
  const minConfidence = parseFloat(url.searchParams.get('min_confidence') || '0')
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10)))

  const admin = getSupabaseAdmin()

  let query = admin
    .from('agent_memory')
    .select('*', { count: 'exact' })
    .eq('store_id', storeId)
    .eq('agent_type', agentType)
    .gte('confidence', isNaN(minConfidence) ? 0 : minConfidence)
    .order('confidence', { ascending: false })
    .limit(limit)

  if (memoryType) {
    query = query.eq('memory_type', memoryType)
  }

  // Exclude expired memories
  query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

  const { data: memories, count, error } = await query

  if (error) {
    console.error('[Agents Memory API] Failed to fetch memories:', error)
    return Response.json({ error: 'Failed to fetch memories' }, { status: 500 })
  }

  return Response.json({
    memories: memories || [],
    count: count || 0,
  })
}
