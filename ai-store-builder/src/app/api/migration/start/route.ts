// POST /api/migration/start - Begin migration job

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runMigrationPipeline } from '@/lib/migration/pipeline'
import { getMigration, updateMigrationStatus } from '@/lib/migration/progress'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import type { MigrationConfig } from '@/lib/migration/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API)
  if (rateLimitResult) return rateLimitResult

  try {
    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      migration_id,
      import_products = true,
      import_collections = true,
      import_orders = false,
      import_customers = false,
      import_coupons = false,
      product_status = 'draft',
    } = body

    if (!migration_id) {
      return NextResponse.json({ error: 'migration_id is required' }, { status: 400 })
    }

    // Get migration and verify ownership via store
    const migration = await getMigration(migration_id)
    if (!migration) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 })
    }

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', migration.store_id)
      .eq('owner_id', user.id)
      .single()

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Check migration is in a valid state to start
    if (!['connected', 'paused', 'failed'].includes(migration.status)) {
      return NextResponse.json(
        { error: `Cannot start migration in "${migration.status}" state` },
        { status: 400 }
      )
    }

    const config: MigrationConfig = {
      migration_id,
      import_products,
      import_collections,
      import_orders,
      import_customers,
      import_coupons,
      product_status: product_status === 'active' ? 'active' : 'draft',
    }

    // Run the pipeline (this will take a while)
    // We don't await it fully — but since maxDuration=300, Vercel will keep it alive
    await runMigrationPipeline(config)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Migration] Start error:', error)

    // Try to update status on failure
    try {
      const body = await request.clone().json().catch(() => null)
      if (body?.migration_id) {
        await updateMigrationStatus(body.migration_id, 'failed')
      }
    } catch {
      // ignore cleanup errors
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start migration' },
      { status: 500 }
    )
  }
}
