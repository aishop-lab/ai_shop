// src/lib/agents/recovery.ts
// Agent error recovery, health monitoring, and hardening utilities.

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { checkBudget } from './cost-tracker'
import type { AgentType, AgentStatus } from './types'

// ---- Types ----

export type DegradationLevel = 'normal' | 'warning' | 'exhausted'

export interface BudgetDegradation {
  level: DegradationLevel
  message: string | null
}

export interface AgentHealthStatus {
  agentType: AgentType
  status: AgentStatus
  isEnabled: boolean
  isHealthy: boolean
  lastActionAt: string | null
  errorCount: number
  totalActions: number
}

export interface RecoveryResult {
  retried: boolean
  reason?: string
  delayMs?: number
  attempt?: number
}

// ---- Recovery Functions ----

/**
 * Find agents stuck in 'running' for > 5 minutes and reset them to 'idle'.
 * This handles cases where an agent crashed mid-execution without cleaning up.
 */
export async function recoverStuckAgents(): Promise<number> {
  const supabase = getSupabaseAdmin()

  const { data: stuckAgents, error } = await supabase
    .from('agent_states')
    .select('*')
    .eq('status', 'running')
    .lt('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())

  if (error || !stuckAgents || stuckAgents.length === 0) {
    return 0
  }

  let recoveredCount = 0

  for (const agent of stuckAgents) {
    const { error: updateError } = await supabase
      .from('agent_states')
      .update({
        status: 'idle',
        error_count: (agent.error_count || 0) + 1,
        last_error: 'Auto-recovered: agent was stuck in running state',
      })
      .eq('id', agent.id)

    if (!updateError) {
      recoveredCount++
      logger.info('[recovery] Recovered stuck agent', {
        storeId: agent.store_id,
        agentType: agent.agent_type,
        stuckSince: agent.updated_at,
        newErrorCount: (agent.error_count || 0) + 1,
      })
    } else {
      logger.error('[recovery] Failed to recover stuck agent', undefined, {
        storeId: agent.store_id,
        agentType: agent.agent_type,
        error: updateError.message,
      })
    }
  }

  logger.info('[recovery] Stuck agent recovery complete', {
    found: stuckAgents.length,
    recovered: recoveredCount,
  })

  return recoveredCount
}

/**
 * Retry a failed agent with exponential backoff.
 * Only retries if the agent is in 'error' status and hasn't exceeded max retries.
 */
export async function retryFailedAgent(
  storeId: string,
  agentType: AgentType,
  maxRetries: number = 3
): Promise<RecoveryResult> {
  const supabase = getSupabaseAdmin()

  const { data: agent, error } = await supabase
    .from('agent_states')
    .select('*')
    .eq('store_id', storeId)
    .eq('agent_type', agentType)
    .single()

  if (error || !agent) {
    return { retried: false, reason: 'agent_not_found' }
  }

  if (agent.status !== 'error') {
    return { retried: false, reason: 'agent_not_in_error_state' }
  }

  const errorCount = agent.error_count || 0

  if (errorCount >= maxRetries) {
    logger.warn('[recovery] Max retries exceeded for agent', {
      storeId,
      agentType,
      errorCount,
      maxRetries,
    })
    return { retried: false, reason: 'max_retries_exceeded' }
  }

  const backoffDelay = Math.min(1000 * Math.pow(2, errorCount), 30000)

  const { error: updateError } = await supabase
    .from('agent_states')
    .update({ status: 'idle' })
    .eq('store_id', storeId)
    .eq('agent_type', agentType)

  if (updateError) {
    logger.error('[recovery] Failed to reset agent for retry', undefined, {
      storeId,
      agentType,
      error: updateError.message,
    })
    return { retried: false, reason: 'update_failed' }
  }

  logger.info('[recovery] Agent reset for retry', {
    storeId,
    agentType,
    attempt: errorCount + 1,
    delayMs: backoffDelay,
  })

  return {
    retried: true,
    delayMs: backoffDelay,
    attempt: errorCount + 1,
  }
}

/**
 * Check if a store has budget remaining and return the degradation level.
 * Call this before agent execution to decide whether to proceed, throttle, or block.
 */
export async function checkBudgetAndDegrade(storeId: string): Promise<BudgetDegradation> {
  const budget = await checkBudget(storeId)

  if (budget.percentUsed >= 100) {
    return {
      level: 'exhausted',
      message: 'LLM budget exhausted. Only read-only agent actions are available.',
    }
  }

  if (budget.percentUsed >= 80) {
    return {
      level: 'warning',
      message: 'Approaching LLM budget limit. Agent actions may be throttled.',
    }
  }

  return { level: 'normal', message: null }
}

/**
 * Expire pending approvals older than 72 hours.
 * Prevents stale approval requests from accumulating.
 */
export async function expireOldApprovals(): Promise<number> {
  const supabase = getSupabaseAdmin()

  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('agent_approvals')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id')

  if (error) {
    logger.error('[recovery] Failed to expire old approvals', undefined, {
      error: error.message,
    })
    return 0
  }

  const count = data?.length || 0

  if (count > 0) {
    logger.info('[recovery] Expired old approvals', { count })
  }

  return count
}

/**
 * Get health status for all agents in a store.
 * Returns agents sorted by health (unhealthy first).
 */
export async function getAgentHealthSummary(storeId: string): Promise<AgentHealthStatus[]> {
  const supabase = getSupabaseAdmin()

  const { data: agents, error } = await supabase
    .from('agent_states')
    .select('*')
    .eq('store_id', storeId)
    .order('agent_type')

  if (error || !agents) {
    return []
  }

  const healthStatuses: AgentHealthStatus[] = agents.map((agent) => {
    const isHealthy = agent.status === 'idle' && (agent.error_count || 0) < 3

    return {
      agentType: agent.agent_type as AgentType,
      status: agent.status as AgentStatus,
      isEnabled: agent.is_enabled,
      isHealthy,
      lastActionAt: agent.last_action_at || null,
      errorCount: agent.error_count || 0,
      totalActions: agent.total_actions || 0,
    }
  })

  // Sort: unhealthy first, then by agent type
  healthStatuses.sort((a, b) => {
    if (a.isHealthy !== b.isHealthy) {
      return a.isHealthy ? 1 : -1
    }
    return a.agentType.localeCompare(b.agentType)
  })

  return healthStatuses
}

/**
 * Clear error state for an agent, resetting it to idle with zero errors.
 */
export async function resetAgentErrors(storeId: string, agentType: AgentType): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('agent_states')
    .update({
      status: 'idle',
      error_count: 0,
      last_error: null,
    })
    .eq('store_id', storeId)
    .eq('agent_type', agentType)

  if (error) {
    logger.error('[recovery] Failed to reset agent errors', undefined, {
      storeId,
      agentType,
      error: error.message,
    })
    return false
  }

  logger.info('[recovery] Agent errors reset', { storeId, agentType })
  return true
}
