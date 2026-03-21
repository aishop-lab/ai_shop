import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/connections
 *
 * Returns all connected accounts for the authenticated user's store.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get store for user
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 })
    }

    // Get connections using admin client (connected_accounts may have RLS restrictions)
    const { data: connections, error: connError } = await getSupabaseAdmin()
      .from('connected_accounts')
      .select('provider, status, provider_account_name, provider_account_id, last_used_at, created_at')
      .eq('store_id', store.id)

    if (connError) {
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    return NextResponse.json({ connections: connections || [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
