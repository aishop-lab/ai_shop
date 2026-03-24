// src/lib/agents/schedule-executor.ts
// Dispatches scheduled tasks to the appropriate agent for execution.

import { getAgentState } from './db'
import type { AgentType, AgentTrigger } from './types'
import type { BaseAgent } from './base-agent'

/**
 * Lazy-import the agent class to avoid circular dependencies.
 * Each agent module registers its tools on construction, so we
 * only pay that cost when the agent is actually needed.
 */
async function getAgentInstance(agentType: AgentType): Promise<BaseAgent | null> {
  switch (agentType) {
    case 'sales': {
      const { SalesAgent } = await import('./sales/agent')
      return new SalesAgent()
    }
    case 'marketing': {
      const { MarketingAgent } = await import('./marketing/agent')
      return new MarketingAgent()
    }
    case 'technical': {
      const { TechnicalAgent } = await import('./technical/agent')
      return new TechnicalAgent()
    }
    case 'analytics': {
      const { AnalyticsAgent } = await import('./analytics/agent')
      return new AnalyticsAgent()
    }
    case 'support': {
      const { SupportAgent } = await import('./support/agent')
      return new SupportAgent()
    }
    default:
      return null
  }
}

/**
 * Execute a single scheduled task by dispatching it to the correct agent.
 *
 * Throws on failure so that the scheduler (`executeScheduledTasks`) can
 * record the failure status and track consecutive errors.
 */
export async function executeScheduledTask(schedule: {
  store_id: string
  agent_type: string
  task_type: string
  config?: Record<string, unknown>
}): Promise<void> {
  const agentType = schedule.agent_type as AgentType

  // 1. Check the agent is enabled for this store
  const state = await getAgentState(schedule.store_id, agentType)
  if (!state || !state.is_enabled) {
    throw new Error(`Agent "${agentType}" is not enabled for store ${schedule.store_id}`)
  }

  // 2. Resolve the agent implementation
  const agent = await getAgentInstance(agentType)
  if (!agent) {
    throw new Error(`Unknown agent type: ${agentType}`)
  }

  // 3. Build the trigger matching the AgentTrigger interface
  const trigger: AgentTrigger = {
    storeId: schedule.store_id,
    agentType,
    source: 'cron',
    taskType: schedule.task_type,
    context: schedule.config ?? {},
  }

  // 4. Execute — BaseAgent.execute handles state transitions, model selection,
  //    tool wrapping, cost tracking, and error recovery internally.
  const result = await agent.execute(trigger)

  // 5. If the agent skipped (disabled / paused / budget exhausted), treat as an error
  //    so the scheduler can track it. This is different from a successful no-op.
  if (result.skipped) {
    throw new Error(`Agent "${agentType}" skipped execution (disabled, paused, or budget exhausted)`)
  }

  console.log(
    `[schedule-executor] Completed: store=${schedule.store_id} agent=${agentType} task=${schedule.task_type} actions=${result.actions.length} tokens=${result.tokensInput + result.tokensOutput}`
  )
}
