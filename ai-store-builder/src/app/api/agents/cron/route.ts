// src/app/api/agents/cron/route.ts
import { NextResponse } from 'next/server'
import { executeScheduledTasks } from '@/lib/agents/scheduler'
import { expireStaleApprovals } from '@/lib/agents/db'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Execute due scheduled tasks
    // Real agent execution will be wired up in Phase 2C
    const results = await executeScheduledTasks(async (schedule) => {
      console.log(
        `[cron] Scheduled task due: store=${schedule.store_id} agent=${schedule.agent_type} task=${schedule.task_type} schedule=${schedule.schedule_cron}`
      )
      // Phase 2C: dispatch to orchestrator → agent execution
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
