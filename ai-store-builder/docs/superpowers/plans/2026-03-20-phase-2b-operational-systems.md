# Phase 2B: Operational Systems — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three operational backend modules (memory, scheduler, orchestrator) that enable agents to learn from merchant behavior, run on schedules, and coordinate with each other.

**Architecture:** Memory stores per-store/per-agent learned preferences in `agent_memory` with confidence decay over time. Scheduler parses cron expressions via `cron-parser` to find due tasks and trigger agent execution. Orchestrator dispatches triggers to the correct agent, detects conflicts when two agents modify the same entity within a 5-minute window, and provides cross-agent notification.

**Tech Stack:** Next.js 16.1, Supabase PostgreSQL (service role), TypeScript 5

**Depends on:** Phase 2A (core agent backend) — types.ts, constants.ts, `getSupabaseAdmin()` from `@/lib/supabase/admin`

---

## File Structure

### New Files
```
src/lib/agents/
├── memory.ts          — Store, retrieve, decay agent memories; learn from approvals
├── scheduler.ts       — Cron parsing, due schedule lookup, execution trigger, run tracking
└── orchestrator.ts    — Trigger dispatch, conflict detection, cross-agent notifications
```

### Dependencies to Install
```
cron-parser            — Parse cron expressions and compute next run times
```

---

## Task 0: Install cron-parser

- [ ] **Step 1: Install the package**

```bash
npm install cron-parser
```

- [ ] **Step 2: Verify installation**

```bash
npx tsc --noEmit --moduleResolution bundler --esModuleInterop -c /dev/null 2>&1 | head -5
# Or simply: node -e "require('cron-parser')"
```

---

## Task 1: Agent Memory System

**Files:**
- Create: `src/lib/agents/memory.ts`

- [ ] **Step 1: Write the memory module**

```typescript
// src/lib/agents/memory.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { AgentType, AgentMemory, MemoryType, MemorySource } from './types'

// ---- Types ----

interface StoreMemoryInput {
  store_id: string
  agent_type: AgentType
  memory_type: MemoryType
  memory_key: string
  memory_value: Record<string, unknown>
  confidence: number
  source: MemorySource
  source_action_id?: string
  expires_at?: string
}

interface GetMemoriesOptions {
  store_id: string
  agent_type: AgentType
  memory_type?: MemoryType
  min_confidence?: number
  limit?: number
}

// ---- Constants ----

/** Confidence decay rate per day (multiplied by current confidence) */
const DAILY_DECAY_RATE = 0.98

/** Memories below this confidence are pruned during decay */
const MIN_CONFIDENCE_THRESHOLD = 0.1

/** How much to boost confidence when an approval pattern is confirmed */
const APPROVAL_CONFIDENCE_BOOST = 0.15

/** Max confidence value */
const MAX_CONFIDENCE = 1.0

// ---- Functions ----

/**
 * Store a memory for an agent. Uses upsert on (store_id, agent_type, memory_key).
 * If the memory already exists, updates value and confidence.
 */
export async function storeMemory(input: StoreMemoryInput): Promise<AgentMemory> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('agent_memory')
    .upsert(
      {
        store_id: input.store_id,
        agent_type: input.agent_type,
        memory_type: input.memory_type,
        memory_key: input.memory_key,
        memory_value: input.memory_value,
        confidence: Math.min(input.confidence, MAX_CONFIDENCE),
        source: input.source,
        source_action_id: input.source_action_id ?? null,
        expires_at: input.expires_at ?? null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'store_id,agent_type,memory_key',
      }
    )
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to store memory: ${error.message}`)
  }

  return data as AgentMemory
}

/**
 * Retrieve memories for a given agent/store, optionally filtered by type and minimum confidence.
 * Results are ordered by confidence descending.
 * Automatically excludes expired memories.
 */
