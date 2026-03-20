// src/app/api/cron/daily-digest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateReport } from '@/lib/agents/analytics/report-generator'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * GET /api/cron/daily-digest
 * Cron job that generates daily digest reports for all stores
 * with the analytics agent enabled.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  console.log('[Cron] Starting daily digest generation...')

  try {
    // Find all stores with analytics agent enabled
    const { data: analyticsAgents, error: agentError } = await admin
      .from('agent_states')
      .select('store_id')
      .eq('agent_type', 'analytics')
      .eq('is_enabled', true)
      .neq('status', 'paused')

    if (agentError) {
      console.error('[Cron] Failed to fetch analytics agents:', agentError)
      return NextResponse.json(
        { error: 'Failed to fetch analytics agents' },
        { status: 500 }
      )
    }

    if (!analyticsAgents || analyticsAgents.length === 0) {
      console.log('[Cron] No enabled analytics agents found')
      return NextResponse.json({
        success: true,
        storesProcessed: 0,
        results: [],
      })
    }

    const results: Array<{ storeId: string; success: boolean; error?: string }> = []

    for (const agent of analyticsAgents) {
      try {
        await generateReport(agent.store_id, 'daily_digest')
        results.push({ storeId: agent.store_id, success: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[Cron] Daily digest failed for store ${agent.store_id}:`, message)
        results.push({ storeId: agent.store_id, success: false, error: message })
      }
    }

    const successCount = results.filter((r) => r.success).length
    console.log(
      `[Cron] Daily digest complete: ${successCount}/${results.length} stores succeeded`
    )

    return NextResponse.json({
      success: true,
      storesProcessed: results.length,
      results,
    })
  } catch (error) {
    console.error('[Cron] Daily digest generation failed:', error)
    return NextResponse.json(
      { error: 'Daily digest generation failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
