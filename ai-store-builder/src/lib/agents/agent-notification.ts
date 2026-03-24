import { createNotification } from '@/lib/notifications'
import type { AgentType } from './types'

const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  support: 'SENTINEL',
  sales: 'FORGE',
  analytics: 'PULSE',
  marketing: 'PRISM',
  technical: 'CIPHER',
}

/**
 * Notify the merchant about an autonomous agent action.
 * Uses the existing notification system (shows in notification bell).
 */
export async function notifyMerchantOfAgentAction(params: {
  store_id: string
  user_id: string
  agent_type: AgentType
  action_summary: string
  action_type: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  data?: Record<string, unknown>
}): Promise<void> {
  try {
    const agentName = AGENT_DISPLAY_NAMES[params.agent_type] || params.agent_type

    await createNotification({
      store_id: params.store_id,
      user_id: params.user_id,
      type: 'system',
      title: `${agentName} — ${params.action_type}`,
      message: params.action_summary,
      priority: params.priority || 'normal',
      data: {
        ...params.data,
        agent_type: params.agent_type,
        source: 'agent_autonomous',
      },
    })
  } catch (error) {
    console.error(`[agent-notify] Failed to notify merchant:`, error)
  }
}
