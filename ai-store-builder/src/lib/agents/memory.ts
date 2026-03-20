// src/lib/agents/memory.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { AgentType, AgentMemory, MemoryType, MemorySource } from './types'

// ---- Types ----

interface StoreMemoryInput {
  store_id: string
  agent_type: AgentType
  memory_type: MemoryType
  memory_key: string
  memory_value: Record<string, unknown>
  confidence: number
  source: MemorySource
  source_action_id?: string
  expires_at?: string
}

interface GetMemoriesOptions {
  store_id: string
  agent_type: AgentType
  memory_type?: MemoryType
  min_confidence?: number
  limit?: number
}

// ---- Constants ----

/** Confidence decay rate per day (multiplied by current confidence) */
const DAILY_DECAY_RATE = 0.98

/** Memories below this confidence are pruned during decay */
const MIN_CONFIDENCE_THRESHOLD = 0.1

/** How much to boost confidence when an approval pattern is confirmed */
const APPROVAL_CONFIDENCE_BOOST = 0.15

/** Max confidence value */
const MAX_CONFIDENCE = 1.0

// ---- Functions ----

/**
 * Store a memory for an agent. Uses upsert on (store_id, agent_type, memory_key).
 * If the memory already exists, updates value and confidence.
 */
export async function storeMemory(input: StoreMemoryInput): Promise<AgentMemory> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('agent_memory')
    .upsert(
      {
        store_id: input.store_id,
        agent_type: input.agent_type,
        memory_type: input.memory_type,
        memory_key: input.memory_key,
        memory_value: input.memory_value,
        confidence: Math.min(input.confidence, MAX_CONFIDENCE),
        source: input.source,
        source_action_id: input.source_action_id ?? null,
        expires_at: input.expires_at ?? null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'store_id,agent_type,memory_key',
      }
    )
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to store memory: ${error.message}`)
  }

  return data as AgentMemory
}

/**
 * Retrieve memories for a given agent/store, optionally filtered by type and minimum confidence.
 * Results are ordered by confidence descending.
 * Automatically excludes expired memories.
 */
export async function getMemories(options: GetMemoriesOptions): Promise<AgentMemory[]> {
  const supabase = getSupabaseAdmin()
  const { store_id, agent_type, memory_type, min_confidence = 0, limit = 50 } = options

  let query = supabase
    .from('agent_memory')
    .select('*')
    .eq('store_id', store_id)
    .eq('agent_type', agent_type)
    .gte('confidence', min_confidence)
    .order('confidence', { ascending: false })
    .limit(limit)

  if (memory_type) {
    query = query.eq('memory_type', memory_type)
  }

  // Exclude expired memories
  query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get memories: ${error.message}`)
  }

  return (data ?? []) as AgentMemory[]
}

/**
 * Get a single memory by key.
 */
