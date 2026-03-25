// src/app/api/cron/sub-agents/route.ts
// Cron-triggered endpoint that runs sub-agents automatically across all active stores.
// Schedules: health-check (*/5), hourly (0 *), daily (0 3 UTC = 8:30 AM IST)

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { executeSubAgent } from '@/lib/agents/sub-agents/executor'
import { getStoreUrl } from '@/lib/store/queries'
import type { SubAgentId, SubAgentTask } from '@/lib/agents/sub-agents/types'
import type { AgentType } from '@/lib/agents/types'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min for processing all stores

// ---------------------------------------------------------------------------
// Task definitions
// ---------------------------------------------------------------------------

type TaskName = 'hourly' | 'daily' | 'health-check'

interface SubAgentTaskConfig {
  subAgentId: SubAgentId
  chief: AgentType
  task: SubAgentTask
}

function getTasksForSchedule(taskName: TaskName, storeUrl: string): SubAgentTaskConfig[] {
  switch (taskName) {
    case 'hourly':
      return [
        {
          subAgentId: 'anomaly-sentinel',
          chief: 'analytics',
          task: {
            instruction: 'Check for anomalies in revenue and traffic over the last hour. Flag any unusual spikes or drops.',
            triggerType: 'cron',
          },
        },
        {
          subAgentId: 'cart-whisperer',
          chief: 'sales',
          task: {
            instruction: 'Scan for abandoned carts from the last hour and trigger recovery email sequences where applicable.',
            triggerType: 'cron',
          },
        },
      ]

    case 'daily':
      return [
        {
          subAgentId: 'revenue-tracker',
          chief: 'analytics',
          task: {
            instruction: 'Generate the daily revenue summary for yesterday. Include total revenue, order count, AOV, and top-selling products.',
            triggerType: 'cron',
          },
        },
        {
          subAgentId: 'report-writer',
          chief: 'analytics',
          task: {
            instruction: 'Write the daily business digest summarising key metrics, trends, and recommended actions for today.',
            triggerType: 'cron',
          },
        },
        {
          subAgentId: 'image-optimizer',
          chief: 'technical',
          task: {
            instruction: 'Scan all product images and identify any that are unoptimised (oversized, low quality, missing alt text). Queue them for optimisation.',
            triggerType: 'cron',
          },
        },
      ]

    case 'health-check':
      return [
        {
          subAgentId: 'uptime-guardian',
          chief: 'technical',
          task: {
            instruction: `Perform an HTTP health check on the store URL: ${storeUrl}. Verify the storefront is reachable and responding correctly.`,
            triggerType: 'cron',
            context: { storeUrl },
          },
        },
        {
          subAgentId: 'integration-doctor',
          chief: 'technical',
          task: {
            instruction: 'Check the status of all payment gateway integrations (Razorpay, Stripe). Report any connectivity or configuration issues.',
            triggerType: 'cron',
          },
        },
      ]
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // 1. Validate CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse task query param
  // Use NextRequest.nextUrl.searchParams (synchronous, idiomatic in Next.js route handlers)
  const url = new URL(request.url)
  const taskParam = url.searchParams.get('task')

  if (!taskParam || !['hourly', 'daily', 'health-check'].includes(taskParam)) {
    return NextResponse.json(
      { error: 'Invalid or missing task param. Expected: hourly | daily | health-check' },
      { status: 400 }
    )
  }

  const taskName = taskParam as TaskName

  console.log(`[cron/sub-agents] Starting ${taskName} run at ${new Date().toISOString()}`)

  const supabase = getSupabaseAdmin()

  // 3. Fetch all active stores
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, slug, custom_domain, status')
    .eq('status', 'active')

  if (storesError) {
    console.error('[cron/sub-agents] Failed to fetch stores:', storesError.message)
    return NextResponse.json({ ok: false, error: storesError.message }, { status: 500 })
  }

  if (!stores || stores.length === 0) {
    console.log('[cron/sub-agents] No active stores found.')
    return NextResponse.json({ ok: true, stores_processed: 0, tasks_executed: 0, errors: [] })
  }

  console.log(`[cron/sub-agents] Processing ${stores.length} active stores for task: ${taskName}`)

  // 4. Process each store
  let storesProcessed = 0
  let tasksExecuted = 0
  const errors: Array<{ store_id: string; sub_agent_id: string; error: string }> = []

  for (const store of stores) {
    const storeUrl = getStoreUrl(store.slug, store.custom_domain)
    const taskConfigs = getTasksForSchedule(taskName, storeUrl)

    for (const config of taskConfigs) {
      try {
        console.log(
          `[cron/sub-agents] store=${store.id} sub-agent=${config.subAgentId} chief=${config.chief}`
        )

        const result = await executeSubAgent(config.subAgentId, store.id, config.task)

        // A result with no actions means the Chief is disabled — skip silently
        if (result.actions.length === 0 && !result.output) {
          console.log(
            `[cron/sub-agents] Skipped store=${store.id} sub-agent=${config.subAgentId} (Chief ${config.chief} disabled)`
          )
          continue
        }

        tasksExecuted++
        console.log(
          `[cron/sub-agents] Completed store=${store.id} sub-agent=${config.subAgentId} ` +
          `duration=${result.durationMs}ms requiresApproval=${result.requiresApproval}`
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(
          `[cron/sub-agents] Error store=${store.id} sub-agent=${config.subAgentId}: ${message}`
        )
        errors.push({ store_id: store.id, sub_agent_id: config.subAgentId, error: message })
      }
    }

    storesProcessed++
  }

  const summary = {
    ok: true,
    task: taskName,
    stores_processed: storesProcessed,
    tasks_executed: tasksExecuted,
    errors,
  }

  console.log(`[cron/sub-agents] Finished ${taskName}: ${JSON.stringify(summary)}`)

  return NextResponse.json(summary)
}
