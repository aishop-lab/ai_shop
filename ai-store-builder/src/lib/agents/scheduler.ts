// src/lib/agents/scheduler.ts
import { CronExpressionParser } from 'cron-parser'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { AgentType, AgentSchedule, ScheduleRunStatus } from './types'

// ---- Constants ----

/** Max consecutive failures before auto-disabling a schedule */
const MAX_CONSECUTIVE_FAILURES = 5

/** How far ahead to look for due schedules (prevents clock skew issues) */
const DUE_WINDOW_SECONDS = 60

/** Default schedules created when an agent is enabled */
const DEFAULT_SCHEDULES: Record<string, Array<{ task_type: string; schedule_cron: string }>> = {
  sales: [
    { task_type: 'abandoned_cart_recovery', schedule_cron: '0 */6 * * *' },
    { task_type: 'customer_segmentation', schedule_cron: '0 3 * * 1' },
  ],
  analytics: [
    { task_type: 'daily_digest', schedule_cron: '0 8 * * *' },
    { task_type: 'weekly_report', schedule_cron: '0 8 * * 1' },
  ],
  marketing: [
    { task_type: 'campaign_performance_check', schedule_cron: '0 9 * * *' },
    { task_type: 'spend_sync', schedule_cron: '0 */6 * * *' },
  ],
  technical: [
    { task_type: 'seo_audit', schedule_cron: '0 3 * * 0' },
    { task_type: 'health_check', schedule_cron: '0 4 * * *' },
  ],
  support: [],
}

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
  const interval = CronExpressionParser.parse(cronExpression, {
    currentDate: fromDate ?? new Date(),
    tz: timezone,
  })

  return interval.next().toISOString()!
}

/**
 * Validate a cron expression. Returns true if valid, false otherwise.
 */
export function isValidCron(cronExpression: string): boolean {
  try {
    CronExpressionParser.parse(cronExpression)
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

  if (error) {
    // Store error info in config for debugging (non-destructive)
    updatePayload.config = {
      ...(schedule.config ?? {}),
      last_error: error,
    }
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

/**
 * Create default schedules when an agent is enabled.
 * Uses upsert to avoid duplicates if schedules already exist.
 * Reactivates and recomputes next_run_at for existing inactive schedules.
 */
export async function createDefaultSchedules(storeId: string, agentType: string): Promise<void> {
  const schedules = DEFAULT_SCHEDULES[agentType] || []
  if (schedules.length === 0) return

  const supabase = getSupabaseAdmin()

  for (const schedule of schedules) {
    const timezone = 'Asia/Kolkata'
    const next_run_at = getNextRun(schedule.schedule_cron, timezone)

    const { error } = await supabase.from('agent_schedules').upsert(
      {
        store_id: storeId,
        agent_type: agentType,
        task_type: schedule.task_type,
        schedule_cron: schedule.schedule_cron,
        timezone,
        is_active: true,
        config: {},
        next_run_at,
        consecutive_failures: 0,
      },
      { onConflict: 'store_id,agent_type,task_type' }
    )
    if (error) {
      console.error(`[schedules] Failed to create ${schedule.task_type} for ${agentType}:`, error)
    }
  }
}

/**
 * Deactivate all schedules for an agent when it is disabled.
 */
export async function deactivateSchedules(storeId: string, agentType: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('agent_schedules')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('store_id', storeId)
    .eq('agent_type', agentType)

  if (error) {
    console.error(`[schedules] Failed to deactivate schedules for ${agentType}:`, error)
  }
}
