// GET /api/agents/sub-agents
// List all sub-agents, optionally filtered by chief.
// Query: ?chief=marketing

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ALL_SUB_AGENTS, getSubAgentsForChief } from '@/lib/agents/sub-agents/registry'
import type { AgentType } from '@/lib/agents/types'

export async function GET(req: NextRequest) {
  // Authenticate
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const chief = req.nextUrl.searchParams.get('chief') as AgentType | null

  const subAgents = chief
    ? getSubAgentsForChief(chief)
    : ALL_SUB_AGENTS

  // Return sub-agent metadata (no system prompts — those are internal)
  const result = subAgents.map(sa => ({
    id: sa.id,
    codename: sa.codename,
    chief: sa.chief,
    role: sa.role,
    description: sa.description,
    category: sa.category,
    autonomyRules: sa.autonomyRules,
  }))

  return NextResponse.json({
    success: true,
    count: result.length,
    sub_agents: result,
  })
}
