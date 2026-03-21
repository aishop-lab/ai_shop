import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * GET /api/cron/marketing-optimize
 * Daily cron that reviews campaign performance and creates optimization suggestions.
 * Runs at 8 AM UTC.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Get stores with active marketing agents and connected ad accounts
  const { data: agents } = await admin
    .from('agent_states')
    .select('store_id, autonomy_level')
    .eq('agent_type', 'marketing')
    .eq('is_enabled', true)

  if (!agents || agents.length === 0) {
    return Response.json({ message: 'No active marketing agents', optimized: 0 })
  }

  let optimized = 0

  for (const agent of agents) {
    try {
      // Check for connected ad accounts
      const { data: connections } = await admin
        .from('connected_accounts')
        .select('provider')
        .eq('store_id', agent.store_id)
        .eq('status', 'active')
        .in('provider', ['meta', 'google_ads'])

      if (!connections || connections.length === 0) continue

      // Get budget status
      const { getBudgetStatus, getOverallROAS } = await import('@/lib/agents/marketing/budget-manager')
      const budget = await getBudgetStatus(agent.store_id)
      const roas = await getOverallROAS(agent.store_id, '7d')

      // Create optimization insights as agent actions
      const insights: string[] = []

      if (budget.warningLevel === 'approaching') {
        insights.push(`Budget alert: ${Math.round((budget.currentSpend / budget.monthlyLimit) * 100)}% of monthly budget used. Consider pausing low-ROAS campaigns.`)
      }

      if (roas.overallROAS < 1.0 && roas.totalSpend > 0) {
        insights.push(`Overall ROAS is ${roas.overallROAS.toFixed(2)}x — campaigns are not profitable. Review targeting and creative.`)
      }

      if (roas.bottomCampaigns.length > 0) {
        const worstCampaign = roas.bottomCampaigns[0]
        if (worstCampaign.roas < 0.5 && worstCampaign.totalSpend > 0) {
          insights.push(`Campaign ${worstCampaign.campaignId} has ${worstCampaign.roas.toFixed(2)}x ROAS — recommend pausing.`)
        }
      }

      // Log insights as agent actions
      for (const insight of insights) {
        await admin.from('agent_actions').insert({
          store_id: agent.store_id,
          agent_type: 'marketing',
          action_type: 'optimization_insight',
          action_category: 'analysis',
          summary: insight,
          details: { budget, roas: { overall: roas.overallROAS, totalSpend: roas.totalSpend } },
          status: 'completed',
          execution_mode: 'auto',
          tokens_input: 0,
          tokens_output: 0,
          estimated_cost_usd: 0,
          api_costs: {},
        })
      }

      if (insights.length > 0) optimized++
      logger.info(`[marketing-optimize] Generated ${insights.length} insights for store ${agent.store_id}`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`[marketing-optimize] Error for store ${agent.store_id}: ${msg}`)
    }
  }

  return Response.json({ message: `Optimized ${optimized} stores`, total: agents.length })
}
