import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * GET /api/cron/marketing-sync
 * Cron job that syncs ad spend data from connected platforms (Meta, Google Ads).
 * Runs every 6 hours.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Get all stores with marketing agent enabled
  const { data: agents } = await admin
    .from('agent_states')
    .select('store_id')
    .eq('agent_type', 'marketing')
    .eq('is_enabled', true)

  if (!agents || agents.length === 0) {
    return Response.json({ message: 'No active marketing agents', synced: 0 })
  }

  let synced = 0
  const errors: string[] = []

  for (const agent of agents) {
    try {
      // Check if store has connected accounts
      const { data: connections } = await admin
        .from('connected_accounts')
        .select('provider, status')
        .eq('store_id', agent.store_id)
        .eq('status', 'active')
        .in('provider', ['meta', 'google_ads'])

      if (!connections || connections.length === 0) continue

      // Dynamically import to avoid errors if modules aren't configured
      const { syncSpendFromPlatforms } = await import('@/lib/agents/marketing/budget-manager')
      const result = await syncSpendFromPlatforms(agent.store_id)
      synced += result.syncedRecords

      logger.info(`[marketing-sync] Synced ${result.syncedRecords} records for store ${agent.store_id}`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Store ${agent.store_id}: ${msg}`)
      logger.error(`[marketing-sync] Error for store ${agent.store_id}: ${msg}`)
    }
  }

  return Response.json({
    message: `Synced spend data for ${agents.length} stores`,
    synced,
    errors: errors.length > 0 ? errors : undefined,
  })
}
