# Phase 2A: Core Agent Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core backend engine that powers all 5 agents — state machine transitions, base agent class with LLM tool-loop execution, model routing by complexity/budget, cost tracking per-store, and a tool registry for permission-checked tool discovery.

**Architecture:** All modules live in `src/lib/agents/` and operate on the existing Supabase tables from migration `031_agent_infrastructure.sql`. The base agent class uses the existing Vercel AI SDK (`generateText` + tools) pattern from `lib/ai/bot/` but generalized. Model routing uses Google Gemini exclusively — Gemini 2.0 Flash for all tiers (fast/standard use default, advanced/premium use with thinking enabled when available). No Anthropic/Claude in the agent backend. Service role (`getSupabaseAdmin()`) is used for all agent backend operations to bypass RLS.

**Tech Stack:** Next.js 16.1, Vercel AI SDK (`ai`, `@ai-sdk/google`), Supabase PostgreSQL (service role), TypeScript 5, Zod validation

**Spec:** `docs/PRD.md` — Phase 2 (lines 2577 to 2635), Section 6.4 Agent Runtime (lines 2156 to 2312)

**Depends on:** Phase 0 (types, constants, DB schema) — completed. Phase 1A (shell UI) — completed.

---

## File Structure

### New Files
```
src/lib/agents/
├── state-machine.ts        — Agent status transitions with validation
├── base-agent.ts           — Abstract class: execute(), buildSystemPrompt(), wrapToolsWithApproval()
├── model-router.ts         — Select LLM model by task complexity + budget constraints
├── cost-tracker.ts         — Track token usage, compute costs, enforce budgets
├── tool-registry.ts        — Register, discover, permission-check tools per agent type
└── db.ts                   — Shared Supabase queries for agent_states, agent_actions
```

### Modified Files
```
src/lib/agents/types.ts     — Add AgentTrigger, AgentResult, ModelTier, ToolDefinition types
src/lib/agents/constants.ts — Update MODEL_TIERS with actual model references
```

---

### Task 1: Add AgentTrigger, AgentResult, and Supporting Types

**Files:**
- Modify: `src/lib/agents/types.ts`

- [ ] **Step 1: Fix ActionStatus to match DB constraint**

In `src/lib/agents/types.ts`, replace the existing `ActionStatus` type (line 34) to align with the DB `agent_actions.status` CHECK constraint:

```typescript
// Old: 'completed' | 'failed' | 'pending_approval' | 'approved' | 'rejected' | 'expired' | 'cancelled'
// DB:  'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'rolled_back' | 'requires_approval'
export type ActionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'rolled_back' | 'requires_approval'
```

Also fix `ScheduleRunStatus` (line 105) to match DB (`success` not `completed`):

```typescript
export type ScheduleRunStatus = 'success' | 'failed' | 'skipped'
```

- [ ] **Step 2: Add new types to types.ts**

Append these types at the end of `src/lib/agents/types.ts`:

```typescript
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
  taskType?: string          // e.g. 'daily_seo_audit', 'cart_recovery_scan'
  complexity?: ModelTier     // hint for model selection
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
  riskLevel: 'low' | 'medium' | 'high'    // low=auto at level 3+, medium=auto at level 4+, high=always needs approval (except level 5)
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to the new types

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/types.ts
git commit -m "feat: add agent execution, tool registry, and state machine types"
```

---

### Task 2: State Machine

**Files:**
- Create: `src/lib/agents/state-machine.ts`

- [ ] **Step 1: Create state machine module**

