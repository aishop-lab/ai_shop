import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { AGENT_TYPES } from '@/lib/agents/constants'
import type { AgentType } from '@/lib/agents/types'

export async function GET() {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()

    // Run all queries in parallel
    const [
      agentStatesRes,
      pendingApprovalsRes,
      actions24hRes,
      actions7dRes,
      recentErrorsRes,
      costTrackingRes,
    ] = await Promise.all([
      // Agent states grouped by type
      supabase
        .from('agent_states')
        .select('agent_type, is_enabled, status, error_count'),

      // Pending approvals count
      supabase
        .from('agent_approvals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // Actions in last 24 hours
      supabase
        .from('agent_actions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

      // Actions in last 7 days grouped by agent type
      supabase
        .from('agent_actions')
        .select('agent_type')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      // Recent agent errors
      supabase
        .from('agent_states')
        .select('agent_type, store_id, last_error, error_count, updated_at')
        .or('status.eq.error,error_count.gt.0')
        .order('updated_at', { ascending: false })
        .limit(20),

      // Cost tracking for current month
      supabase
        .from('agent_cost_tracking')
        .select('store_id, total_llm_cost_usd, cost_by_agent')
        .gte('period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ])

    // Process agent states by type
    const statesByType: Record<string, { activeCount: number; errorCount: number }> = {}
    for (const agentType of AGENT_TYPES) {
      statesByType[agentType] = { activeCount: 0, errorCount: 0 }
    }

    let totalActive = 0
    let totalErrored = 0

    if (agentStatesRes.data) {
      for (const row of agentStatesRes.data) {
        const type = row.agent_type as string
        if (statesByType[type]) {
          if (row.is_enabled) {
            statesByType[type].activeCount++
            totalActive++
          }
          if (row.status === 'error') {
            statesByType[type].errorCount++
            totalErrored++
          }
        }
      }
    }

    // Process actions by type (7 days)
    const actionsByType: Record<string, number> = {}
    for (const agentType of AGENT_TYPES) {
      actionsByType[agentType] = 0
    }
    if (actions7dRes.data) {
      for (const row of actions7dRes.data) {
        const type = row.agent_type as string
        if (actionsByType[type] !== undefined) {
          actionsByType[type]++
        }
      }
    }

    // Build byType array
    const byType = AGENT_TYPES.map((agentType: AgentType) => ({
      agentType,
      activeCount: statesByType[agentType]?.activeCount ?? 0,
      errorCount: statesByType[agentType]?.errorCount ?? 0,
      actionCount7d: actionsByType[agentType] ?? 0,
    }))

    // Process recent errors
    const recentErrors = (recentErrorsRes.data || []).map((row) => ({
      agentType: row.agent_type as AgentType,
      storeId: row.store_id as string,
      error: row.last_error as string | null,
      errorCount: row.error_count as number,
      updatedAt: row.updated_at as string,
    }))

    // Process cost tracking
    let totalMonthly = 0
    const costByAgent: Record<string, number> = {}
    for (const agentType of AGENT_TYPES) {
      costByAgent[agentType] = 0
    }
    const storeCosts: Record<string, number> = {}

    if (costTrackingRes.data) {
      for (const row of costTrackingRes.data) {
        totalMonthly += row.total_llm_cost_usd || 0
        storeCosts[row.store_id] = (storeCosts[row.store_id] || 0) + (row.total_llm_cost_usd || 0)

        if (row.cost_by_agent && typeof row.cost_by_agent === 'object') {
          for (const [agent, cost] of Object.entries(row.cost_by_agent as Record<string, number>)) {
            if (costByAgent[agent] !== undefined) {
              costByAgent[agent] += cost || 0
            }
          }
        }
      }
    }

    // Top 5 stores by cost
    const topStores = Object.entries(storeCosts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([storeId, cost]) => ({ storeId, cost }))

    return NextResponse.json({
      summary: {
        totalActive,
        errored: totalErrored,
        pendingApprovals: pendingApprovalsRes.count ?? 0,
        actions24h: actions24hRes.count ?? 0,
      },
      byType,
      recentErrors,
      costs: {
        totalMonthly,
        byAgent: costByAgent,
        topStores,
      },
    })
  } catch (error) {
    console.error('Admin agents health error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent health data' },
      { status: 500 }
    )
  }
}
