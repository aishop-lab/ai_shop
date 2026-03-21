// src/app/api/agents/recover/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/agents/auth'
import { ADMIN_EMAIL } from '@/lib/admin/constants'
import {
  recoverStuckAgents,
  expireOldApprovals,
  retryFailedAgent,
} from '@/lib/agents/recovery'
import type { AgentType } from '@/lib/agents/types'

export const runtime = 'nodejs'

const VALID_AGENT_TYPES: AgentType[] = ['marketing', 'sales', 'support', 'analytics', 'technical']

/**
 * POST /api/agents/recover
 * Trigger recovery operations. Accepts CRON_SECRET auth or admin user auth.
 *
 * Body: { action: 'recover_stuck' | 'expire_approvals' | 'retry_failed', storeId?: string, agentType?: string }
 */
export async function POST(req: NextRequest) {
  // Auth method 1: CRON_SECRET header (for cron jobs)
  const authHeader = req.headers.get('authorization')
  let isAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}`

  // Auth method 2: Admin user auth (for manual triggers)
  if (!isAuthorized) {
    const auth = await authenticateRequest(req)
    if (auth.user?.email === ADMIN_EMAIL) {
      isAuthorized = true
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { action?: string; storeId?: string; agentType?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, storeId, agentType } = body

  if (!action) {
    return NextResponse.json(
      { error: 'action is required. Valid actions: recover_stuck, expire_approvals, retry_failed' },
      { status: 400 }
    )
  }

  try {
    switch (action) {
      case 'recover_stuck': {
        const recovered = await recoverStuckAgents()
        return NextResponse.json({ ok: true, action, recovered })
      }

      case 'expire_approvals': {
        const expired = await expireOldApprovals()
        return NextResponse.json({ ok: true, action, expired })
      }

      case 'retry_failed': {
        if (!storeId) {
          return NextResponse.json(
            { error: 'storeId is required for retry_failed action' },
            { status: 400 }
          )
        }
        if (!agentType || !VALID_AGENT_TYPES.includes(agentType as AgentType)) {
          return NextResponse.json(
            { error: `agentType is required and must be one of: ${VALID_AGENT_TYPES.join(', ')}` },
            { status: 400 }
          )
        }

        const result = await retryFailedAgent(storeId, agentType as AgentType)
        return NextResponse.json({ ok: true, action, ...result })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: recover_stuck, expire_approvals, retry_failed` },
          { status: 400 }
        )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Agents API] Recovery action failed:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
