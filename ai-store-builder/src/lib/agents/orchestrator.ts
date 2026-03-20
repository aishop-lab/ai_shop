// src/lib/agents/orchestrator.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { AgentType, AgentAction } from './types'

// ---- Constants ----

/** Time window (ms) for conflict detection: if two agents modify the same entity within this window, it's a conflict */
const CONFLICT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

/** Agent priority for conflict resolution (higher = wins) */
const AGENT_PRIORITY: Record<AgentType, number> = {
  support: 5,    // Customer-facing, highest priority
  sales: 4,      // Revenue-critical
  marketing: 3,  // Campaign management
  analytics: 2,  // Read-heavy, rarely conflicts
  technical: 1,  // Background tasks
}

// ---- Types ----

export interface AgentTrigger {
  store_id: string
  trigger_type: string
  entity_type?: string
  entity_id?: string
  payload: Record<string, unknown>
  source_agent?: AgentType
}

export interface ConflictResult {
  has_conflict: boolean
  conflicting_action?: AgentAction
  winner?: AgentType
  loser?: AgentType
  reason?: string
}

export interface DispatchResult {
  agent_type: AgentType
  accepted: boolean
  conflict?: ConflictResult
  reason?: string
}

export interface CrossAgentNotification {
  id?: string
  store_id: string
  from_agent: AgentType
  to_agent: AgentType
  notification_type: string
  payload: Record<string, unknown>
  created_at?: string
}

/**
 * Map of trigger types to the agent types that should handle them.
 * Multiple agents can respond to the same trigger.
 */
const TRIGGER_ROUTING: Record<string, AgentType[]> = {
  // Order events
  'order.created': ['sales', 'support', 'analytics'],
  'order.cancelled': ['support', 'analytics'],
  'order.refund_requested': ['support', 'sales'],

  // Product events
  'product.created': ['marketing', 'technical', 'analytics'],
  'product.low_stock': ['sales', 'analytics'],
  'product.out_of_stock': ['sales', 'marketing'],

  // Customer events
  'customer.signup': ['marketing', 'sales'],
  'customer.complaint': ['support'],
  'customer.cart_abandoned': ['sales'],

  // Review events
  'review.created': ['support', 'marketing'],
  'review.negative': ['support'],

  // Traffic / performance events
  'traffic.spike': ['analytics', 'technical'],
  'traffic.drop': ['analytics', 'marketing'],
  'performance.degraded': ['technical'],

  // Scheduled / internal
  'schedule.daily_report': ['analytics'],
  'schedule.campaign_check': ['marketing'],
  'schedule.seo_audit': ['technical'],
}

// ---- Functions ----

/**
 * Dispatch a trigger to the appropriate agent(s).
 *
 * 1. Looks up which agents handle this trigger type
 * 2. For each target agent, checks for entity-level conflicts
 * 3. Returns dispatch results (accepted or blocked by conflict)
 *
 * The caller is responsible for actually executing the agent action
 * based on the dispatch results.
 */
export async function dispatchTrigger(trigger: AgentTrigger): Promise<DispatchResult[]> {
  const targetAgents = TRIGGER_ROUTING[trigger.trigger_type]

  if (!targetAgents || targetAgents.length === 0) {
    return [{
      agent_type: 'analytics' as AgentType, // default fallback
      accepted: false,
      reason: `No agents registered for trigger type: ${trigger.trigger_type}`,
    }]
  }

  // Filter out the source agent (don't dispatch to yourself)
  const agents = trigger.source_agent
    ? targetAgents.filter((a) => a !== trigger.source_agent)
    : targetAgents

  const results: DispatchResult[] = []

  for (const agentType of agents) {
    // Check for conflicts if this trigger targets a specific entity
    if (trigger.entity_type && trigger.entity_id) {
      const conflict = await resolveConflicts(
        trigger.store_id,
        agentType,
        trigger.entity_type,
        trigger.entity_id
      )

      if (conflict.has_conflict && conflict.winner !== agentType) {
        results.push({
          agent_type: agentType,
          accepted: false,
          conflict,
          reason: `Blocked by ${conflict.winner} (higher priority, active on same entity)`,
        })
        continue
      }
    }

    results.push({
      agent_type: agentType,
      accepted: true,
    })
  }

  return results
}