export async function getMemoryByKey(
  store_id: string,
  agent_type: AgentType,
  memory_key: string
): Promise<AgentMemory | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('store_id', store_id)
    .eq('agent_type', agent_type)
    .eq('memory_key', memory_key)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to get memory by key: ${error.message}`)
  }

  return data as AgentMemory | null
}

/**
 * Apply time-based confidence decay to all memories for a store.
 * Called periodically (e.g., daily via cron).
 *
 * - Multiplies each memory's confidence by DAILY_DECAY_RATE^daysSinceUpdate
 * - Deletes memories that fall below MIN_CONFIDENCE_THRESHOLD
 * - Skips memories of type 'explicit_config' (merchant-set, never decay)
 *
 * Returns: { decayed: number, pruned: number }
 */
export async function decayMemories(store_id: string): Promise<{ decayed: number; pruned: number }> {
  const supabase = getSupabaseAdmin()

  // Fetch all non-explicit memories for this store
  const { data: memories, error } = await supabase
    .from('agent_memory')
    .select('id, confidence, updated_at, source')
    .eq('store_id', store_id)
    .neq('source', 'explicit_config')

  if (error) {
    throw new Error(`Failed to fetch memories for decay: ${error.message}`)
  }

  if (!memories || memories.length === 0) {
    return { decayed: 0, pruned: 0 }
  }

  const now = Date.now()
  const toPrune: string[] = []
  const toUpdate: { id: string; confidence: number }[] = []

  for (const mem of memories) {
    const updatedAt = new Date(mem.updated_at).getTime()
    const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24)

    if (daysSinceUpdate < 1) continue // Skip recently updated

    const newConfidence = mem.confidence * Math.pow(DAILY_DECAY_RATE, daysSinceUpdate)

    if (newConfidence < MIN_CONFIDENCE_THRESHOLD) {
      toPrune.push(mem.id)
    } else {
      toUpdate.push({ id: mem.id, confidence: Math.round(newConfidence * 1000) / 1000 })
    }
  }

  // Batch delete pruned memories
  if (toPrune.length > 0) {
    const { error: deleteError } = await supabase
      .from('agent_memory')
      .delete()
      .in('id', toPrune)

    if (deleteError) {
      throw new Error(`Failed to prune memories: ${deleteError.message}`)
    }
  }

  // Batch update decayed memories (update one by one since Supabase doesn't support batch update with different values)
  let decayed = 0
  for (const item of toUpdate) {
    const { error: updateError } = await supabase
      .from('agent_memory')
      .update({ confidence: item.confidence, updated_at: new Date().toISOString() })
      .eq('id', item.id)

    if (!updateError) decayed++
  }

  return { decayed, pruned: toPrune.length }
}

/**
 * Learn from a merchant's approval/rejection decision.
 *
 * When a merchant approves an action: boost confidence of related memory (or create one).
 * When a merchant rejects: store a 'feedback' memory with the rejection reason.
 *
 * This teaches agents the merchant's preferences over time.
 */
export async function learnFromApproval(params: {
  store_id: string
  agent_type: AgentType
  action_type: string
  approved: boolean
  rejection_reason?: string
  action_id: string
  action_details: Record<string, unknown>
}): Promise<AgentMemory> {
  const { store_id, agent_type, action_type, approved, rejection_reason, action_id, action_details } = params

  const memoryKey = `approval_pattern:${action_type}`

  // Get existing memory for this action type pattern
  const existing = await getMemoryByKey(store_id, agent_type, memoryKey)

  if (approved) {
    // Boost confidence — merchant likes this type of action
    const currentConfidence = existing?.confidence ?? 0.5
    const newConfidence = Math.min(currentConfidence + APPROVAL_CONFIDENCE_BOOST, MAX_CONFIDENCE)

    return storeMemory({
      store_id,
      agent_type,
      memory_type: 'pattern',
      memory_key: memoryKey,
      memory_value: {
        action_type,
        approval_count: ((existing?.memory_value?.approval_count as number) ?? 0) + 1,
        rejection_count: (existing?.memory_value?.rejection_count as number) ?? 0,
        last_approved_details: action_details,
      },
      confidence: newConfidence,
      source: 'approval_pattern',
      source_action_id: action_id,
    })
  } else {
    // Rejection — lower confidence and record feedback
    const currentConfidence = existing?.confidence ?? 0.5
    const newConfidence = Math.max(currentConfidence - APPROVAL_CONFIDENCE_BOOST * 2, MIN_CONFIDENCE_THRESHOLD)

    // Store the rejection pattern
    const patternMemory = await storeMemory({
      store_id,
      agent_type,
      memory_type: 'pattern',
      memory_key: memoryKey,
      memory_value: {
        action_type,
        approval_count: (existing?.memory_value?.approval_count as number) ?? 0,
        rejection_count: ((existing?.memory_value?.rejection_count as number) ?? 0) + 1,
        last_rejected_details: action_details,
        last_rejection_reason: rejection_reason,
      },
      confidence: newConfidence,
      source: 'approval_pattern',
      source_action_id: action_id,
    })

    // Also store explicit feedback if rejection reason was given
    if (rejection_reason) {
      await storeMemory({
        store_id,
        agent_type,
        memory_type: 'feedback',
        memory_key: `feedback:${action_type}:${action_id}`,
        memory_value: {
          action_type,
          rejection_reason,
          action_details,
        },
        confidence: 0.9, // Explicit feedback is high confidence
        source: 'merchant_feedback',
        source_action_id: action_id,
      })
    }

    return patternMemory
  }
}

/**
 * Delete all memories for a store (used when a store is deleted).
 */
export async function deleteStoreMemories(store_id: string): Promise<number> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('agent_memory')
    .delete()
    .eq('store_id', store_id)
    .select('id')

  if (error) {
    throw new Error(`Failed to delete store memories: ${error.message}`)
  }

  return data?.length ?? 0
}
