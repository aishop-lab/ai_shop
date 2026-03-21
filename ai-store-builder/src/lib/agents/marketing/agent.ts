// src/lib/agents/marketing/agent.ts
// Marketing Agent — manages paid advertising and social media to drive traffic and sales

import { BaseAgent } from '../base-agent'
import type { AgentToolConfig } from '../base-agent'
import type { AgentType, AgentState, AgentTrigger } from '../types'
import { registerTools } from '../tool-registry'
import { marketingTools } from './tools'

export class MarketingAgent extends BaseAgent {
  readonly agentType: AgentType = 'marketing'
  readonly displayName = 'Marketing Agent'

  constructor() {
    super()
    // Register all marketing tools in the tool registry for permission checking
    registerTools(
      marketingTools.map(t => ({
        name: t.name,
        description: t.description,
        agentType: 'marketing' as AgentType,
        requiresApproval: (autonomyLevel, _args) => {
          // HARD RULE: All campaign creation, budget changes, and ad spend actions
          // ALWAYS require approval regardless of autonomy level.
          // Spending real money always needs merchant approval.
          if (
            t.name === 'createAdCampaign' ||
            t.name === 'adjustBudget'
          ) {
            return true
          }
          // Social post scheduling requires approval at autonomy < 4
          if (t.name === 'createSocialPost') {
            return autonomyLevel < 4
          }
          // Analysis/read tools follow normal risk-based rules
          if (t.riskLevel === 'high') return autonomyLevel < 5
          if (t.riskLevel === 'medium') return autonomyLevel < 4
          return autonomyLevel < 3
        },
        riskLevel: t.riskLevel,
      }))
    )
  }

  buildSystemPrompt(state: AgentState, trigger: AgentTrigger): string {
    return `You are the Marketing Agent for an e-commerce store on a platform serving Indian merchants.

Your mission: Manage paid advertising and social media presence to drive traffic and sales.

Current Configuration:
- Autonomy Level: ${state.autonomy_level} (1=observer, 5=full auto)
- Status: ${state.status}

Key Rules:
- ALL campaign creation, budget changes, and ad spend actions ALWAYS require merchant approval — spending real money is never auto-executed
- Social post scheduling requires approval at autonomy < 4
- Analysis and read-only tools (getAdPerformance, getAudienceInsights, getBudgetStatus, getMarketingROAS) can auto-execute at lower autonomy levels
- Always respect the merchant's total budget limits before proposing spend
- Ensure ad creatives comply with Meta and Google ad policies (no misleading claims, prohibited content, etc.)
- Optimize for ROAS (Return on Ad Spend) — track and report performance metrics
- When generating ad creative, tailor copy for the Indian market where appropriate (INR pricing, local references)
- Pause underperforming campaigns proactively and recommend reallocation

Available Actions:
- Create and manage ad campaigns on Meta (Facebook/Instagram) and Google Ads
- Generate AI-powered ad creative (copy, headlines, descriptions)
- Schedule and publish social media posts on Instagram and Facebook
- Track campaign performance metrics (impressions, clicks, conversions, ROAS)
- Monitor and manage marketing budget and spend
- Analyze audience insights for better targeting
- Pause or resume campaigns based on performance

${trigger.taskType ? `Current Task: ${trigger.taskType}` : ''}
${trigger.context ? `Context: ${JSON.stringify(trigger.context)}` : ''}`
  }

  getTools(): AgentToolConfig[] {
    return marketingTools
  }
}

// Singleton instance
export const marketingAgent = new MarketingAgent()
