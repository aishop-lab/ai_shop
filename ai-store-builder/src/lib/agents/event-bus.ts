// src/lib/agents/event-bus.ts
// Inter-agent pub/sub event bus for coordinating agent activity
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { AgentType } from './types'

// ---- Event Types ----

export type AgentEventType =
  | 'anomaly.detected'
  | 'campaign.created'
  | 'campaign.paused'
  | 'campaign.performance_drop'
  | 'inventory.low_stock'
  | 'inventory.out_of_stock'
  | 'customer.complaint'
  | 'customer.high_value_action'
  | 'order.high_value'
  | 'order.refund_requested'
  | 'price.change_recommended'
  | 'seo.issue_found'
  | 'site.downtime'
  | 'site.slow_performance'
  | 'support.escalation'
  | 'revenue.anomaly'

export type EventPriority = 'low' | 'normal' | 'high' | 'critical'

export interface AgentEvent {
  id: string
  store_id: string
  event_type: AgentEventType
  source_agent: AgentType
  payload: Record<string, unknown>
  priority: EventPriority
  created_at: string
  processed_by: AgentType[]
  acknowledged_by: AgentType[]
}

// ---- Subscription Map ----

/**
 * Defines which agents subscribe to which event types.
 * When an event is published, all subscribed agents receive it.
 */
const EVENT_SUBSCRIPTIONS: Record<AgentEventType, AgentType[]> = {
  // Anomalies & revenue
  'anomaly.detected': ['marketing', 'sales', 'technical'],
  'revenue.anomaly': ['analytics', 'marketing', 'sales'],

  // Campaigns
  'campaign.created': ['analytics', 'sales'],
  'campaign.paused': ['analytics', 'sales'],
  'campaign.performance_drop': ['marketing', 'analytics'],

  // Inventory
  'inventory.low_stock': ['sales', 'marketing'],
  'inventory.out_of_stock': ['sales', 'marketing', 'support'],

  // Customer
  'customer.complaint': ['support', 'sales'],
  'customer.high_value_action': ['sales', 'marketing'],

  // Orders
  'order.high_value': ['sales', 'analytics'],
  'order.refund_requested': ['support', 'sales', 'analytics'],

  // Pricing
  'price.change_recommended': ['sales', 'analytics'],

  // SEO & Site
  'seo.issue_found': ['technical', 'marketing'],
  'site.downtime': ['technical', 'analytics'],
  'site.slow_performance': ['technical', 'analytics'],

  // Support
  'support.escalation': ['support', 'sales'],
}

// ---- Functions ----

/**
 * Publish an event to the event bus.
 * Stores the event as a special `agent_event` action in agent_actions,
 * leveraging the existing infrastructure for tracking and display.
 *
 * Returns the event ID.
 */
export async function publishEvent(
  event: Omit<AgentEvent, 'id' | 'created_at' | 'processed_by' | 'acknowledged_by'>
): Promise<string> {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  // Determine which agents should receive this event (excluding the source)
  const subscribers = (EVENT_SUBSCRIPTIONS[event.event_type] ?? []).filter(
    (agent) => agent !== event.source_agent
  )

  const { data, error } = await supabase
    .from('agent_actions')
    .insert({
      store_id: event.store_id,
      agent_type: event.source_agent,
      action_type: 'agent_event',
      action_category: 'communication',
      summary: `Event: ${event.event_type}`,
      details: {
        event_type: event.event_type,
        payload: event.payload,
        priority: event.priority,
        subscribers,
        processed_by: [],
        acknowledged_by: [],
      },
      status: 'completed',
      execution_mode: 'auto',
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost_usd: 0,
      api_costs: {},
      started_at: now,
      completed_at: now,
      duration_ms: 0,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to publish event: ${error.message}`)
  }

  return data.id
}

/**
 * Get all events that a specific agent type is subscribed to.
 * Returns events from the last 24 hours by default.
 */
export async function getSubscribedEvents(
  agentType: AgentType,
  storeId?: string,
  since?: string
): Promise<AgentEvent[]> {
  const supabase = getSupabaseAdmin()

  // All event types this agent subscribes to
  const subscribedTypes = Object.entries(EVENT_SUBSCRIPTIONS)
    .filter(([, agents]) => agents.includes(agentType))
    .map(([eventType]) => eventType)

  if (subscribedTypes.length === 0) {
    return []
  }

  const lookbackStart = since ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('agent_actions')
    .select('*')
    .eq('action_type', 'agent_event')
    .gte('created_at', lookbackStart)
    .order('created_at', { ascending: false })
    .limit(50)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get subscribed events: ${error.message}`)
  }

  // Filter to events this agent subscribes to, and map to AgentEvent shape
  return (data ?? [])
    .filter((row) => {
      const details = row.details as Record<string, unknown>
      const eventType = details?.event_type as string
      return subscribedTypes.includes(eventType)
    })
    .map((row) => mapRowToAgentEvent(row))
}