export async function getMemories(options: GetMemoriesOptions): Promise<AgentMemory[]> {
  const supabase = getSupabaseAdmin()
  const { store_id, agent_type, memory_type, min_confidence = 0, limit = 50 } = options

  let query = supabase
    .from('agent_memory')
    .select('*')
    .eq('store_id', store_id)
    .eq('agent_type', agent_type)
    .gte('confidence', min_confidence)
    .order('confidence', { ascending: false })
    .limit(limit)

  if (memory_type) {
    query = query.eq('memory_type', memory_type)
  }

  // Exclude expired memories
  query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get memories: ${error.message}`)
  }

  return (data ?? []) as AgentMemory[]
}

/**
 * Get a single memory by key.
 */
export async function getMemoryByKey(
  store_id: string,
  agent_type: AgentType,
  memory_key: string
): Promise<AgentMemory | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('store_id', store_id)
    .eq('agent_type', agent_type)
    .eq('memory_key', memory_key)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to get memory by key: ${error.message}`)
  }

  return data as AgentMemory | null
}

/**
 * Apply time-based confidence decay to all memories for a store.
 * Called periodically (e.g., daily via cron).
 *
 * - Multiplies each memory's confidence by DAILY_DECAY_RATE^daysSinceUpdate
 * - Deletes memories that fall below MIN_CONFIDENCE_THRESHOLD
 * - Skips memories of type 'explicit_config' (merchant-set, never decay)
 *
 * Returns: { decayed: number, pruned: number }
 */
export async function decayMemories(store_id: string): Promise<{ decayed: number; pruned: number }> {
  const supabase = getSupabaseAdmin()

  // Fetch all non-explicit memories for this store
  const { data: memories, error } = await supabase
    .from('agent_memory')
    .select('id, confidence, updated_at, source')
    .eq('store_id', store_id)
    .neq('source', 'explicit_config')

  if (error) {
    throw new Error(`Failed to fetch memories for decay: ${error.message}`)
  }

  if (!memories || memories.length === 0) {
    return { decayed: 0, pruned: 0 }
  }

  const now = Date.now()
  const toPrune: string[] = []
  const toUpdate: { id: string; confidence: number }[] = []

  for (const mem of memories) {
    const updatedAt = new Date(mem.updated_at).getTime()
    const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24)

    if (daysSinceUpdate < 1) continue // Skip recently updated

    const newConfidence = mem.confidence * Math.pow(DAILY_DECAY_RATE, daysSinceUpdate)

    if (newConfidence < MIN_CONFIDENCE_THRESHOLD) {
      toPrune.push(mem.id)
    } else {
      toUpdate.push({ id: mem.id, confidence: Math.round(newConfidence * 1000) / 1000 })
    }
  }

  // Batch delete pruned memories
  if (toPrune.length > 0) {
    const { error: deleteError } = await supabase
      .from('agent_memory')
      .delete()
      .in('id', toPrune)

    if (deleteError) {
      throw new Error(`Failed to prune memories: ${deleteError.message}`)
    }
  }

  // Batch update decayed memories (update one by one since Supabase doesn't support batch update with different values)
  let decayed = 0
  for (const item of toUpdate) {
    const { error: updateError } = await supabase
      .from('agent_memory')
      .update({ confidence: item.confidence, updated_at: new Date().toISOString() })
      .eq('id', item.id)

    if (!updateError) decayed++
  }

  return { decayed, pruned: toPrune.length }
}

/**
 * Learn from a merchant's approval/rejection decision.
 *
 * When a merchant approves an action: boost confidence of related memory (or create one).
 * When a merchant rejects: store a 'feedback' memory with the rejection reason.
 *
 * This teaches agents the merchant's preferences over time.
 */