```typescript
// src/lib/agents/state-machine.ts
// Agent state machine: validates and applies status transitions

import type { AgentStatus, AgentEvent } from './types'

/**
 * Valid state transitions map.
 * Key = current status, Value = map of event → next status.
 */
const TRANSITIONS: Record<AgentStatus, Partial<Record<AgentEvent, AgentStatus>>> = {
  idle: {
    start_execution: 'running',
    pause: 'paused',
  },
  running: {
    request_approval: 'waiting_approval',
    execution_complete: 'idle',
    execution_error: 'error',
    pause: 'paused',
  },
  waiting_approval: {
    approval_resolved: 'running',
    execution_complete: 'idle',
    pause: 'paused',
    reset: 'idle',
  },
  paused: {
    resume: 'idle',
    reset: 'idle',
  },
  error: {
    reset: 'idle',
    start_execution: 'running', // retry
  },
}

export interface TransitionResult {
  success: boolean
  fromStatus: AgentStatus
  toStatus: AgentStatus
  event: AgentEvent
  error?: string
}

/**
 * Compute the next state for a given current status and event.
 * Returns the result with success/failure and the new status.
 */
export function transitionState(currentStatus: AgentStatus, event: AgentEvent): TransitionResult {
  const validTransitions = TRANSITIONS[currentStatus]
  const nextStatus = validTransitions?.[event]

  if (!nextStatus) {
    return {
      success: false,
      fromStatus: currentStatus,
      toStatus: currentStatus,
      event,
      error: `Invalid transition: cannot apply event '${event}' in status '${currentStatus}'`,
    }
  }

  return {
    success: true,
    fromStatus: currentStatus,
    toStatus: nextStatus,
    event,
  }
}

/**
 * Check if a transition is valid without applying it.
 */
export function canTransition(currentStatus: AgentStatus, event: AgentEvent): boolean {
  return TRANSITIONS[currentStatus]?.[event] !== undefined
}

/**
 * Get all valid events for a given status.
 */
export function getValidEvents(currentStatus: AgentStatus): AgentEvent[] {
  const transitions = TRANSITIONS[currentStatus]
  return transitions ? (Object.keys(transitions) as AgentEvent[]) : []
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/state-machine.ts
git commit -m "feat: add agent state machine with transition validation"
```

---

### Task 3: Agent Database Operations

**Files:**
- Create: `src/lib/agents/db.ts`

- [ ] **Step 1: Create shared database operations module**

```typescript
// src/lib/agents/db.ts
// Shared Supabase queries for agent infrastructure tables.
// All queries use service role to bypass RLS (agents run server-side).

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
    .eq('status', 'pending') // only resolve if still pending

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

  // Use raw SQL for atomic increment to avoid race conditions
  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIndex = 3 // $1=storeId, $2=agentType

  if (counters.total_actions) {
    setClauses.push(`total_actions = total_actions + $${paramIndex}`)
    values.push(counters.total_actions)
    paramIndex++
  }
  if (counters.total_approvals_requested) {
    setClauses.push(`total_approvals_requested = total_approvals_requested + $${paramIndex}`)
    values.push(counters.total_approvals_requested)
    paramIndex++
  }
  if (counters.total_approvals_granted) {
    setClauses.push(`total_approvals_granted = total_approvals_granted + $${paramIndex}`)
    values.push(counters.total_approvals_granted)
    paramIndex++
  }
  if (counters.total_approvals_rejected) {
    setClauses.push(`total_approvals_rejected = total_approvals_rejected + $${paramIndex}`)
    values.push(counters.total_approvals_rejected)
    paramIndex++
  }

  if (setClauses.length === 0) return true

  const { error } = await supabase.rpc('exec_sql', {
    query: `UPDATE agent_states SET ${setClauses.join(', ')} WHERE store_id = $1 AND agent_type = $2`,
    params: [storeId, agentType, ...values],
  }).catch(() => {
    // Fallback: non-atomic update if RPC not available
    return { error: { message: 'RPC not available' } }
  })

  if (error) {
    // Fallback: read-then-update (not atomic but works without RPC)
    const state = await getAgentState(storeId, agentType)
    if (!state) return false

    const updates: Record<string, number> = {}
    if (counters.total_actions) updates.total_actions = state.total_actions + counters.total_actions
    if (counters.total_approvals_requested) updates.total_approvals_requested = state.total_approvals_requested + counters.total_approvals_requested
    if (counters.total_approvals_granted) updates.total_approvals_granted = state.total_approvals_granted + counters.total_approvals_granted
    if (counters.total_approvals_rejected) updates.total_approvals_rejected = state.total_approvals_rejected + counters.total_approvals_rejected

    const { error: updateError } = await supabase
      .from('agent_states')
      .update(updates)
      .eq('store_id', storeId)
      .eq('agent_type', agentType)

    return !updateError
  }

  return true
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/db.ts
git commit -m "feat: add agent database operations (states, actions, approvals)"
```

