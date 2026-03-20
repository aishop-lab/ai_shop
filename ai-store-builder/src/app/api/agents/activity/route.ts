// src/app/api/agents/activity/route.ts
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { authenticateStoreRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'

export const runtime = 'nodejs'

/**
 * GET /api/agents/activity?storeId=xxx&limit=20&agentType=support&category=communication
 * Returns recent actions across all agents for a store.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const storeId = url.searchParams.get('storeId')

  if (!storeId) {
    return jsonError('storeId query parameter is required', 400)
  }

  const authResult = await authenticateStoreRequest(req, storeId)
  if (authResult instanceof Response) return authResult

  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
  const agentType = url.searchParams.get('agentType')
  const category = url.searchParams.get('category')
  const cursor = url.searchParams.get('cursor') // ISO timestamp for cursor-based pagination

  const admin = getSupabaseAdmin()

  let query = admin
    .from('agent_actions')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (agentType) {
    query = query.eq('agent_type', agentType)
  }
  if (category) {
    query = query.eq('action_category', category)
  }
  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data: actions, error } = await query

  if (error) {
    console.error('[Agents API] Failed to fetch activity:', error)
    return jsonError('Failed to fetch activity', 500)
  }

  const nextCursor =
    actions && actions.length === limit ? actions[actions.length - 1].created_at : null

  return jsonSuccess({
    actions: actions || [],
    nextCursor,
  })
}