export async function learnFromApproval(params: {
  store_id: string
  agent_type: AgentType
  action_type: string
  approved: boolean
  rejection_reason?: string
  action_id: string
  action_details: Record<string, unknown>
}): Promise<AgentMemory> {
  const { store_id, agent_type, action_type, approved, rejection_reason, action_id, action_details } = params

  const memoryKey = `approval_pattern:${action_type}`

  // Get existing memory for this action type pattern
  const existing = await getMemoryByKey(store_id, agent_type, memoryKey)

  if (approved) {
    // Boost confidence — merchant likes this type of action
    const currentConfidence = existing?.confidence ?? 0.5
    const newConfidence = Math.min(currentConfidence + APPROVAL_CONFIDENCE_BOOST, MAX_CONFIDENCE)

    return storeMemory({
      store_id,
      agent_type,
      memory_type: 'pattern',
      memory_key: memoryKey,
      memory_value: {
        action_type,
        approval_count: ((existing?.memory_value?.approval_count as number) ?? 0) + 1,
        rejection_count: (existing?.memory_value?.rejection_count as number) ?? 0,
        last_approved_details: action_details,
      },
      confidence: newConfidence,
      source: 'approval_pattern',
      source_action_id: action_id,
    })
  } else {
    // Rejection — lower confidence and record feedback
    const currentConfidence = existing?.confidence ?? 0.5
    const newConfidence = Math.max(currentConfidence - APPROVAL_CONFIDENCE_BOOST * 2, MIN_CONFIDENCE_THRESHOLD)

    // Store the rejection pattern
    const patternMemory = await storeMemory({
      store_id,
      agent_type,
      memory_type: 'pattern',
      memory_key: memoryKey,
      memory_value: {
        action_type,
        approval_count: (existing?.memory_value?.approval_count as number) ?? 0,
        rejection_count: ((existing?.memory_value?.rejection_count as number) ?? 0) + 1,
        last_rejected_details: action_details,
        last_rejection_reason: rejection_reason,
      },
      confidence: newConfidence,
      source: 'approval_pattern',
      source_action_id: action_id,
    })

    // Also store explicit feedback if rejection reason was given
    if (rejection_reason) {
      await storeMemory({
        store_id,
        agent_type,
        memory_type: 'feedback',
        memory_key: `feedback:${action_type}:${action_id}`,
        memory_value: {
          action_type,
          rejection_reason,
          action_details,
        },
        confidence: 0.9, // Explicit feedback is high confidence
        source: 'merchant_feedback',
        source_action_id: action_id,
      })
    }

    return patternMemory
  }
}

/**
 * Delete all memories for a store (used when a store is deleted).
 */
export async function deleteStoreMemories(store_id: string): Promise<number> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('agent_memory')
    .delete()
    .eq('store_id', store_id)
    .select('id')

  if (error) {
    throw new Error(`Failed to delete store memories: ${error.message}`)
  }

  return data?.length ?? 0
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit src/lib/agents/memory.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/memory.ts
git commit -m "feat(agents): add memory system — store, retrieve, decay, learn from approvals"
```

---

## Task 2: Scheduler

**Files:**
- Create: `src/lib/agents/scheduler.ts`

**Prerequisite:** Task 0 (cron-parser installed)

- [ ] **Step 1: Write the scheduler module**

```typescript
// src/lib/agents/scheduler.ts
import { parseExpression } from 'cron-parser'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { AgentType, AgentSchedule, ScheduleRunStatus } from './types'

// ---- Constants ----

/** Max consecutive failures before auto-disabling a schedule */
const MAX_CONSECUTIVE_FAILURES = 5

/** How far ahead to look for due schedules (prevents clock skew issues) */
const DUE_WINDOW_SECONDS = 60

// ---- Types ----

interface CreateScheduleInput {
  store_id: string
  agent_type: AgentType
  task_type: string
  schedule_cron: string
  timezone?: string
  config?: Record<string, unknown>
}

interface DueSchedule extends AgentSchedule {
  /** Computed: how many seconds overdue this schedule is */
  overdue_seconds: number
}

interface ScheduleExecutionResult {
  schedule_id: string
  status: ScheduleRunStatus
  error?: string
}

// ---- Functions ----