---

### Task 4: Constants Update + Cost Tracker

**Files:**
- Modify: `src/lib/agents/constants.ts`
- Create: `src/lib/agents/cost-tracker.ts`

> **Note:** Cost tracker is created before model router because model-router imports from cost-tracker.

- [ ] **Step 1: Update MODEL_TIERS in constants.ts**

Replace the existing `MODEL_TIERS` block in `src/lib/agents/constants.ts`:

```typescript
/**
 * MODEL TIERS
 * Maps tier names to model IDs and per-1k-token pricing.
 * All tiers use Google Gemini. Fast/Standard = Flash, Advanced/Premium = Flash (larger context/thinking).
 */
export const MODEL_TIERS = {
  fast: {
    label: 'Fast',
    provider: 'google' as const,
    modelId: 'gemini-2.0-flash',
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
  },
  standard: {
    label: 'Standard',
    provider: 'google' as const,
    modelId: 'gemini-2.0-flash',
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
  },
  advanced: {
    label: 'Advanced',
    provider: 'google' as const,
    modelId: 'gemini-2.0-flash',
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
  },
  premium: {
    label: 'Premium',
    provider: 'google' as const,
    modelId: 'gemini-2.0-flash',
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
  },
} as const
```

- [ ] **Step 2: Create cost-tracker.ts (MUST be created before model-router)**

See Task 5 below — create `cost-tracker.ts` first since `model-router.ts` imports from it.

- [ ] **Step 3: Create model-router.ts**

```typescript
// src/lib/agents/model-router.ts
// Selects the appropriate LLM model based on task complexity, budget, and agent type.

import { google } from '@/lib/ai/provider'
import { MODEL_TIERS, DEFAULT_BUDGET_LIMITS } from './constants'
import type { ModelTier, ModelConfig, AgentType } from './types'
import { getMonthlyUsage } from './cost-tracker'

/**
 * Select the best model for a given task based on complexity and budget.
 *
 * Rules:
 * - Default tier: fast (routine/scheduled tasks)
 * - Content generation / moderate reasoning: standard
 * - Multi-entity analysis, strategy, high-stakes: advanced
 * - Critical decisions (explicitly configured): premium
 * - Budget >80% consumed: downgrade non-critical by one tier
 * - Budget 100%: force fast tier only
 */
export async function selectModel(
  storeId: string,
  options?: {
    requestedTier?: ModelTier
    agentType?: AgentType
    budgetLimitUsd?: number
  }
): Promise<ModelConfig> {
  const requestedTier = options?.requestedTier || 'fast'
  const budgetLimit = options?.budgetLimitUsd ?? DEFAULT_BUDGET_LIMITS.pro

  // Check current budget usage
  let effectiveTier = requestedTier
  try {
    const usage = await getMonthlyUsage(storeId)
    if (usage) {
      const percentUsed = budgetLimit > 0 ? (usage.total_llm_cost_usd / budgetLimit) * 100 : 0

      if (percentUsed >= 100) {
        // Budget exhausted: force fast only
        effectiveTier = 'fast'
      } else if (percentUsed >= 80) {
        // Budget warning: downgrade by one tier
        effectiveTier = downgradeTier(requestedTier)
      }
    }
  } catch {
    // If budget check fails, use requested tier
  }

  const tierConfig = MODEL_TIERS[effectiveTier]

  return {
    tier: effectiveTier,
    modelId: tierConfig.modelId,
    costPer1kInput: tierConfig.costPer1kInput,
    costPer1kOutput: tierConfig.costPer1kOutput,
  }
}

/**
 * Get the Vercel AI SDK model instance for a given tier.
 */
export function getModelForTier(tier: ModelTier) {
  const config = MODEL_TIERS[tier]
  return google(config.modelId)
}

/**
 * Downgrade a tier by one level.
 */
function downgradeTier(tier: ModelTier): ModelTier {
  const order: ModelTier[] = ['fast', 'standard', 'advanced', 'premium']
  const idx = order.indexOf(tier)
  return idx > 0 ? order[idx - 1] : 'fast'
}

/**
 * Estimate cost for a given number of tokens at a tier.
 */
export function estimateCost(tier: ModelTier, tokensInput: number, tokensOutput: number): number {
  const config = MODEL_TIERS[tier]
  return (tokensInput / 1000) * config.costPer1kInput + (tokensOutput / 1000) * config.costPer1kOutput
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/agents/model-router.ts src/lib/agents/constants.ts src/lib/agents/cost-tracker.ts
git commit -m "feat: add model router and cost tracker with budget-aware tier selection"
```

