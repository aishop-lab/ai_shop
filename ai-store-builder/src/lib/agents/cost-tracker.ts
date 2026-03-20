// src/lib/agents/cost-tracker.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { MODEL_TIERS, DEFAULT_BUDGET_LIMITS } from './constants'
import type { AgentType, AgentCostTracking, ModelTier } from './types'

export async function getMonthlyUsage(storeId: string): Promise<AgentCostTracking | null> {
  const supabase = getSupabaseAdmin()
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('agent_cost_tracking')
    .select('*')
    .eq('store_id', storeId)
    .eq('period_start', periodStart)
    .single()

  if (data) return data as AgentCostTracking

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

export async function trackUsage(params: {
  storeId: string
  agentType: AgentType
  modelUsed: string
  tokensInput: number
  tokensOutput: number
}): Promise<{ costUsd: number; budgetRemaining: number; percentUsed: number } | null> {
  const usage = await getMonthlyUsage(params.storeId)
  if (!usage) return null

  const tier = getTierForModel(params.modelUsed)
  const tierConfig = MODEL_TIERS[tier]
  const costUsd =
    (params.tokensInput / 1000) * tierConfig.costPer1kInput +
    (params.tokensOutput / 1000) * tierConfig.costPer1kOutput

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

function getTierForModel(modelId: string): ModelTier {
  for (const [tier, config] of Object.entries(MODEL_TIERS)) {
    if (config.modelId === modelId) return tier as ModelTier
  }
  return 'fast'
}
