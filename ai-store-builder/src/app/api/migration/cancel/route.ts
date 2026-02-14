// POST /api/migration/cancel - Cancel running migration

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMigration, updateMigrationStatus } from '@/lib/migration/progress'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { migration_id } = body

    if (!migration_id) {
      return NextResponse.json({ error: 'migration_id is required' }, { status: 400 })
    }

    const migration = await getMigration(migration_id)
    if (!migration) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 })
    }

    // Verify ownership
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', migration.store_id)
      .eq('owner_id', user.id)
      .single()

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    if (!['running', 'paused'].includes(migration.status)) {
      return NextResponse.json(
        { error: `Cannot cancel migration in "${migration.status}" state` },
        { status: 400 }
      )
    }

    await updateMigrationStatus(migration_id, 'cancelled')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Migration] Cancel error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel migration' },
      { status: 500 }
    )
  }
}