---

### Task 5: Cost Tracker

**Files:**
- Create: `src/lib/agents/cost-tracker.ts`
- **IMPORTANT:** This file must be created BEFORE model-router.ts (Step 2 of Task 4 points here)

- [ ] **Step 1: Create cost tracker module**

```typescript
// src/lib/agents/cost-tracker.ts
// Tracks per-store LLM token usage and costs, enforces monthly budgets.

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { MODEL_TIERS, DEFAULT_BUDGET_LIMITS } from './constants'
import type { AgentType, AgentCostTracking, ModelTier } from './types'

/**
 * Get the current month's usage record for a store.
 * Creates one if it doesn't exist.
 */
export async function getMonthlyUsage(storeId: string): Promise<AgentCostTracking | null> {
  const supabase = getSupabaseAdmin()
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Try to get existing record
  const { data, error } = await supabase
    .from('agent_cost_tracking')
    .select('*')
    .eq('store_id', storeId)
    .eq('period_start', periodStart)
    .single()

  if (data) return data as AgentCostTracking

  // Create new record for this month
  if (error?.code === 'PGRST116') {
    const { data: newRecord } = await supabase
      .from('agent_cost_tracking')
      .insert({
        store_id: storeId,
        period_start: periodStart,
        period_end: periodEnd,
        budget_limit_usd: DEFAULT_BUDGET_LIMITS.pro,
      })
      .select()
      .single()

    return (newRecord as AgentCostTracking) || null
  }

  return null
}

/**
 * Record token usage from an agent action.
 * Updates monthly totals and per-agent breakdowns.
 */
export async function trackUsage(params: {
  storeId: string
  agentType: AgentType
  modelUsed: string
  tokensInput: number
  tokensOutput: number
}): Promise<{ costUsd: number; budgetRemaining: number; percentUsed: number } | null> {
  const usage = await getMonthlyUsage(params.storeId)
  if (!usage) return null

  // Calculate cost based on model
  const tier = getTierForModel(params.modelUsed)
  const tierConfig = MODEL_TIERS[tier]
  const costUsd =
    (params.tokensInput / 1000) * tierConfig.costPer1kInput +
    (params.tokensOutput / 1000) * tierConfig.costPer1kOutput

  // Update per-agent breakdown
  const costByAgent = { ...(usage.cost_by_agent as Record<string, number>) }
  costByAgent[params.agentType] = (costByAgent[params.agentType] || 0) + costUsd

  const tokensByAgent = { ...(usage.tokens_by_agent as Record<string, { input: number; output: number }>) }
  const agentTokens = tokensByAgent[params.agentType] || { input: 0, output: 0 }
  tokensByAgent[params.agentType] = {
    input: agentTokens.input + params.tokensInput,
    output: agentTokens.output + params.tokensOutput,
  }

  const newTotalCost = usage.total_llm_cost_usd + costUsd
  const budgetLimit = usage.budget_limit_usd ?? DEFAULT_BUDGET_LIMITS.pro
  const percentUsed = budgetLimit > 0 ? (newTotalCost / budgetLimit) * 100 : 0

  const supabase = getSupabaseAdmin()
  await supabase
    .from('agent_cost_tracking')
    .update({
      total_tokens_input: usage.total_tokens_input + params.tokensInput,
      total_tokens_output: usage.total_tokens_output + params.tokensOutput,
      total_llm_cost_usd: newTotalCost,
      cost_by_agent: costByAgent,
      tokens_by_agent: tokensByAgent,
      budget_alert_sent: percentUsed >= 80 ? true : usage.budget_alert_sent,
    })
    .eq('id', usage.id)

  return {
    costUsd,
    budgetRemaining: Math.max(0, budgetLimit - newTotalCost),
    percentUsed,
  }
}

/**
 * Check if a store has budget remaining for agent execution.
 */
export async function checkBudget(storeId: string): Promise<{
  remaining: number
  percentUsed: number
  canUseAdvancedModel: boolean
  isExhausted: boolean
}> {
  const usage = await getMonthlyUsage(storeId)
  if (!usage) {
    return { remaining: DEFAULT_BUDGET_LIMITS.pro, percentUsed: 0, canUseAdvancedModel: true, isExhausted: false }
  }

  const budgetLimit = usage.budget_limit_usd ?? DEFAULT_BUDGET_LIMITS.pro
  const percentUsed = budgetLimit > 0 ? (usage.total_llm_cost_usd / budgetLimit) * 100 : 0

  return {
    remaining: Math.max(0, budgetLimit - usage.total_llm_cost_usd),
    percentUsed,
    canUseAdvancedModel: percentUsed < 80,
    isExhausted: percentUsed >= 100,
  }
}

/**
 * Map a model ID string back to a tier for pricing lookup.
 */
function getTierForModel(modelId: string): ModelTier {
  for (const [tier, config] of Object.entries(MODEL_TIERS)) {
    if (config.modelId === modelId) return tier as ModelTier
  }
  return 'fast' // default fallback
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/cost-tracker.ts
git commit -m "feat: add cost tracker with monthly budget tracking and enforcement"
```

