/**
 * Test data teardown helpers.
 * Deletes test-created data via Supabase service role.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function supabaseDelete(table: string, filter: string) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return

  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  }).catch(() => {})
}

export async function cleanupTestStore(storeId: string) {
  // Delete in dependency order
  const tables = [
    'order_items',
    'orders',
    'product_images',
    'product_variants',
    'product_variant_option_values',
    'product_variant_options',
    'collection_products',
    'collections',
    'products',
    'coupons',
    'customers',
    'customer_addresses',
    'customer_sessions',
    'wishlists',
    'abandoned_carts',
    'cart_recovery_emails',
    'notifications',
    'store_migrations',
  ]

  for (const table of tables) {
    await supabaseDelete(table, `store_id=eq.${storeId}`)
  }

  // Finally delete the store
  await supabaseDelete('stores', `id=eq.${storeId}`)
}

export async function cleanupTestData() {
  // Clean up stores created by tests (identified by name prefix)
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/stores?name=like.Test Store*&select=id`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  ).catch(() => null)

  if (!res?.ok) return

  const stores = (await res.json()) as { id: string }[]
  for (const store of stores) {
    await cleanupTestStore(store.id)
  }
}
