// src/app/api/agents/cron/route.ts
import { NextResponse } from 'next/server'
import { executeScheduledTasks } from '@/lib/agents/scheduler'
import { expireStaleApprovals } from '@/lib/agents/db'
import { executeScheduledTask } from '@/lib/agents/schedule-executor'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Execute due scheduled tasks — dispatch each to the appropriate agent
    const results = await executeScheduledTasks(async (schedule) => {
      console.log(
        `[cron] Dispatching: store=${schedule.store_id} agent=${schedule.agent_type} task=${schedule.task_type}`
      )
      await executeScheduledTask({
        store_id: schedule.store_id,
        agent_type: schedule.agent_type,
        task_type: schedule.task_type,
        config: schedule.config,
      })
    })

    // Expire stale approvals that have passed their deadline
    const expiredCount = await expireStaleApprovals()

    return NextResponse.json({
      ok: true,
      executed: results.length,
      results,
      expired_approvals: expiredCount,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