---

### Task 6: Tool Registry

**Files:**
- Create: `src/lib/agents/tool-registry.ts`

- [ ] **Step 1: Create tool registry module**

```typescript
// src/lib/agents/tool-registry.ts
// Central registry for all agent tools. Handles discovery, permission checking,
// and approval wrapping based on autonomy level.

import type { AgentType, AgentToolDefinition, AutonomyLevel } from './types'

// In-memory registry — tools are registered at import time by each agent module
const registry = new Map<string, AgentToolDefinition>()

/**
 * Register a tool for a specific agent type.
 */
export function registerTool(definition: AgentToolDefinition): void {
  const key = `${definition.agentType}:${definition.name}`
  registry.set(key, definition)
}

/**
 * Register multiple tools at once.
 */
export function registerTools(definitions: AgentToolDefinition[]): void {
  for (const def of definitions) {
    registerTool(def)
  }
}

/**
 * Get all registered tools for a specific agent type.
 */
export function getToolsForAgent(agentType: AgentType): AgentToolDefinition[] {
  const tools: AgentToolDefinition[] = []
  for (const [key, def] of registry.entries()) {
    if (def.agentType === agentType) {
      tools.push(def)
    }
  }
  return tools
}

/**
 * Check if a specific tool requires approval at the given autonomy level.
 *
 * Risk level mapping:
 * - low: auto-execute at autonomy 3+ (Smart Auto and above)
 * - medium: auto-execute at autonomy 4+ (Autonomous and above)
 * - high: always requires approval, except at autonomy 5 (Full Auto)
 */
export function checkToolPermission(
  agentType: AgentType,
  toolName: string,
  autonomyLevel: AutonomyLevel,
  args: Record<string, unknown> = {}
): { allowed: boolean; requiresApproval: boolean } {
  const key = `${agentType}:${toolName}`
  const def = registry.get(key)

  if (!def) {
    return { allowed: false, requiresApproval: false }
  }

  // Level 1 (Observer): everything needs approval
  if (autonomyLevel === 1) {
    return { allowed: true, requiresApproval: true }
  }

  // Level 5 (Full Auto): nothing needs approval
  if (autonomyLevel === 5) {
    return { allowed: true, requiresApproval: false }
  }

  // Check the tool's custom requiresApproval function first
  if (def.requiresApproval(autonomyLevel, args)) {
    return { allowed: true, requiresApproval: true }
  }

  // Fallback to risk-level based logic
  switch (def.riskLevel) {
    case 'low':
      return { allowed: true, requiresApproval: autonomyLevel < 3 }
    case 'medium':
      return { allowed: true, requiresApproval: autonomyLevel < 4 }
    case 'high':
      return { allowed: true, requiresApproval: true }
    default:
      return { allowed: true, requiresApproval: true }
  }
}

/**
 * Get a single tool definition.
 */
export function getToolDefinition(agentType: AgentType, toolName: string): AgentToolDefinition | undefined {
  return registry.get(`${agentType}:${toolName}`)
}

/**
 * Get count of registered tools per agent type.
 */
export function getRegisteredToolCount(): Record<AgentType, number> {
  const counts: Record<AgentType, number> = {
    marketing: 0,
    sales: 0,
    support: 0,
    analytics: 0,
    technical: 0,
  }
  for (const def of registry.values()) {
    counts[def.agentType] = (counts[def.agentType] || 0) + 1
  }
  return counts
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/tool-registry.ts
git commit -m "feat: add tool registry with permission checking and approval wrapping"
```

