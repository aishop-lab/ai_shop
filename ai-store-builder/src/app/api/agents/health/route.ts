// src/app/api/agents/health/route.ts
import { NextRequest } from 'next/server'
import { authenticateStoreRequest, jsonError, jsonSuccess } from '@/lib/agents/auth'
import { getAgentHealthSummary, checkBudgetAndDegrade } from '@/lib/agents/recovery'

export const runtime = 'nodejs'

/**
 * GET /api/agents/health?storeId=xxx
 * Returns agent health status and budget degradation for a store.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const storeId = url.searchParams.get('storeId')

  if (!storeId) {
    return jsonError('storeId query parameter is required', 400)
  }

  const authResult = await authenticateStoreRequest(req, storeId)
  if (authResult instanceof Response) return authResult

  try {
    const [agents, budget] = await Promise.all([
      getAgentHealthSummary(storeId),
      checkBudgetAndDegrade(storeId),
    ])

    return jsonSuccess({ agents, budget })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Agents API] Failed to fetch health:', message)
    return jsonError('Failed to fetch agent health', 500)
  }
}
