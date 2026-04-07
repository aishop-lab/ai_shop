// POST /api/agents/test-execute
// Test-only endpoint: execute sub-agents with CRON_SECRET auth
// Used by scripts/test-agents-e2e.ts for comprehensive agent testing
// Auth: Authorization: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { executeSubAgent } from '@/lib/agents/sub-agents/executor'
import { getSubAgent } from '@/lib/agents/sub-agents/registry'
import type { SubAgentId } from '@/lib/agents/sub-agents/types'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  // Auth via CRON_SECRET
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ success: false, error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { sub_agent_id, store_id, instruction, params } = body as {
      sub_agent_id: string
      store_id: string
      instruction: string
      params?: Record<string, unknown>
    }

    if (!sub_agent_id || !store_id || !instruction) {
      return NextResponse.json(
        { success: false, error: 'sub_agent_id, store_id, and instruction are required' },
        { status: 400 }
      )
    }

    // Validate sub-agent exists
    const subAgent = getSubAgent(sub_agent_id as SubAgentId)
    if (!subAgent) {
      return NextResponse.json(
        { success: false, error: `Unknown sub-agent: ${sub_agent_id}` },
        { status: 400 }
      )
    }

    const result = await executeSubAgent(sub_agent_id as SubAgentId, store_id, {
      instruction,
      params,
      triggerType: 'manual',
    })

    return NextResponse.json({
      success: true,
      sub_agent_id: result.subAgentId,
      chief: result.chief,
      output: result.output,
      actions: result.actions,
      requires_approval: result.requiresApproval,
      approval_id: result.approvalId,
      tokens: {
        input: result.tokensInput,
        output: result.tokensOutput,
      },
      duration_ms: result.durationMs,
    })
  } catch (error) {
    console.error('[Test Execute] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Execution failed' },
      { status: 500 }
    )
  }
}
