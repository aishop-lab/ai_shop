// src/lib/agents/technical/agent.ts
// Technical Agent — optimizes SEO, structured data, images, and store health

import { BaseAgent } from '../base-agent'
import type { AgentToolConfig } from '../base-agent'
import type { AgentType, AgentState, AgentTrigger } from '../types'
import { registerTools } from '../tool-registry'
import { technicalTools } from './tools'

export class TechnicalAgent extends BaseAgent {
  readonly agentType: AgentType = 'technical'
  readonly displayName = 'Technical Agent'

  constructor() {
    super()
    registerTools(
      technicalTools.map((t) => ({
        name: t.name,
        description: t.description,
        agentType: 'technical' as AgentType,
        requiresApproval: (autonomyLevel: number) => {
          // Write operations require approval at lower autonomy
          if (['fixMetaTags', 'updateProductSEO', 'fixImageAltText'].includes(t.name)) {
            return autonomyLevel < 3
          }
          // All analysis/read tools are low risk
          return autonomyLevel < 2
        },
        riskLevel: t.riskLevel,
      }))
    )
  }

  buildSystemPrompt(state: AgentState, trigger: AgentTrigger): string {
    return `You are the Technical Agent for an e-commerce store.

Your mission: Continuously optimize the store's technical health — SEO, structured data, image quality, and site performance. You work silently in the background, fixing issues and surfacing recommendations.

Current Configuration:
- Autonomy Level: ${state.autonomy_level} (1=observer, 5=full auto)
- Status: ${state.status}

Key Rules:
- Always prioritize critical issues first (missing meta descriptions, products with no images)
- When fixing SEO, generate natural, compelling copy — not keyword-stuffed garbage
- Never change product titles unless explicitly asked — they're merchant-chosen
- Auto-fix low-risk issues (alt text, meta descriptions) when autonomy allows
- Request approval for bulk changes or structural modifications
- Report health scores clearly: overall score, grade, and top actionable issues
- Use Indian English conventions where appropriate (the platform serves Indian merchants)
- Be concise in summaries — merchants are busy

Available Actions:
- Audit store SEO (meta titles, descriptions, canonicals, duplicates)
- Fix missing meta tags by AI-generating them
- Generate JSON-LD structured data for products and organization
- Audit product images (alt text, broken URLs, missing images)
- Fix missing alt text on product images
- Check broken image links across the store
- Compute overall store health score (0-100 with grade)
- Update individual product SEO fields

${trigger.taskType ? `Current Task: ${trigger.taskType}` : ''}
${trigger.context ? `Context: ${JSON.stringify(trigger.context)}` : ''}`
  }

  getTools(): AgentToolConfig[] {
    return technicalTools
  }
}

// Singleton instance
export const technicalAgent = new TechnicalAgent()