/**
 * Parse a cron expression and compute the next run time.
 * Returns an ISO string of the next occurrence.
 */
export function getNextRun(cronExpression: string, timezone: string = 'UTC', fromDate?: Date): string {
  const interval = parseExpression(cronExpression, {
    currentDate: fromDate ?? new Date(),
    tz: timezone,
  })

  return interval.next().toISOString()
}

/**
 * Validate a cron expression. Returns true if valid, false otherwise.
 */
export function isValidCron(cronExpression: string): boolean {
  try {
    parseExpression(cronExpression)
    return true
  } catch {
    return false
  }
}

/**
 * Create a new schedule for an agent task.
 * Automatically computes the first next_run_at.
 */
export async function createSchedule(input: CreateScheduleInput): Promise<AgentSchedule> {
  const supabase = getSupabaseAdmin()
  const timezone = input.timezone ?? 'UTC'

  if (!isValidCron(input.schedule_cron)) {
    throw new Error(`Invalid cron expression: ${input.schedule_cron}`)
  }

  const next_run_at = getNextRun(input.schedule_cron, timezone)

  const { data, error } = await supabase
    .from('agent_schedules')
    .insert({
      store_id: input.store_id,
      agent_type: input.agent_type,
      task_type: input.task_type,
      schedule_cron: input.schedule_cron,
      timezone,
      is_active: true,
      config: input.config ?? {},
      next_run_at,
      consecutive_failures: 0,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create schedule: ${error.message}`)
  }

  return data as AgentSchedule
}

/**
 * Find all schedules that are due to run.
 * A schedule is "due" when next_run_at <= now + DUE_WINDOW_SECONDS.
 * Only returns active schedules.
 */
export async function getDueSchedules(): Promise<DueSchedule[]> {
  const supabase = getSupabaseAdmin()
  const now = new Date()
  const cutoff = new Date(now.getTime() + DUE_WINDOW_SECONDS * 1000)

  const { data, error } = await supabase
    .from('agent_schedules')
    .select('*')
    .eq('is_active', true)
    .not('next_run_at', 'is', null)
    .lte('next_run_at', cutoff.toISOString())
    .order('next_run_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get due schedules: ${error.message}`)
  }

  if (!data || data.length === 0) return []

  return (data as AgentSchedule[]).map((schedule) => ({
    ...schedule,
    overdue_seconds: Math.max(
      0,
      Math.floor((now.getTime() - new Date(schedule.next_run_at!).getTime()) / 1000)
    ),
  }))
}

/**
 * Update a schedule after execution.
 * - Sets last_run_at, last_run_status
 * - Computes and sets next_run_at
 * - Tracks consecutive failures; auto-disables after MAX_CONSECUTIVE_FAILURES
 */
