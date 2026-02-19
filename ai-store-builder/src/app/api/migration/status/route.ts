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
    let currentPhase: MigrationProgress['current_phase'] = 'products'
    if (migration.status === 'completed') {
      currentPhase = 'done'
    } else {
      const productsDone = migration.total_products > 0 &&
        migration.migrated_products + migration.failed_products >= migration.total_products
      const collectionsDone = migration.total_collections > 0 &&
        migration.migrated_collections + migration.failed_collections >= migration.total_collections
      const customersDone = migration.total_customers > 0 &&
        migration.migrated_customers + migration.failed_customers >= migration.total_customers
      const couponsDone = migration.total_coupons > 0 &&
        migration.migrated_coupons + migration.failed_coupons >= migration.total_coupons

      if (productsDone && collectionsDone && customersDone && couponsDone) {
        currentPhase = 'orders'
      } else if (productsDone && collectionsDone && customersDone) {
        currentPhase = 'coupons'
      } else if (productsDone && collectionsDone) {
        currentPhase = 'customers'
      } else if (productsDone) {
        currentPhase = 'collections'
      }
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
      total_orders: migration.total_orders ?? 0,
      migrated_orders: migration.migrated_orders ?? 0,
      failed_orders: migration.failed_orders ?? 0,
      total_customers: migration.total_customers ?? 0,
      migrated_customers: migration.migrated_customers ?? 0,
      failed_customers: migration.failed_customers ?? 0,
      total_coupons: migration.total_coupons ?? 0,
      migrated_coupons: migration.migrated_coupons ?? 0,
      failed_coupons: migration.failed_coupons ?? 0,
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