/**
 * Acknowledge that an agent has processed an event.
 * This prevents the same agent from re-processing the event.
 */
export async function acknowledgeEvent(
  eventId: string,
  agentType: AgentType
): Promise<void> {
  const supabase = getSupabaseAdmin()

  // First, read the current event to get existing acknowledged_by list
  const { data: existing, error: readError } = await supabase
    .from('agent_actions')
    .select('details')
    .eq('id', eventId)
    .eq('action_type', 'agent_event')
    .single()

  if (readError) {
    throw new Error(`Failed to read event for acknowledgment: ${readError.message}`)
  }

  const details = existing.details as Record<string, unknown>
  const acknowledgedBy = (details.acknowledged_by as AgentType[]) ?? []
  const processedBy = (details.processed_by as AgentType[]) ?? []

  // Skip if already acknowledged
  if (acknowledgedBy.includes(agentType)) {
    return
  }

  const updatedDetails = {
    ...details,
    acknowledged_by: [...acknowledgedBy, agentType],
    processed_by: [...processedBy, agentType],
  }

  const { error: updateError } = await supabase
    .from('agent_actions')
    .update({ details: updatedDetails })
    .eq('id', eventId)

  if (updateError) {
    throw new Error(`Failed to acknowledge event: ${updateError.message}`)
  }
}

/**
 * Get events that an agent has not yet acknowledged/processed.
 * Useful for agents to catch up on events they missed.
 */
export async function getPendingEvents(
  storeId: string,
  agentType: AgentType
): Promise<AgentEvent[]> {
  const allEvents = await getSubscribedEvents(agentType, storeId)

  // Filter to events not yet acknowledged by this agent
  return allEvents.filter(
    (event) => !event.acknowledged_by.includes(agentType)
  )
}

/**
 * Get the event subscription map.
 * Useful for the frontend to display which agents respond to which events.
 */
export function getEventSubscriptions(): Record<AgentEventType, AgentType[]> {
  // Return a copy to prevent mutation
  return { ...EVENT_SUBSCRIPTIONS }
}

/**
 * Get all event types that a specific agent publishes or subscribes to.
 * Useful for agent workspace UIs.
 */
export function getAgentEventProfile(agentType: AgentType): {
  subscribes_to: AgentEventType[]
  publishes: AgentEventType[]
} {
  const subscribesTo = Object.entries(EVENT_SUBSCRIPTIONS)
    .filter(([, agents]) => agents.includes(agentType))
    .map(([eventType]) => eventType as AgentEventType)

  // Infer publishing based on agent role
  const publishMap: Record<AgentType, AgentEventType[]> = {
    marketing: ['campaign.created', 'campaign.paused', 'campaign.performance_drop'],
    sales: ['order.high_value', 'price.change_recommended', 'inventory.low_stock', 'inventory.out_of_stock'],
    support: ['customer.complaint', 'support.escalation', 'order.refund_requested'],
    analytics: ['anomaly.detected', 'revenue.anomaly', 'customer.high_value_action'],
    technical: ['seo.issue_found', 'site.downtime', 'site.slow_performance'],
  }

  return {
    subscribes_to: subscribesTo,
    publishes: publishMap[agentType] ?? [],
  }
}

// ---- Helpers ----

function mapRowToAgentEvent(row: Record<string, unknown>): AgentEvent {
  const details = row.details as Record<string, unknown>

  return {
    id: row.id as string,
    store_id: row.store_id as string,
    event_type: details.event_type as AgentEventType,
    source_agent: row.agent_type as AgentType,
    payload: (details.payload as Record<string, unknown>) ?? {},
    priority: (details.priority as EventPriority) ?? 'normal',
    created_at: row.created_at as string,
    processed_by: (details.processed_by as AgentType[]) ?? [],
    acknowledged_by: (details.acknowledged_by as AgentType[]) ?? [],
  }
}