/**
 * Check if another agent has recently acted on the same entity.
 * "Recently" = within CONFLICT_WINDOW_MS (5 minutes).
 *
 * If a conflict is found, the higher-priority agent wins.
 */
export async function resolveConflicts(
  store_id: string,
  agent_type: AgentType,
  entity_type: string,
  entity_id: string
): Promise<ConflictResult> {
  const supabase = getSupabaseAdmin()

  const windowStart = new Date(Date.now() - CONFLICT_WINDOW_MS).toISOString()

  // Find recent actions on the same entity by OTHER agents
  const { data: recentActions, error } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('store_id', store_id)
    .eq('related_entity_type', entity_type)
    .eq('related_entity_id', entity_id)
    .neq('agent_type', agent_type)
    .gte('created_at', windowStart)
    .in('status', ['completed', 'requires_approval'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`Failed to check conflicts: ${error.message}`)
  }

  if (!recentActions || recentActions.length === 0) {
    return { has_conflict: false }
  }

  const conflictingAction = recentActions[0] as AgentAction
  const otherAgent = conflictingAction.agent_type

  // Determine winner by priority
  const myPriority = AGENT_PRIORITY[agent_type]
  const theirPriority = AGENT_PRIORITY[otherAgent]

  const winner = myPriority >= theirPriority ? agent_type : otherAgent
  const loser = winner === agent_type ? otherAgent : agent_type

  return {
    has_conflict: true,
    conflicting_action: conflictingAction,
    winner,
    loser,
    reason: `${otherAgent} acted on ${entity_type}:${entity_id} at ${conflictingAction.created_at}. ` +
      `${winner} wins (priority ${AGENT_PRIORITY[winner]} vs ${AGENT_PRIORITY[loser]}).`,
  }
}

/**
 * Send a notification from one agent to another.
 * Stored in the agent_actions table as a special 'cross_agent_notification' action type.
 *
 * Use cases:
 * - Analytics detects anomaly → notifies Marketing to pause campaigns
 * - Support gets complaint about product → notifies Sales about quality issue
 * - Technical finds broken images → notifies Marketing to update assets
 */
export async function crossAgentNotify(notification: CrossAgentNotification): Promise<void> {
  const supabase = getSupabaseAdmin()

  // Store as an agent action so it appears in the activity feed
  const { error } = await supabase
    .from('agent_actions')
    .insert({
      store_id: notification.store_id,
      agent_type: notification.from_agent,
      action_type: 'cross_agent_notification',
      action_category: 'communication',
      summary: `Notification to ${notification.to_agent}: ${notification.notification_type}`,
      details: {
        to_agent: notification.to_agent,
        notification_type: notification.notification_type,
        payload: notification.payload,
      },
      status: 'completed',
      execution_mode: 'auto',
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost_usd: 0,
      api_costs: {},
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: 0,
    })

  if (error) {
    throw new Error(`Failed to send cross-agent notification: ${error.message}`)
  }
}

/**
 * Get pending cross-agent notifications for a specific agent.
 * Returns notifications that haven't been acknowledged yet.
 */
export async function getPendingNotifications(
  store_id: string,
  agent_type: AgentType,
  since?: string
): Promise<AgentAction[]> {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('agent_actions')
    .select('*')
    .eq('store_id', store_id)
    .eq('action_type', 'cross_agent_notification')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(20)

  if (since) {
    query = query.gte('created_at', since)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get notifications: ${error.message}`)
  }

  // Filter to notifications addressed to this agent
  const notifications = (data ?? []) as AgentAction[]
  return notifications.filter(
    (action) => (action.details as Record<string, unknown>)?.to_agent === agent_type
  )
}

/**
 * Get the trigger routing table.
 * Useful for the frontend to show which agents respond to which events.
 */
export function getTriggerRouting(): Record<string, AgentType[]> {
  return { ...TRIGGER_ROUTING }
}

/**
 * Register a custom trigger route (for extensibility).
 */
export function registerTriggerRoute(triggerType: string, agents: AgentType[]): void {
  TRIGGER_ROUTING[triggerType] = agents
}
