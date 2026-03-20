// src/lib/agents/model-router.ts
import { google } from '@/lib/ai/provider'
import { MODEL_TIERS, DEFAULT_BUDGET_LIMITS } from './constants'
import type { ModelTier, ModelConfig, AgentType } from './types'
import { getMonthlyUsage } from './cost-tracker'

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

  let effectiveTier = requestedTier
  try {
    const usage = await getMonthlyUsage(storeId)
    if (usage) {
      const percentUsed = budgetLimit > 0 ? (usage.total_llm_cost_usd / budgetLimit) * 100 : 0

      if (percentUsed >= 100) {
        effectiveTier = 'fast'
      } else if (percentUsed >= 80) {
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

export function getModelForTier(tier: ModelTier) {
  const config = MODEL_TIERS[tier]
  return google(config.modelId)
}

function downgradeTier(tier: ModelTier): ModelTier {
  const order: ModelTier[] = ['fast', 'standard', 'advanced', 'premium']
  const idx = order.indexOf(tier)
  return idx > 0 ? order[idx - 1] : 'fast'
}

export function estimateCost(tier: ModelTier, tokensInput: number, tokensOutput: number): number {
  const config = MODEL_TIERS[tier]
  return (tokensInput / 1000) * config.costPer1kInput + (tokensOutput / 1000) * config.costPer1kOutput
}
