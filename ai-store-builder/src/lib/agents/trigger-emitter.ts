import { dispatchTrigger, type AgentTrigger } from './orchestrator'

/**
 * Safely emit an agent trigger. Never throws — logs errors and continues.
 * Designed to be called fire-and-forget so it doesn't block the API response.
 *
 * Usage in API routes:
 *   emitTrigger({ store_id, trigger_type: 'order.created', ... }).catch(() => {})
 */
export async function emitTrigger(params: {
  store_id: string
  trigger_type: string
  entity_type?: string
  entity_id?: string
  payload?: Record<string, unknown>
}): Promise<void> {
  try {
    const trigger: AgentTrigger = {
      store_id: params.store_id,
      trigger_type: params.trigger_type,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      payload: params.payload || {},
    }

    const results = await dispatchTrigger(trigger)

    const accepted = results.filter(r => r.accepted).length
    const blocked = results.filter(r => !r.accepted).length

    if (accepted > 0 || blocked > 0) {
      console.log(
        `[trigger] ${params.trigger_type}: ${accepted} agents dispatched, ${blocked} blocked`
      )
    }
  } catch (error) {
    // Never throw — this runs in background, must not crash the main flow
    console.error(`[trigger] Failed to emit ${params.trigger_type}:`, error)
  }
}
