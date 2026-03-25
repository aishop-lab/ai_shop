// POST /api/agents/sub-agents/execute
// Invoke a specific sub-agent with a task instruction.
// Body: { sub_agent_id: string, instruction: string, params?: Record<string, unknown> }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { executeSubAgent } from '@/lib/agents/sub-agents/executor'
import { routeToSubAgent, routeToSubAgentGlobal } from '@/lib/agents/sub-agents/router'
import { getSubAgent } from '@/lib/agents/sub-agents/registry'
import type { SubAgentId } from '@/lib/agents/sub-agents/types'
import type { AgentType } from '@/lib/agents/types'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get merchant's store ID
    const admin = getSupabaseAdmin()
    const { data: store } = await admin
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!store) {
      return NextResponse.json({ success: false, error: 'No store found' }, { status: 404 })
    }

    const body = await req.json()
    const { sub_agent_id, chief, instruction, params } = body as {
      sub_agent_id?: string
      chief?: AgentType
      instruction: string
      params?: Record<string, unknown>
    }

    if (!instruction) {
      return NextResponse.json({ success: false, error: 'instruction is required' }, { status: 400 })
    }

    // Determine which sub-agent to use
    let resolvedSubAgentId: SubAgentId

    if (sub_agent_id) {
      // Direct sub-agent invocation
      const subAgent = getSubAgent(sub_agent_id as SubAgentId)
      if (!subAgent) {
        return NextResponse.json({ success: false, error: `Unknown sub-agent: ${sub_agent_id}` }, { status: 400 })
      }
      resolvedSubAgentId = sub_agent_id as SubAgentId
    } else if (chief) {
      // Route within a specific Chief
      resolvedSubAgentId = routeToSubAgent(chief, instruction)
    } else {
      // Global routing — find the best sub-agent across all Chiefs
      const routed = routeToSubAgentGlobal(instruction)
      resolvedSubAgentId = routed.subAgentId
    }

    // Execute the sub-agent
    const result = await executeSubAgent(resolvedSubAgentId, store.id, {
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
    console.error('[SubAgent Execute] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Execution failed' },
      { status: 500 }
    )
  }
}