---

### Task 7: Base Agent Class

**Files:**
- Create: `src/lib/agents/base-agent.ts`

This is the most critical file — the abstract class that all 5 agents extend. It handles the full execution lifecycle: load state → check budget → select model → call LLM with tools → handle approvals → log actions → track costs → broadcast.

- [ ] **Step 1: Create base agent class**

```typescript
// src/lib/agents/base-agent.ts
// Abstract base class for all autonomous agents.
// Handles: state machine, LLM tool loop, approval wrapping, cost tracking, activity logging.

import { generateText, stepCountIs } from 'ai'
import { tool } from 'ai'
import { z } from 'zod'
import type {
  AgentType,
  AgentState,
  AgentTrigger,
  AgentResult,
  AgentActionResult,
  ModelTier,
  ActionCategory,
  AutonomyLevel,
} from './types'
import { transitionState } from './state-machine'
import {
  getAgentState,
  updateAgentStatus,
  logAgentAction,
  createApproval,
  incrementAgentCounters,
} from './db'
import { selectModel, getModelForTier } from './model-router'
import { trackUsage, checkBudget } from './cost-tracker'
import { checkToolPermission } from './tool-registry'
import { logger } from '@/lib/logger'

export interface AgentToolConfig {
  name: string
  description: string
  inputSchema: z.ZodType
  category: ActionCategory
  riskLevel: 'low' | 'medium' | 'high'
  execute: (args: Record<string, unknown>, context: AgentExecutionContext) => Promise<{
    success: boolean
    data?: unknown
    summary: string
    relatedEntityType?: string
    relatedEntityId?: string
  }>
}

export interface AgentExecutionContext {
  storeId: string
  agentType: AgentType
  autonomyLevel: AutonomyLevel
  state: AgentState
}

export abstract class BaseAgent {
  abstract readonly agentType: AgentType
  abstract readonly displayName: string

  /**
   * Build the system prompt for this agent. Subclasses provide agent-specific context.
   */
  abstract buildSystemPrompt(state: AgentState, trigger: AgentTrigger): string

  /**
   * Get the tools this agent can use. Subclasses define agent-specific tools.
   */
  abstract getTools(): AgentToolConfig[]

  /**
   * Main execution entry point. Called by API routes, cron jobs, or orchestrator.
   */
  async execute(trigger: AgentTrigger): Promise<AgentResult> {
    const startTime = Date.now()
    const actions: AgentActionResult[] = []

    // 1. Load agent state
    const state = await getAgentState(trigger.storeId, this.agentType)
    if (!state) {
      logger.warn(`[${this.agentType}] No agent state found for store ${trigger.storeId}`)
      return this.skippedResult(startTime)
    }

    // 2. Check if agent is enabled and not paused
    if (!state.is_enabled || state.status === 'paused') {
      return this.skippedResult(startTime)
    }

    // 3. Check budget
    const budget = await checkBudget(trigger.storeId)
    if (budget.isExhausted) {
      logger.warn(`[${this.agentType}] Budget exhausted for store ${trigger.storeId}`)
      return this.skippedResult(startTime)
    }

    // 4. Transition to running
    const transition = transitionState(state.status, 'start_execution')
    if (!transition.success) {
      logger.warn(`[${this.agentType}] Cannot start: ${transition.error}`)
      return this.skippedResult(startTime)
    }
    await updateAgentStatus(trigger.storeId, this.agentType, 'running')

    try {
      // 5. Select model
      const modelConfig = await selectModel(trigger.storeId, {
        requestedTier: trigger.complexity || 'fast',
        agentType: this.agentType,
      })
      const model = getModelForTier(modelConfig.tier)

      // 6. Build system prompt
      const systemPrompt = this.buildSystemPrompt(state, trigger)

      // 7. Wrap tools with approval checking
      const wrappedTools = this.wrapToolsWithApproval(
        this.getTools(),
        state.autonomy_level,
        trigger.storeId,
        actions,
        state
      )

      // 8. Call LLM with tool loop
      const messages = trigger.messages || [{ role: 'user' as const, content: 'Execute your scheduled task.' }]

      const result = await generateText({
        model,
        system: systemPrompt,
        messages,
        tools: wrappedTools,
        stopWhen: stepCountIs(10),
      })

      // 9. Track costs
      const tokensInput = result.usage?.promptTokens || 0
      const tokensOutput = result.usage?.completionTokens || 0

      await trackUsage({
        storeId: trigger.storeId,
        agentType: this.agentType,
        modelUsed: modelConfig.modelId,
        tokensInput,
        tokensOutput,
      })

      // 10. Update state back to idle
      await updateAgentStatus(trigger.storeId, this.agentType, 'idle')
      await incrementAgentCounters(trigger.storeId, this.agentType, {
        total_actions: actions.length,
      })

      // 11. Update last_action_at
      if (actions.length > 0) {
        const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
        await getSupabaseAdmin()
          .from('agent_states')
          .update({ last_action_at: new Date().toISOString() })
          .eq('store_id', trigger.storeId)
          .eq('agent_type', this.agentType)
      }

      return {
        skipped: false,
        actions,
        tokensInput,
        tokensOutput,
        modelUsed: modelConfig.modelId,
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      // Error: transition to error state
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`[${this.agentType}] Execution error:`, errorMsg)

      await updateAgentStatus(trigger.storeId, this.agentType, 'error', {
        last_error: errorMsg,
        error_count: (state.error_count || 0) + 1,
      })

      return {
        skipped: false,
        actions,
        tokensInput: 0,
        tokensOutput: 0,
        modelUsed: '',
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Wrap agent tools with approval-checking logic based on autonomy level.
   */
  private wrapToolsWithApproval(
    agentTools: AgentToolConfig[],
    autonomyLevel: AutonomyLevel,
    storeId: string,
    actionsCollector: AgentActionResult[],
    cachedState: AgentState
  ): Record<string, ReturnType<typeof tool>> {
    const wrapped: Record<string, ReturnType<typeof tool>> = {}

    for (const agentTool of agentTools) {
      wrapped[agentTool.name] = tool({
        description: agentTool.description,
        parameters: agentTool.inputSchema,
        execute: async (args: Record<string, unknown>) => {
          const permission = checkToolPermission(
            this.agentType,
            agentTool.name,
            autonomyLevel,
            args
          )

          if (!permission.allowed) {
            return { success: false, error: 'Tool not allowed for this agent' }
          }

          const context: AgentExecutionContext = {
            storeId,
            agentType: this.agentType,
            autonomyLevel,
            state: cachedState,
          }

          if (permission.requiresApproval) {
            // Create approval request instead of executing
            const approvalId = await createApproval({
              storeId,
              agentType: this.agentType,
              actionType: agentTool.name,
              summary: `${this.displayName} wants to execute: ${agentTool.name}`,
              reasoning: `Tool "${agentTool.name}" requires approval at autonomy level ${autonomyLevel}`,
              details: args,
            })

            await logAgentAction({
              storeId,
              agentType: this.agentType,
              actionType: agentTool.name,
              actionCategory: agentTool.category,
              summary: `Requested approval: ${agentTool.name}`,
              details: args,
              status: 'requires_approval',
              executionMode: 'approved',
              approvalId: approvalId || undefined,
            })

            await incrementAgentCounters(storeId, this.agentType, {
              total_approvals_requested: 1,
            })

            actionsCollector.push({
              actionType: agentTool.name,
              actionCategory: agentTool.category,
              summary: `Requested approval: ${agentTool.name}`,
              details: args,
              status: 'pending_approval',
              executionMode: 'approved',
            })

            return {
              success: true,
              requiresApproval: true,
              message: 'Action submitted for merchant approval',
              approvalId,
            }
          }

          // Auto-execute
          const result = await agentTool.execute(args, context)

          await logAgentAction({
            storeId,
            agentType: this.agentType,
            actionType: agentTool.name,
            actionCategory: agentTool.category,
            summary: result.summary,
            details: { args, result: result.data },
            status: result.success ? 'completed' : 'failed',
            executionMode: 'auto',
            relatedEntityType: result.relatedEntityType,
            relatedEntityId: result.relatedEntityId,
          })

          actionsCollector.push({
            actionType: agentTool.name,
            actionCategory: agentTool.category,
            summary: result.summary,
            details: { args, result: result.data },
            status: result.success ? 'completed' : 'failed',
            executionMode: 'auto',
            relatedEntityType: result.relatedEntityType,
            relatedEntityId: result.relatedEntityId,
          })

          return result
        },
      })
    }

    return wrapped
  }

  private skippedResult(startTime: number): AgentResult {
    return {
      skipped: true,
      actions: [],
      tokensInput: 0,
      tokensOutput: 0,
      modelUsed: '',
      durationMs: Date.now() - startTime,
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors (or minor fixable issues)

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/base-agent.ts
git commit -m "feat: add BaseAgent abstract class with LLM tool loop, approvals, and cost tracking"
```

