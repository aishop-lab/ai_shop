// src/lib/agents/db.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type {
  AgentType,
  AgentState,
  AgentAction,
  AgentApproval,
  AgentStatus,
  AutonomyLevel,
  ActionCategory,
  ExecutionMode,
  ActionStatus,
  ApprovalPriority,
} from './types'

// ---- Agent States ----

export async function getAgentState(storeId: string, agentType: AgentType): Promise<AgentState | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('agent_states')
    .select('*')
    .eq('store_id', storeId)
    .eq('agent_type', agentType)
    .single()

  if (error || !data) return null
  return data as AgentState
}

export async function getAllAgentStates(storeId: string): Promise<AgentState[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('agent_states')
    .select('*')
    .eq('store_id', storeId)
    .order('agent_type')

  if (error || !data) return []
  return data as AgentState[]
}

export async function upsertAgentState(
  storeId: string,
  agentType: AgentType,
  updates: Partial<Pick<AgentState, 'status' | 'is_enabled' | 'autonomy_level' | 'config' | 'last_action_at' | 'last_error' | 'error_count' | 'total_actions' | 'total_approvals_requested' | 'total_approvals_granted' | 'total_approvals_rejected'>>
): Promise<AgentState | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('agent_states')
    .upsert(
      {
        store_id: storeId,
        agent_type: agentType,
        ...updates,
      },
      { onConflict: 'store_id,agent_type' }
    )
    .select()
    .single()

  if (error || !data) return null
  return data as AgentState
}

export async function updateAgentStatus(
  storeId: string,
  agentType: AgentType,
  status: AgentStatus,
  extras?: { last_error?: string; error_count?: number }
): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('agent_states')
    .update({ status, ...extras })
    .eq('store_id', storeId)
    .eq('agent_type', agentType)

  return !error
}

// ---- Agent Actions ----

export async function logAgentAction(params: {
  storeId: string
  agentType: AgentType
  actionType: string
  actionCategory: ActionCategory
  summary: string
  details?: Record<string, unknown>
  status?: ActionStatus
  executionMode: ExecutionMode
  approvalId?: string
  relatedEntityType?: string
  relatedEntityId?: string
  modelUsed?: string
  tokensInput?: number
  tokensOutput?: number
  estimatedCostUsd?: number
  startedAt?: string
  completedAt?: string
  durationMs?: number
}): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('agent_actions')
    .insert({
      store_id: params.storeId,
      agent_type: params.agentType,
      action_type: params.actionType,
      action_category: params.actionCategory,
      summary: params.summary,
      details: params.details || {},
      status: params.status || 'completed',
      execution_mode: params.executionMode,
      approval_id: params.approvalId,
      related_entity_type: params.relatedEntityType,
      related_entity_id: params.relatedEntityId,
      model_used: params.modelUsed,
      tokens_input: params.tokensInput || 0,
      tokens_output: params.tokensOutput || 0,
      estimated_cost_usd: params.estimatedCostUsd || 0,
      started_at: params.startedAt || new Date().toISOString(),
      completed_at: params.completedAt,
      duration_ms: params.durationMs,
    })
    .select('id')
    .single()

  if (error || !data) return null
  return data.id
}

export async function getActivityFeed(
  storeId: string,
  options?: {
    agentType?: AgentType
    limit?: number
    offset?: number
  }
): Promise<AgentAction[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('agent_actions')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (options?.agentType) {
    query = query.eq('agent_type', options.agentType)
  }

  query = query.range(
    options?.offset || 0,
    (options?.offset || 0) + (options?.limit || 20) - 1
  )

  const { data, error } = await query
  if (error || !data) return []
  return data as AgentAction[]
}

// ---- Agent Approvals ----

export async function createApproval(params: {
  storeId: string
  agentType: AgentType
  actionType: string
  summary: string
  reasoning: string
  details?: Record<string, unknown>
  priority?: ApprovalPriority
  expiresAt?: string
}): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('agent_approvals')
    .insert({
      store_id: params.storeId,
      agent_type: params.agentType,
      action_type: params.actionType,
      summary: params.summary,
      reasoning: params.reasoning,
      details: params.details || {},
      priority: params.priority || 'normal',
      expires_at: params.expiresAt,
    })
    .select('id')
    .single()

  if (error || !data) return null
  return data.id
}

export async function getPendingApprovals(
  storeId: string,
  options?: { agentType?: AgentType; limit?: number }
): Promise<AgentApproval[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('agent_approvals')
    .select('*')
    .eq('store_id', storeId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (options?.agentType) {
    query = query.eq('agent_type', options.agentType)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as AgentApproval[]
}

export async function resolveApproval(
  approvalId: string,
  decision: 'approved' | 'rejected',
  resolvedBy: string,
  extras?: { rejectionReason?: string; modifications?: Record<string, unknown> }
): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('agent_approvals')
    .update({
      status: decision,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      rejection_reason: extras?.rejectionReason,
      modifications: extras?.modifications,
    })
    .eq('id', approvalId)
    .eq('status', 'pending')

  return !error
}

export async function expireStaleApprovals(): Promise<number> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('agent_approvals')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .not('expires_at', 'is', null)
    .select('id')

  if (error || !data) return 0
  return data.length
}

// ---- Increment helpers ----

export async function incrementAgentCounters(
  storeId: string,
  agentType: AgentType,
  counters: {
    total_actions?: number
    total_approvals_requested?: number
    total_approvals_granted?: number
    total_approvals_rejected?: number
  }
): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  // Read-then-update (Supabase JS doesn't support atomic increment natively)
  // For production scale, consider using a Postgres RPC function
  const state = await getAgentState(storeId, agentType)
  if (!state) return false

  const updates: Record<string, number> = {}
  if (counters.total_actions) updates.total_actions = state.total_actions + counters.total_actions
  if (counters.total_approvals_requested) updates.total_approvals_requested = state.total_approvals_requested + counters.total_approvals_requested
  if (counters.total_approvals_granted) updates.total_approvals_granted = state.total_approvals_granted + counters.total_approvals_granted
  if (counters.total_approvals_rejected) updates.total_approvals_rejected = state.total_approvals_rejected + counters.total_approvals_rejected

  if (Object.keys(updates).length === 0) return true

  const { error } = await supabase
    .from('agent_states')
    .update(updates)
    .eq('store_id', storeId)
    .eq('agent_type', agentType)

  return !error
}
