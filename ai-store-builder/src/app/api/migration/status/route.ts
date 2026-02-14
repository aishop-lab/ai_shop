// GET /api/migration/status - Poll migration progress

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMigration, getMigrationForStore } from '@/lib/migration/progress'
import type { MigrationProgress } from '@/lib/migration/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const migrationId = request.nextUrl.searchParams.get('migration_id')
    const storeId = request.nextUrl.searchParams.get('store_id')

    let migration
    if (migrationId) {
      migration = await getMigration(migrationId)
    } else if (storeId) {
      migration = await getMigrationForStore(storeId)
    } else {
      return NextResponse.json(
        { error: 'migration_id or store_id is required' },
        { status: 400 }
      )
    }

    if (!migration) {
      return NextResponse.json({ migration: null })
    }

    // Verify ownership via store
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', migration.store_id)
      .eq('owner_id', user.id)
      .single()

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Determine current phase
    let currentPhase: 'products' | 'collections' | 'done' = 'products'
    if (migration.status === 'completed') {
      currentPhase = 'done'
    } else if (
      migration.migrated_products + migration.failed_products >= migration.total_products &&
      migration.total_products > 0
    ) {
      currentPhase = 'collections'
    }

    const progress: MigrationProgress = {
      id: migration.id,
      platform: migration.platform,
      status: migration.status,
      source_shop_name: migration.source_shop_name,
      total_products: migration.total_products,
      migrated_products: migration.migrated_products,
      failed_products: migration.failed_products,
      total_collections: migration.total_collections,
      migrated_collections: migration.migrated_collections,
      failed_collections: migration.failed_collections,
      total_images: migration.total_images,
      migrated_images: migration.migrated_images,
      failed_images: migration.failed_images,
      errors: migration.errors,
      started_at: migration.started_at,
      completed_at: migration.completed_at,
      current_phase: currentPhase,
    }

    return NextResponse.json({ migration: progress })
  } catch (error) {
    console.error('[Migration] Status error:', error)
    return NextResponse.json(
      { error: 'Failed to get migration status' },
      { status: 500 }
    )
  }
}
