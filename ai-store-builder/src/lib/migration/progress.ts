// Database update helpers for migration progress tracking

import { createClient } from '@/lib/supabase/server'
import type { MigrationError, MigrationStatus, StoreMigration } from './types'

export async function getMigration(migrationId: string): Promise<StoreMigration | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_migrations')
    .select('*')
    .eq('id', migrationId)
    .single()

  if (error || !data) return null
  return data as StoreMigration
}

export async function getMigrationForStore(storeId: string): Promise<StoreMigration | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_migrations')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data as StoreMigration
}

export async function updateMigrationStatus(
  migrationId: string,
  status: MigrationStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('store_migrations')
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...(status === 'running' && { started_at: new Date().toISOString() }),
      ...(status === 'completed' || status === 'failed' ? { completed_at: new Date().toISOString() } : {}),
      ...extra,
    })
    .eq('id', migrationId)
}

export async function updateMigrationCounts(
  migrationId: string,
  counts: {
    total_products?: number
    migrated_products?: number
    failed_products?: number
    total_collections?: number
    migrated_collections?: number
    failed_collections?: number
    total_images?: number
    migrated_images?: number
    failed_images?: number
  }
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('store_migrations')
    .update({
      ...counts,
      updated_at: new Date().toISOString(),
    })
    .eq('id', migrationId)
}

export async function incrementMigrationCount(
  migrationId: string,
  field: 'migrated_products' | 'failed_products' | 'migrated_collections' | 'failed_collections' | 'migrated_images' | 'failed_images',
  amount: number = 1
): Promise<void> {
  const supabase = await createClient()
  // Fetch current value then update since Supabase doesn't support atomic increment
  const { data } = await supabase
    .from('store_migrations')
    .select('migrated_products, failed_products, migrated_collections, failed_collections, migrated_images, failed_images')
    .eq('id', migrationId)
    .single()

  if (data) {
    const currentValue = (data as Record<string, number>)[field] || 0
    await supabase
      .from('store_migrations')
      .update({
        [field]: currentValue + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', migrationId)
  }
}

export async function addMigrationError(
  migrationId: string,
  error: MigrationError
): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('store_migrations')
    .select('errors')
    .eq('id', migrationId)
    .single()

  const currentErrors = (data?.errors as MigrationError[]) || []
  // Keep last 100 errors to prevent unbounded growth
  const updatedErrors = [...currentErrors, error].slice(-100)

  await supabase
    .from('store_migrations')
    .update({
      errors: updatedErrors,
      updated_at: new Date().toISOString(),
    })
    .eq('id', migrationId)
}

export async function updateProductIdMap(
  migrationId: string,
  sourceId: string,
  storeforgeId: string
): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('store_migrations')
    .select('product_id_map')
    .eq('id', migrationId)
    .single()

  const currentMap = (data?.product_id_map as Record<string, string>) || {}
  currentMap[sourceId] = storeforgeId

  await supabase
    .from('store_migrations')
    .update({
      product_id_map: currentMap,
      updated_at: new Date().toISOString(),
    })
    .eq('id', migrationId)
}

export async function updateCollectionIdMap(
  migrationId: string,
  sourceId: string,
  storeforgeId: string
): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('store_migrations')
    .select('collection_id_map')
    .eq('id', migrationId)
    .single()

  const currentMap = (data?.collection_id_map as Record<string, string>) || {}
  currentMap[sourceId] = storeforgeId

  await supabase
    .from('store_migrations')
    .update({
      collection_id_map: currentMap,
      updated_at: new Date().toISOString(),
    })
    .eq('id', migrationId)
}

export async function saveMigrationCursor(
  migrationId: string,
  cursor: string | null
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('store_migrations')
    .update({
      last_cursor: cursor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', migrationId)
}
