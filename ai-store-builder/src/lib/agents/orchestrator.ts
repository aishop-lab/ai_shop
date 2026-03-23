// src/lib/agents/orchestrator.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { AgentType, AgentAction, ApprovalPriority } from './types'

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

// ---- Conflict Escalation ----

export interface ConflictEscalation {
  id: string
  store_id: string
  agents_involved: AgentType[]
  entity_type: string
  entity_id: string
  conflict_description: string
  auto_resolution?: string
  merchant_decision_required: boolean
  resolved: boolean
  resolution?: string
  created_at: string
}

/**
 * Escalate a conflict between two agents that cannot be auto-resolved.
 *
 * When two agents have the same priority or the conflict involves a high-stakes
 * decision (e.g., pricing change vs marketing campaign), this creates an
 * approval request for the merchant to decide.
 *
 * If priorities differ, attempts auto-resolution first. If priorities are equal,
 * the conflict is always escalated to the merchant.
 *
 * Returns the escalation/approval ID.
 */
export async function escalateConflict(
  storeId: string,
  agentA: AgentType,
  agentB: AgentType,
  entityType: string,
  entityId: string,
  description: string
): Promise<string> {
  const supabase = getSupabaseAdmin()

  const priorityA = AGENT_PRIORITY[agentA]
  const priorityB = AGENT_PRIORITY[agentB]
  const samePriority = priorityA === priorityB

  // Determine if we can auto-resolve or need merchant input
  let autoResolution: string | undefined
  let merchantDecisionRequired = true

  if (!samePriority) {
    const winner = priorityA > priorityB ? agentA : agentB
    const loser = winner === agentA ? agentB : agentA
    autoResolution = `Auto-resolved: ${winner} wins over ${loser} (priority ${AGENT_PRIORITY[winner]} vs ${AGENT_PRIORITY[loser]})`
    merchantDecisionRequired = false
  }

  // Determine urgency based on involved agents
  let priority: ApprovalPriority = 'normal'
  const involvedAgents = [agentA, agentB]
  if (involvedAgents.includes('support')) {
    priority = 'high' // Customer-facing conflicts are high priority
  }
  if (involvedAgents.includes('sales') && involvedAgents.includes('marketing')) {
    priority = 'high' // Revenue-impacting conflicts
  }

  // If merchant decision required, create an approval
  if (merchantDecisionRequired) {
    const { data, error } = await supabase
      .from('agent_approvals')
      .insert({
        store_id: storeId,
        agent_type: agentA, // Primary agent requesting resolution
        action_type: 'conflict_escalation',
        summary: `Conflict: ${agentA} vs ${agentB} on ${entityType}`,
        reasoning: description,
        details: {
          escalation: true,
          agents_involved: involvedAgents,
          entity_type: entityType,
          entity_id: entityId,
          conflict_description: description,
          auto_resolution: autoResolution ?? null,
          merchant_decision_required: merchantDecisionRequired,
        },
        priority,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to escalate conflict: ${error.message}`)
    }

    // Also log as an agent action for the activity feed
    await supabase
      .from('agent_actions')
      .insert({
        store_id: storeId,
        agent_type: agentA,
        action_type: 'conflict_escalation',
        action_category: 'communication',
        summary: `Escalated conflict with ${agentB} on ${entityType}:${entityId}`,
        details: {
          agents_involved: involvedAgents,
          entity_type: entityType,
          entity_id: entityId,
          description,
          approval_id: data.id,
          merchant_decision_required: true,
        },
        status: 'requires_approval',
        execution_mode: 'approved',
        approval_id: data.id,
        related_entity_type: entityType,
        related_entity_id: entityId,
        tokens_input: 0,
        tokens_output: 0,
        estimated_cost_usd: 0,
        api_costs: {},
        started_at: new Date().toISOString(),
        duration_ms: 0,
      })

    return data.id
  }

  // Auto-resolved: just log the action
  const { data, error } = await supabase
    .from('agent_actions')
    .insert({
      store_id: storeId,
      agent_type: agentA,
      action_type: 'conflict_auto_resolved',
      action_category: 'communication',
      summary: `Auto-resolved conflict with ${agentB} on ${entityType}:${entityId}`,
      details: {
        agents_involved: involvedAgents,
        entity_type: entityType,
        entity_id: entityId,
        description,
        auto_resolution: autoResolution,
        merchant_decision_required: false,
      },
      status: 'completed',
      execution_mode: 'auto',
      related_entity_type: entityType,
      related_entity_id: entityId,
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost_usd: 0,
      api_costs: {},
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: 0,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to log auto-resolved conflict: ${error.message}`)
  }

  return data.id
}

/**
 * Resolve a conflict escalation that was sent to the merchant.
 * Updates the approval record and logs the resolution.
 */
export async function resolveEscalation(
  escalationId: string,
  resolution: string,
  winningAgent: AgentType
): Promise<void> {
  const supabase = getSupabaseAdmin()

  // Update the approval
  const { data: approval, error: approvalError } = await supabase
    .from('agent_approvals')
    .update({
      status: 'approved',
      resolved_at: new Date().toISOString(),
      modifications: {
        resolution,
        winning_agent: winningAgent,
      },
    })
    .eq('id', escalationId)
    .eq('action_type', 'conflict_escalation')
    .select('*')
    .single()

  if (approvalError) {
    throw new Error(`Failed to resolve escalation: ${approvalError.message}`)
  }

  // Update the corresponding agent action
  const { error: actionError } = await supabase
    .from('agent_actions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      details: {
        ...(approval.details as Record<string, unknown>),
        resolved: true,
        resolution,
        winning_agent: winningAgent,
      },
    })
    .eq('approval_id', escalationId)
    .eq('action_type', 'conflict_escalation')

  if (actionError) {
    throw new Error(`Failed to update escalation action: ${actionError.message}`)
  }
}

/**
 * Get pending conflict escalations for a store.
 */
export async function getPendingEscalations(
  storeId: string
): Promise<ConflictEscalation[]> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('agent_approvals')
    .select('*')
    .eq('store_id', storeId)
    .eq('action_type', 'conflict_escalation')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get pending escalations: ${error.message}`)
  }

  return (data ?? []).map((row) => {
    const details = row.details as Record<string, unknown>
    return {
      id: row.id,
      store_id: row.store_id,
      agents_involved: (details.agents_involved as AgentType[]) ?? [],
      entity_type: (details.entity_type as string) ?? '',
      entity_id: (details.entity_id as string) ?? '',
      conflict_description: (details.conflict_description as string) ?? '',
      auto_resolution: details.auto_resolution as string | undefined,
      merchant_decision_required: (details.merchant_decision_required as boolean) ?? true,
      resolved: false,
      created_at: row.created_at,
    }
  })
}
