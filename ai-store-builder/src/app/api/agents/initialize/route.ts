import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AGENT_TYPES, DEFAULT_AUTONOMY_LEVEL } from '@/lib/agents/constants'

/**
 * POST /api/agents/initialize
 *
 * Creates default agent_states for a store if they don't exist.
 * Called lazily when a merchant first visits the /platform page.
 * Also called during onboarding completion.
 *
 * Idempotent — safe to call multiple times.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { store_id } = body

    if (!store_id) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 })
    }

    // Verify store belongs to user
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, owner_id')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    if (store.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check which agents already exist
    const { data: existing } = await supabase
      .from('agent_states')
      .select('agent_type')
      .eq('store_id', store_id)

    const existingTypes = new Set((existing ?? []).map((a) => a.agent_type))
    const missingTypes = AGENT_TYPES.filter((t) => !existingTypes.has(t))

    if (missingTypes.length === 0) {
      return NextResponse.json({ initialized: false, message: 'All agents already exist' })
    }

    // Create missing agent states
    const rows = missingTypes.map((agentType) => ({
      store_id,
      agent_type: agentType,
      is_enabled: false,
      autonomy_level: DEFAULT_AUTONOMY_LEVEL,
      status: 'idle' as const,
      config: {},
      error_count: 0,
      total_actions: 0,
      total_approvals_requested: 0,
      total_approvals_granted: 0,
      total_approvals_rejected: 0,
    }))

    const { error: insertError } = await supabase
      .from('agent_states')
      .insert(rows)

    if (insertError) {
      console.error('[Agent Init] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to initialize agents' }, { status: 500 })
    }

    console.log(`[Agent Init] Created ${missingTypes.length} agents for store ${store_id}: ${missingTypes.join(', ')}`)

    return NextResponse.json({
      initialized: true,
      agents_created: missingTypes,
    })
  } catch (error) {
    console.error('[Agent Init] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
