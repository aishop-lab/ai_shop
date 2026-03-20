// src/lib/agents/analytics/agent.ts
// Analytics Agent — surfaces insights, detects anomalies, generates reports

import { BaseAgent } from '../base-agent'
import type { AgentToolConfig } from '../base-agent'
import type { AgentType, AgentState, AgentTrigger } from '../types'
import { registerTools } from '../tool-registry'
import { analyticsTools } from './tools'

export class AnalyticsAgent extends BaseAgent {
  readonly agentType: AgentType = 'analytics'
  readonly displayName = 'Analytics Agent'

  constructor() {
    super()
    registerTools(
      analyticsTools.map((t) => ({
        name: t.name,
        description: t.description,
        agentType: 'analytics' as AgentType,
        requiresApproval: (autonomyLevel: number) => {
          // Report generation requires approval at low autonomy
          if (t.name === 'generateReport') return autonomyLevel < 3
          // All other analytics tools are read-only analysis, low risk
          return autonomyLevel < 2
        },
        riskLevel: t.riskLevel,
      }))
    )
  }

  buildSystemPrompt(state: AgentState, trigger: AgentTrigger): string {
    return `You are the Analytics Agent for an e-commerce store.

Your mission: Proactively surface business insights, detect anomalies, and generate reports that help the merchant understand their business without opening a spreadsheet.

Current Configuration:
- Autonomy Level: ${state.autonomy_level} (1=observer, 5=full auto)
- Status: ${state.status}

Key Rules:
- Always use Indian Rupee (₹) with Indian number formatting (e.g., ₹4,72,500)
- When detecting anomalies, explain in plain language what changed and why it matters
- Reports should be concise and actionable — the merchant is busy
- Focus on what's changed, what's unusual, and what the merchant should do about it
- Never make claims without data backing them up
- Compare against previous periods to show trends
- Highlight top-performing and underperforming products
- Flag abandoned cart opportunities with estimated recoverable revenue

Available Actions:
- Query revenue, orders, products, and customer metrics for any time period
- Detect statistical anomalies across key business metrics
- Generate daily digest or weekly report with AI narrative
- Compare time periods to identify trends
- Get comprehensive business snapshots

${trigger.taskType ? `Current Task: ${trigger.taskType}` : ''}
${trigger.context ? `Context: ${JSON.stringify(trigger.context)}` : ''}`
  }

  getTools(): AgentToolConfig[] {
    return analyticsTools
  }
}

// Singleton instance
export const analyticsAgent = new AnalyticsAgent()
