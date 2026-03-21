/**
 * Test data factories.
 * Uses Supabase service role to create/manage test data programmatically.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface SupabaseResponse<T = unknown> {
  data: T | null
  error: string | null
}

async function supabaseAdmin<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<SupabaseResponse<T>> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return { data: null, error: 'Missing Supabase credentials' }
  }

  const url = `${SUPABASE_URL}/rest/v1/${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: 'return=representation',
      ...((options.headers as Record<string, string>) || {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    return { data: null, error: `${response.status}: ${text}` }
  }

  const data = await response.json()
  return { data: Array.isArray(data) ? data[0] : data, error: null }
}

export async function createTestStore(overrides: Record<string, unknown> = {}) {
  const storeData = {
    name: `Test Store ${Date.now()}`,
    slug: `test-store-${Date.now()}`,
    description: 'Automated test store',
    theme: 'modern',
    status: 'active',
    blueprint: {
      category: 'general',
      location: { currency: 'INR', country: 'IN' },
    },
    ...overrides,
  }

  return supabaseAdmin('stores', {
    method: 'POST',
    body: JSON.stringify(storeData),
  })
}

export async function createTestProduct(
  storeId: string,
  overrides: Record<string, unknown> = {}
) {
  const productData = {
    store_id: storeId,
    title: `Test Product ${Date.now()}`,
    description: 'Automated test product',
    price: 999,
    compare_at_price: 1299,
    category: 'Electronics',
    status: 'published',
    inventory_count: 100,
    ...overrides,
  }

  return supabaseAdmin('products', {
    method: 'POST',
    body: JSON.stringify(productData),
  })
}

export async function createTestOrder(
  storeId: string,
  productId: string,
  overrides: Record<string, unknown> = {}
) {
  const orderData = {
    store_id: storeId,
    order_number: `ORD-TEST-${Date.now()}`,
    status: 'pending',
    payment_method: 'cod',
    payment_status: 'pending',
    subtotal: 999,
    total: 999,
    currency: 'INR',
    customer_email: 'test@example.com',
    customer_name: 'Test Customer',
    shipping_address: {
      name: 'Test Customer',
      address: '123 Test St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '9999999999',
    },
    ...overrides,
  }

  return supabaseAdmin('orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  })
}

export async function createTestCustomer(
  storeId: string,
  overrides: Record<string, unknown> = {}
) {
  const customerData = {
    store_id: storeId,
    email: `test-customer-${Date.now()}@example.com`,
    name: 'Test Customer',
    password_hash: 'hashed_password_placeholder',
    ...overrides,
  }

  return supabaseAdmin('customers', {
    method: 'POST',
    body: JSON.stringify(customerData),
  })
}

export async function createTestCoupon(
  storeId: string,
  overrides: Record<string, unknown> = {}
) {
  const couponData = {
    store_id: storeId,
    code: `TEST${Date.now()}`,
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 500,
    max_uses: 100,
    is_active: true,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }

  return supabaseAdmin('coupons', {
    method: 'POST',
    body: JSON.stringify(couponData),
  })
}

export async function createTestCollection(
  storeId: string,
  overrides: Record<string, unknown> = {}
) {
  const collectionData = {
    store_id: storeId,
    name: `Test Collection ${Date.now()}`,
    slug: `test-collection-${Date.now()}`,
    description: 'Automated test collection',
    ...overrides,
  }

  return supabaseAdmin('collections', {
    method: 'POST',
    body: JSON.stringify(collectionData),
  })
}

export async function deleteRecord(table: string, id: string) {
  return supabaseAdmin(`${table}?id=eq.${id}`, { method: 'DELETE' })
}