---

### Task 8: Verify Full Module Integration

- [ ] **Step 1: Run full TypeScript check**

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && npx tsc --noEmit --pretty 2>&1 | tail -30`
Expected: Clean compile or only pre-existing errors

- [ ] **Step 2: Verify imports resolve**

Create a quick smoke-test by checking that all modules can be imported together:

Run: `cd /Users/manan/Downloads/aistore_cursor/ai-store-builder && node -e "
const path = require('path');
const files = [
  'src/lib/agents/types.ts',
  'src/lib/agents/constants.ts',
  'src/lib/agents/state-machine.ts',
  'src/lib/agents/db.ts',
  'src/lib/agents/model-router.ts',
  'src/lib/agents/cost-tracker.ts',
  'src/lib/agents/tool-registry.ts',
  'src/lib/agents/base-agent.ts',
];
files.forEach(f => {
  const exists = require('fs').existsSync(f);
  console.log(exists ? '✓' : '✗', f);
});
"`
Expected: All 8 files show ✓

- [ ] **Step 3: Final commit with all Phase 2A files**

```bash
git add -A src/lib/agents/
git status
```

Verify only the expected files are staged, then:

```bash
git commit -m "feat: complete Phase 2A — core agent backend (state machine, base agent, model router, cost tracker, tool registry, DB operations)"
```

---

## Summary

| Task | File | Purpose |
|------|------|---------|
| 1 | `types.ts` (modify) | Fix ActionStatus/ScheduleRunStatus DB alignment + add AgentTrigger, AgentResult, ModelTier, AgentEvent |
| 2 | `state-machine.ts` | Status transitions: idle ↔ running ↔ waiting_approval ↔ error/paused |
| 3 | `db.ts` | Supabase CRUD for agent_states, agent_actions, agent_approvals (atomic counters) |
| 4 | `constants.ts` + `cost-tracker.ts` | Update MODEL_TIERS (Gemini-only), create cost tracker (must be before model-router) |
| 5 | `cost-tracker.ts` | Monthly token/cost tracking, budget enforcement |
| 6 | `model-router.ts` | Select model by tier + budget, downgrade when budget low (imports cost-tracker) |
| 7 | `tool-registry.ts` | Register tools, permission-check by autonomy level |
| 8 | `base-agent.ts` | Abstract class: execute() lifecycle, LLM call, approval wrapping, cached state |
| 9 | Integration verify | TypeScript compile check, file existence check |

**Next plan:** Phase 2B (memory, scheduler, orchestrator) → Phase 2C (API routes, real-time hooks, UI integration)