export async function updateLastRun(
  scheduleId: string,
  status: ScheduleRunStatus,
  error?: string
): Promise<AgentSchedule> {
  const supabase = getSupabaseAdmin()

  // First, fetch the current schedule to compute next run
  const { data: current, error: fetchError } = await supabase
    .from('agent_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (fetchError || !current) {
    throw new Error(`Schedule not found: ${scheduleId}`)
  }

  const schedule = current as AgentSchedule
  const now = new Date()

  // Compute next run
  const next_run_at = getNextRun(schedule.schedule_cron, schedule.timezone, now)

  // Track consecutive failures
  const consecutive_failures = status === 'failed'
    ? schedule.consecutive_failures + 1
    : 0

  // Auto-disable if too many failures
  const is_active = consecutive_failures >= MAX_CONSECUTIVE_FAILURES ? false : schedule.is_active

  const updatePayload: Record<string, unknown> = {
    last_run_at: now.toISOString(),
    last_run_status: status,
    next_run_at,
    consecutive_failures,
    is_active,
    updated_at: now.toISOString(),
  }

  const { data: updated, error: updateError } = await supabase
    .from('agent_schedules')
    .update(updatePayload)
    .eq('id', scheduleId)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to update schedule: ${updateError.message}`)
  }

  return updated as AgentSchedule
}

/**
 * Execute all due scheduled tasks.
 * This is the main entry point called by the cron API route.
 *
 * For each due schedule:
 * 1. Mark it as running (advance next_run_at to prevent double-execution)
 * 2. Call the provided executor callback
 * 3. Update with success/failure status
 *
 * The executor callback receives the schedule and should trigger the appropriate agent.
 * Returns results for each schedule processed.
 */
export async function executeScheduledTasks(
  executor: (schedule: AgentSchedule) => Promise<void>
): Promise<ScheduleExecutionResult[]> {
  const dueSchedules = await getDueSchedules()
  const results: ScheduleExecutionResult[] = []

  for (const schedule of dueSchedules) {
    // Optimistically advance next_run_at to prevent double-execution
    // if another cron invocation runs before we finish
    const supabase = getSupabaseAdmin()
    const tempNextRun = getNextRun(schedule.schedule_cron, schedule.timezone)

    await supabase
      .from('agent_schedules')
      .update({ next_run_at: tempNextRun })
      .eq('id', schedule.id)

    try {
      await executor(schedule)

      await updateLastRun(schedule.id, 'success')
      results.push({ schedule_id: schedule.id, status: 'success' })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)

      await updateLastRun(schedule.id, 'failed', errorMessage)
      results.push({
        schedule_id: schedule.id,
        status: 'failed',
        error: errorMessage,
      })
    }
  }

  return results
}

/**
 * Toggle a schedule active/inactive.
 * When re-activating, recomputes next_run_at from now.
 */
export async function toggleSchedule(scheduleId: string, isActive: boolean): Promise<AgentSchedule> {
  const supabase = getSupabaseAdmin()

  const updatePayload: Record<string, unknown> = {
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }

  // If re-activating, recompute next run
  if (isActive) {
    const { data: current } = await supabase
      .from('agent_schedules')
      .select('schedule_cron, timezone')
      .eq('id', scheduleId)
      .single()

    if (current) {
      updatePayload.next_run_at = getNextRun(current.schedule_cron, current.timezone)
      updatePayload.consecutive_failures = 0
    }
  }

  const { data, error } = await supabase
    .from('agent_schedules')
    .update(updatePayload)
    .eq('id', scheduleId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to toggle schedule: ${error.message}`)
  }

  return data as AgentSchedule
}

/**
 * Delete a schedule.
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('agent_schedules')
    .delete()
    .eq('id', scheduleId)

  if (error) {
    throw new Error(`Failed to delete schedule: ${error.message}`)
  }
}

/**
 * Get all schedules for a store, optionally filtered by agent type.
 */
