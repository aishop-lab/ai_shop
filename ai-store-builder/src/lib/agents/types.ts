// Agent Platform TypeScript Types

// Agent Identity
export type AgentType = 'marketing' | 'sales' | 'support' | 'analytics' | 'technical'
export type AgentStatus = 'idle' | 'running' | 'waiting_approval' | 'paused' | 'error'
export type AutonomyLevel = 1 | 2 | 3 | 4 | 5

export interface AgentConfig {
  tone?: 'formal' | 'casual' | 'friendly' | 'professional'
  notification_preference?: 'all' | 'important' | 'none'
  [key: string]: unknown
}

// AgentState (maps to agent_states DB table)
export interface AgentState {
  id: string
  store_id: string
  agent_type: AgentType
  is_enabled: boolean
  autonomy_level: AutonomyLevel
  config: AgentConfig
  status: AgentStatus
  last_action_at: string | null
  last_error: string | null
  error_count: number
  total_actions: number
  total_approvals_requested: number
  total_approvals_granted: number
  total_approvals_rejected: number
  created_at: string
  updated_at: string
}

export type ActionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'rolled_back' | 'requires_approval'
export type ActionCategory = 'communication' | 'campaign' | 'optimization' | 'analysis' | 'maintenance'
export type ExecutionMode = 'auto' | 'approved' | 'manual'

// AgentAction (maps to agent_actions table)
export interface AgentAction {
  id: string
  store_id: string
  agent_type: AgentType
  sub_agent_type: string | null
  action_type: string
  action_category: ActionCategory
  summary: string
  details: Record<string, unknown>
  status: ActionStatus
  execution_mode: ExecutionMode
  approval_id: string | null
  related_entity_type: string | null
  related_entity_id: string | null
  model_used: string | null
  tokens_input: number
  tokens_output: number
  estimated_cost_usd: number
  api_costs: Record<string, number>
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  created_at: string
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled'
export type ApprovalPriority = 'low' | 'normal' | 'high' | 'urgent'

// AgentApproval (maps to agent_approvals table)
export interface AgentApproval {
  id: string
  store_id: string
  agent_type: AgentType
  sub_agent_type: string | null
  action_type: string
  summary: string
  reasoning: string
  details: Record<string, unknown>
  priority: ApprovalPriority
  expires_at: string | null
  status: ApprovalStatus
  resolved_by: string | null
  resolved_at: string | null
  rejection_reason: string | null
  modifications: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type MemoryType = 'preference' | 'pattern' | 'feedback' | 'context'
export type MemorySource = 'merchant_feedback' | 'data_analysis' | 'approval_pattern' | 'explicit_config'

// AgentMemory (maps to agent_memory table)
export interface AgentMemory {
  id: string
  store_id: string
  agent_type: AgentType
  memory_type: MemoryType
  memory_key: string
  memory_value: Record<string, unknown>
  confidence: number
  source: MemorySource
  source_action_id: string | null
  created_at: string
  updated_at: string
  expires_at: string | null
}

export type ScheduleRunStatus = 'success' | 'failed' | 'skipped'

// AgentSchedule (maps to agent_schedules table)
export interface AgentSchedule {
  id: string
  store_id: string
  agent_type: AgentType
  task_type: string
  schedule_cron: string
  timezone: string
  is_active: boolean
  config: Record<string, unknown>
  last_run_at: string | null
  next_run_at: string | null
  last_run_status: ScheduleRunStatus | null
  consecutive_failures: number
  created_at: string
  updated_at: string
}

export type ConnectionProvider = 'meta' | 'google_ads' | 'google_analytics' | 'google_search_console'
export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'error'

// ConnectedAccount (maps to connected_accounts table - tokens never exposed to frontend)
export interface ConnectedAccount {
  id: string
  store_id: string
  provider: ConnectionProvider
  provider_account_id: string | null
  provider_account_name: string | null
  scopes: string[]
  status: ConnectionStatus
  last_used_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

// AgentCostTracking (maps to agent_cost_tracking table)
export interface AgentCostTracking {
  id: string
  store_id: string
  period_start: string
  period_end: string
  total_tokens_input: number
  total_tokens_output: number
  total_llm_cost_usd: number
  cost_by_agent: Record<AgentType, number>
  tokens_by_agent: Record<AgentType, { input: number; output: number }>
  total_api_cost_usd: number
  api_cost_by_provider: Record<string, number>
  budget_limit_usd: number | null
  budget_alert_sent: boolean
  created_at: string
  updated_at: string
}

export type ConversationChannel = 'website_chat' | 'email' | 'whatsapp'
export type ConversationStatus = 'open' | 'resolved' | 'escalated' | 'waiting_customer'
export type ConversationAssignee = 'agent' | 'merchant'

// CustomerConversation (maps to customer_conversations table)
export interface CustomerConversation {
  id: string
  store_id: string
  customer_id: string | null
  channel: ConversationChannel
  channel_identifier: string | null
  status: ConversationStatus
  assigned_to: ConversationAssignee
  subject: string | null
  last_message_at: string | null
  message_count: number
  related_order_id: string | null
  related_product_id: string | null
  first_response_ms: number | null
  resolution_ms: number | null
  customer_satisfaction: number | null
  created_at: string
  updated_at: string
}

export type MessageRole = 'customer' | 'agent' | 'merchant'

export interface ConversationMessage {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

// ---- Agent Execution Types ----

export type ModelTier = 'fast' | 'standard' | 'advanced' | 'premium'

export interface ModelConfig {
  tier: ModelTier
  modelId: string
  costPer1kInput: number
  costPer1kOutput: number
}

export type TriggerSource = 'event' | 'cron' | 'chat' | 'cross_agent'

export interface AgentTrigger {
  storeId: string
  agentType: AgentType
  source: TriggerSource
  taskType?: string
  complexity?: ModelTier
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  context?: Record<string, unknown>
}

export interface AgentResult {
  skipped: boolean
  actions: AgentActionResult[]
  tokensInput: number
  tokensOutput: number
  modelUsed: string
  durationMs: number
}

export interface AgentActionResult {
  actionType: string
  actionCategory: ActionCategory
  summary: string
  details: Record<string, unknown>
  status: ActionStatus
  executionMode: ExecutionMode
  relatedEntityType?: string
  relatedEntityId?: string
}

// ---- Tool Registry Types ----

export interface AgentToolDefinition {
  name: string
  description: string
  agentType: AgentType
  requiresApproval: (autonomyLevel: AutonomyLevel, args: Record<string, unknown>) => boolean
  riskLevel: 'low' | 'medium' | 'high'
}

// ---- State Machine Types ----

export type AgentEvent =
  | 'start_execution'
  | 'request_approval'
  | 'approval_resolved'
  | 'execution_complete'
  | 'execution_error'
  | 'pause'
  | 'resume'
  | 'reset'
