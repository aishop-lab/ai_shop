// src/lib/agents/support/agent.ts
import { BaseAgent, type AgentToolConfig } from '../base-agent'
import type { AgentTrigger, AgentState } from '../types'
import { buildKnowledgeBase, formatKnowledgeBaseForPrompt } from './knowledge-base'
import { getSupportTools } from './tools'

export class SupportAgent extends BaseAgent {
  readonly agentType = 'support' as const
  readonly displayName = 'Support Agent'

  buildSystemPrompt(state: AgentState, trigger: AgentTrigger): string {
    // Note: knowledge base is built asynchronously and injected at call time
    // via the async variant below. This sync version provides a fallback.
    return this._buildPrompt(state, trigger, null)
  }

  async buildSystemPromptAsync(state: AgentState, trigger: AgentTrigger): Promise<string> {
    const kb = await buildKnowledgeBase(trigger.storeId)
    const kbText = formatKnowledgeBaseForPrompt(kb)
    return this._buildPrompt(state, trigger, kbText, kb.storeName)
  }

  private _buildPrompt(
    state: AgentState,
    _trigger: AgentTrigger,
    kbText: string | null,
    storeName?: string
  ): string {
    const name = storeName ?? 'Our Store'
    const tone = state.config.tone ?? 'friendly'
    const autonomy = state.autonomy_level

    return `You are the Customer Support Agent for ${name}.

Your role is to help customers with their inquiries quickly and accurately. You have access to the store's knowledge base, order information, and product catalog.

## Store Knowledge Base
${kbText ?? 'Knowledge base loading — use lookup tools to fetch store and order data in real time.'}

## Your Capabilities
- Look up orders by order number (lookupOrder)
- Check product availability and details (lookupProduct)
- Track shipping status (checkShippingStatus)
- Send replies to customers (sendReply)
- Process escalations for complex issues (escalateToMerchant)
- Create return/refund requests (createReturnRequest — requires merchant approval)

## Guidelines
- Be ${tone} and helpful
- Always verify order numbers before providing details
- For refunds above ₹500 or any return requests, escalate to the merchant or use createReturnRequest
- Never share customer personal information with third parties
- If you don't know the answer, escalate rather than guessing
- Keep responses concise — customers want quick answers
- Always include the order number or product name when referring to specific items

## Autonomy Level: ${autonomy}
${
  autonomy <= 2
    ? 'Escalate all non-trivial actions to the merchant. Only look up information autonomously.'
    : 'Auto-handle routine queries (order status, product info, shipping tracking). Escalate refunds, complaints, and edge cases.'
}
`
  }

  getTools(): AgentToolConfig[] {
    return getSupportTools()
  }
}

// Singleton
export const supportAgent = new SupportAgent()