export async function getStoreSchedules(
  store_id: string,
  agent_type?: AgentType
): Promise<AgentSchedule[]> {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('agent_schedules')
    .select('*')
    .eq('store_id', store_id)
    .order('next_run_at', { ascending: true })

  if (agent_type) {
    query = query.eq('agent_type', agent_type)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get store schedules: ${error.message}`)
  }

  return (data ?? []) as AgentSchedule[]
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit src/lib/agents/scheduler.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/scheduler.ts
git commit -m "feat(agents): add scheduler — cron parsing, due schedule detection, execution tracking"
```

---

## Task 3: Orchestrator

**Files:**
- Create: `src/lib/agents/orchestrator.ts`

- [ ] **Step 1: Write the orchestrator module**

```typescript
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
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit src/lib/agents/orchestrator.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/orchestrator.ts
git commit -m "feat(agents): add orchestrator — trigger dispatch, conflict resolution, cross-agent notifications"
```

---

## Task 4: Cron API Route for Scheduler

**Files:**
- Create: `src/app/api/agents/cron/route.ts`

This is the Vercel Cron endpoint that calls `executeScheduledTasks()`.

- [ ] **Step 1: Write the cron route**

```typescript
// src/app/api/agents/cron/route.ts
import { NextResponse } from 'next/server'
import { executeScheduledTasks } from '@/lib/agents/scheduler'
import { dispatchTrigger } from '@/lib/agents/orchestrator'

export const runtime = 'nodejs'
export const maxDuration = 60 // seconds

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await executeScheduledTasks(async (schedule) => {
      // Dispatch the scheduled task as a trigger to the orchestrator
      await dispatchTrigger({
        store_id: schedule.store_id,
        trigger_type: `schedule.${schedule.task_type}`,
        payload: {
          schedule_id: schedule.id,
          config: schedule.config,
        },
      })
    })

    return NextResponse.json({
      ok: true,
      executed: results.length,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Add cron config to vercel.json**

Add the following to the `crons` array in `vercel.json` (create the array if it doesn't exist):

```json
{
  "crons": [
    {
      "path": "/api/agents/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

- [ ] **Step 3: Verify the file compiles**

```bash
npx tsc --noEmit src/app/api/agents/cron/route.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/agents/cron/route.ts vercel.json
git commit -m "feat(agents): add cron API route for scheduled agent tasks (every 5 min)"
```

---

## Task 5: Export Barrel

**Files:**
- Create: `src/lib/agents/index.ts`

- [ ] **Step 1: Write the barrel export**

```typescript
// src/lib/agents/index.ts

// Memory
export {
  storeMemory,
  getMemories,
  getMemoryByKey,
  decayMemories,
  learnFromApproval,
  deleteStoreMemories,
} from './memory'

// Scheduler
export {
  getNextRun,
  isValidCron,
  createSchedule,
  getDueSchedules,
  updateLastRun,
  executeScheduledTasks,
  toggleSchedule,
  deleteSchedule,
  getStoreSchedules,
} from './scheduler'

// Orchestrator
export {
  dispatchTrigger,
  resolveConflicts,
  crossAgentNotify,
  getPendingNotifications,
  getTriggerRouting,
  registerTriggerRoute,
} from './orchestrator'

// Re-export types for convenience
export type {
  AgentTrigger,
  ConflictResult,
  DispatchResult,
  CrossAgentNotification,
} from './orchestrator'

// Types
export * from './types'
export * from './constants'
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit src/lib/agents/index.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/index.ts
git commit -m "feat(agents): add barrel export for agent modules"
```

---

## Summary

| Task | File(s) | What it does |
|------|---------|--------------|
| **Task 0** | `package.json` | Install `cron-parser` for cron expression parsing |
| **Task 1** | `src/lib/agents/memory.ts` | Store/retrieve memories, confidence decay, learn from approvals |
| **Task 2** | `src/lib/agents/scheduler.ts` | Cron parsing, due schedule detection, execution with failure tracking |
| **Task 3** | `src/lib/agents/orchestrator.ts` | Trigger dispatch, 5-min conflict detection, cross-agent notifications |
| **Task 4** | `src/app/api/agents/cron/route.ts`, `vercel.json` | Vercel Cron endpoint (every 5 min) that runs due scheduled tasks |
| **Task 5** | `src/lib/agents/index.ts` | Barrel export for clean imports |

### Key Design Decisions

1. **Memory decay**: Multiplicative decay (0.98^days) with 0.1 floor. Explicit merchant configs never decay. Approval patterns learn bidirectionally (approvals boost, rejections lower confidence 2x faster).

2. **Scheduler**: Uses `cron-parser` for reliable cron handling. Optimistic next_run_at advance prevents double-execution. Auto-disables after 5 consecutive failures.

3. **Orchestrator**: Static priority ordering (Support > Sales > Marketing > Analytics > Technical) resolves conflicts. 5-minute window for same-entity conflict detection. Cross-agent notifications stored as agent_actions for unified activity feed.

4. **No agent execution logic here**: These modules provide the infrastructure. Actual agent logic (what Marketing does when triggered, what Support does when scheduled) will be implemented in Phase 3 when individual agents are built.
