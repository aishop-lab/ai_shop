// src/lib/agents/sales/agent.ts
// Sales Agent — drives revenue through cart recovery, segmentation, and campaigns

import { BaseAgent } from '../base-agent'
import type { AgentToolConfig } from '../base-agent'
import type { AgentType, AgentState, AgentTrigger } from '../types'
import { registerTools } from '../tool-registry'
import { salesTools } from './tools'

export class SalesAgent extends BaseAgent {
  readonly agentType: AgentType = 'sales'
  readonly displayName = 'Sales Agent'

  constructor() {
    super()
    // Register all sales tools in the tool registry for permission checking
    registerTools(
      salesTools.map(t => ({
        name: t.name,
        description: t.description,
        agentType: 'sales' as AgentType,
        requiresApproval: (autonomyLevel, args) => {
          // Custom rule: discounts > 10% always need approval
          if (
            t.name === 'sendRecoveryEmail' &&
            typeof args.discountPercent === 'number' &&
            args.discountPercent > 10
          ) {
            return true
          }
          // Custom rule: price changes always require approval (money action)
          if (t.name === 'applyPriceRecommendation') {
            return true
          }
          // Standard risk-based rules
          if (t.riskLevel === 'high') return autonomyLevel < 5
          if (t.riskLevel === 'medium') return autonomyLevel < 4
          return autonomyLevel < 3
        },
        riskLevel: t.riskLevel,
      }))
    )
  }

  buildSystemPrompt(state: AgentState, trigger: AgentTrigger): string {
    return `You are the Sales Agent for an e-commerce store.

Your mission: Drive revenue through intelligent cart recovery, customer engagement, and targeted promotions.

Current Configuration:
- Autonomy Level: ${state.autonomy_level} (1=observer, 5=full auto)
- Status: ${state.status}

Key Rules:
- Recovery emails with <=10% discount can auto-send at autonomy >=3
- Larger discounts (>10%) always require merchant approval
- Never send more than 3 recovery emails per abandoned cart
- Respect unsubscribed carts
- When creating coupons, generate unique codes (e.g., SAVE10-${Date.now().toString(36).toUpperCase()})
- Prioritize high-value carts for recovery

Available Actions:
- Scan for abandoned carts and send recovery emails
- Analyze customer segments (Champions, Loyal, At Risk, Dormant, New)
- Create targeted discount campaigns
- Generate product recommendations for upsells
- Analyze dynamic pricing opportunities based on demand, inventory, margins, and seasonality
- Apply recommended price changes (ALWAYS requires merchant approval)
- Track and compare competitor prices
- Generate AI-powered competitive pricing strategies

Pricing Rules:
- Price changes ALWAYS require merchant approval regardless of autonomy level
- Never set prices below cost price
- Maximum 30% price increase in a single change
- Maximum 50% discount from compare-at price
- High demand + low stock = suggest price increase
- Low demand + high stock = suggest markdown

${trigger.taskType ? `Current Task: ${trigger.taskType}` : ''}
${trigger.context ? `Context: ${JSON.stringify(trigger.context)}` : ''}`
  }

  getTools(): AgentToolConfig[] {
    return salesTools
  }
}

// Singleton instance
export const salesAgent = new SalesAgent()
