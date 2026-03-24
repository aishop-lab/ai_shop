import { crossAgentNotify } from './orchestrator'
import type { AgentType } from './types'

/**
 * Call after an agent action completes to notify other relevant agents.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function notifyRelatedAgents(params: {
  store_id: string
  source_agent: AgentType
  action_type: string
  summary: string
  details?: Record<string, unknown>
}): Promise<void> {
  const targets = getNotificationTargets(params.source_agent, params.action_type)

  for (const target of targets) {
    try {
      await crossAgentNotify({
        store_id: params.store_id,
        from_agent: params.source_agent,
        to_agent: target.agent,
        notification_type: target.type,
        payload: {
          summary: params.summary,
          ...params.details,
        },
      })
    } catch (error) {
      console.error(`[cross-agent] Failed to notify ${target.agent}:`, error)
    }
  }
}

function getNotificationTargets(
  source: AgentType,
  actionType: string
): Array<{ agent: AgentType; type: string }> {
  const map: Record<string, Record<string, Array<{ agent: AgentType; type: string }>>> = {
    analytics: {
      anomaly_detected: [
        { agent: 'marketing', type: 'anomaly_alert' },
        { agent: 'sales', type: 'anomaly_alert' },
      ],
      traffic_spike: [
        { agent: 'technical', type: 'traffic_alert' },
      ],
      report_generated: [
        { agent: 'marketing', type: 'report_available' },
      ],
    },
    support: {
      negative_review: [
        { agent: 'marketing', type: 'review_alert' },
      ],
      complaint_escalated: [
        { agent: 'sales', type: 'customer_issue' },
      ],
    },
    sales: {
      cart_recovered: [
        { agent: 'analytics', type: 'recovery_event' },
      ],
      discount_created: [
        { agent: 'analytics', type: 'discount_event' },
      ],
    },
    marketing: {
      low_roas_campaign: [
        { agent: 'analytics', type: 'campaign_alert' },
        { agent: 'sales', type: 'campaign_alert' },
      ],
      campaign_created: [
        { agent: 'analytics', type: 'campaign_event' },
      ],
    },
    technical: {
      seo_score_dropped: [
        { agent: 'analytics', type: 'health_alert' },
      ],
      health_check_failed: [
        { agent: 'analytics', type: 'health_alert' },
      ],
    },
  }

  return map[source]?.[actionType] || []
}
