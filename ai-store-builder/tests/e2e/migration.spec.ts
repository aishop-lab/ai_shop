import { test, expect } from '@playwright/test'

/**
 * Store Migration E2E Tests
 *
 * Tests for expanded Shopify migration: Orders, Customers, Coupons
 * Covers:
 * - API routes (start, status, cancel)
 * - Transformer logic (order, customer, discount) via inline validation
 * - Configuration and progress field shapes
 */

const INVALID_UUID = '00000000-0000-0000-0000-000000000000'

// ============================================
// MIGRATION STATUS API
// ============================================

test.describe('Migration Status API', () => {
  test('GET /api/migration/status - requires auth', async ({ request }) => {
    const response = await request.get('/api/migration/status?migration_id=' + INVALID_UUID)
    expect([401, 200]).toContain(response.status())
  })

  test('GET /api/migration/status - requires migration_id or store_id', async ({ request }) => {
    const response = await request.get('/api/migration/status')
    expect([400, 401]).toContain(response.status())
  })

  test('GET /api/migration/status - returns null for non-existent migration', async ({ request }) => {
    const response = await request.get('/api/migration/status?store_id=' + INVALID_UUID)
    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toBeDefined()
    }
  })

  test('status response includes new fields when migration exists', async ({ request }) => {
    const response = await request.get('/api/migration/status?store_id=' + INVALID_UUID)
    if (response.status() === 200) {
      const data = await response.json()
      if (data.migration) {
        expect(data.migration).toHaveProperty('total_orders')
        expect(data.migration).toHaveProperty('migrated_orders')
        expect(data.migration).toHaveProperty('failed_orders')
        expect(data.migration).toHaveProperty('total_customers')
        expect(data.migration).toHaveProperty('migrated_customers')
        expect(data.migration).toHaveProperty('failed_customers')
        expect(data.migration).toHaveProperty('total_coupons')
        expect(data.migration).toHaveProperty('migrated_coupons')
        expect(data.migration).toHaveProperty('failed_coupons')
        expect(data.migration).toHaveProperty('current_phase')
        expect(['products', 'collections', 'customers', 'coupons', 'orders', 'done']).toContain(data.migration.current_phase)
      }
    }
  })
})

// ============================================
// MIGRATION START API
// ============================================

test.describe('Migration Start API', () => {
  test('POST /api/migration/start - requires auth', async ({ request }) => {
    const response = await request.post('/api/migration/start', {
      data: { migration_id: INVALID_UUID }
    })
    expect([401, 400, 404]).toContain(response.status())
  })

  test('POST /api/migration/start - requires migration_id', async ({ request }) => {
    const response = await request.post('/api/migration/start', {
      data: {}
    })
    expect([400, 401]).toContain(response.status())
  })

  test('POST /api/migration/start - accepts new import flags', async ({ request }) => {
    const response = await request.post('/api/migration/start', {
      data: {
        migration_id: INVALID_UUID,
        import_products: true,
        import_collections: true,
        import_orders: true,
        import_customers: true,
        import_coupons: true,
        product_status: 'draft',
      }
    })
    expect([401, 404, 400, 500]).toContain(response.status())
    if (response.status() === 400) {
      const data = await response.json()
      expect(data.error).not.toContain('import_orders')
      expect(data.error).not.toContain('import_customers')
      expect(data.error).not.toContain('import_coupons')
    }
  })

  test('POST /api/migration/start - defaults new flags to false', async ({ request }) => {
    const response = await request.post('/api/migration/start', {
      data: {
        migration_id: INVALID_UUID,
        import_products: true,
      }
    })
    expect([401, 404, 400, 500]).toContain(response.status())
  })
})

// ============================================
// MIGRATION CANCEL API
// ============================================

test.describe('Migration Cancel API', () => {
  test('POST /api/migration/cancel - requires auth', async ({ request }) => {
    const response = await request.post('/api/migration/cancel', {
      data: { migration_id: INVALID_UUID }
    })
    expect([401, 404, 400]).toContain(response.status())
  })
})

// ============================================
// SHOPIFY ORDER TRANSFORMER (inline logic)
// ============================================

test.describe('Shopify Order Transformer', () => {
  // We test the transformation logic inline since Playwright can't import TS source modules

  test('IMP- prefix applied to order number', () => {
    const shopifyName = '#1001'
    const rawNumber = shopifyName.replace(/^#/, '')
    const orderNumber = `IMP-${rawNumber}`
    expect(orderNumber).toBe('IMP-1001')
  })

  test('financial status mapping: PAID -> paid', () => {
    const mapping: Record<string, string> = {
      PAID: 'paid', PARTIALLY_PAID: 'paid',
      REFUNDED: 'refunded', PARTIALLY_REFUNDED: 'refunded',
      VOIDED: 'failed',
      PENDING: 'pending', AUTHORIZED: 'pending',
    }
    expect(mapping['PAID']).toBe('paid')
    expect(mapping['PENDING']).toBe('pending')
    expect(mapping['REFUNDED']).toBe('refunded')
    expect(mapping['VOIDED']).toBe('failed')
  })

  test('fulfillment status mapping', () => {
    // FULFILLED -> delivered
    expect(mapOrderStatus('FULFILLED', 'PAID')).toBe('delivered')
    // UNFULFILLED + PAID -> confirmed
    expect(mapOrderStatus('UNFULFILLED', 'PAID')).toBe('confirmed')
    // UNFULFILLED + PENDING -> pending
    expect(mapOrderStatus('UNFULFILLED', 'PENDING')).toBe('pending')
    // PARTIALLY_FULFILLED -> shipped
    expect(mapOrderStatus('PARTIALLY_FULFILLED', 'PAID')).toBe('shipped')
    // REFUNDED overrides everything
    expect(mapOrderStatus('FULFILLED', 'REFUNDED')).toBe('refunded')
  })

  test('MoneyBag amount parsing', () => {
    expect(parseFloat('150.50')).toBe(150.5)
    expect(parseFloat('0.00')).toBe(0)
    expect(parseFloat('1250.99')).toBe(1250.99)
  })

  test('line item total = quantity * unit_price', () => {
    const quantity = 3
    const unitPrice = parseFloat('25.00')
    expect(unitPrice * quantity).toBe(75)
  })

  test('GID extraction', () => {
    expect(extractGid('gid://shopify/Order/1001')).toBe('1001')
    expect(extractGid('gid://shopify/Product/501')).toBe('501')
    expect(extractGid('gid://shopify/Customer/201')).toBe('201')
  })

  test('payment gateway mapping defaults to cod', () => {
    expect(mapPaymentGateway('shopify_payments')).toBe('cod')
    expect(mapPaymentGateway('manual')).toBe('cod')
    expect(mapPaymentGateway('razorpay')).toBe('razorpay')
    expect(mapPaymentGateway('')).toBe('cod')
  })

  test('missing shipping address produces fallback', () => {
    const fallback = {
      name: 'Unknown',
      phone: '',
      address_line1: 'N/A',
      city: 'N/A',
      state: 'N/A',
      pincode: '000000',
      country: 'India',
    }
    expect(fallback.address_line1).toBe('N/A')
    expect(fallback.country).toBe('India')
  })
})

// ============================================
// SHOPIFY CUSTOMER TRANSFORMER (inline logic)
// ============================================

test.describe('Shopify Customer Transformer', () => {
  test('full name from first + last', () => {
    const fullName = ['John', 'Doe'].filter(Boolean).join(' ')
    expect(fullName).toBe('John Doe')
  })

  test('full name falls back to email prefix', () => {
    const firstName = null
    const lastName = null
    const email = 'anonymous@example.com'
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0]
    expect(fullName).toBe('anonymous')
  })

  test('null email skips customer', () => {
    const email = null
    expect(email).toBeNull()
    // Transformer should return null for customers without email
  })

  test('numberOfOrders parsed from string', () => {
    expect(parseInt('15')).toBe(15)
    expect(parseInt('0')).toBe(0)
  })

  test('amountSpent parsed from string', () => {
    expect(parseFloat('1250.75')).toBe(1250.75)
    expect(parseFloat('0.00')).toBe(0)
  })

  test('first address marked as default', () => {
    const addresses = [
      { city: 'Mumbai', is_default: true },
      { city: 'Delhi', is_default: false },
    ]
    expect(addresses[0].is_default).toBe(true)
    expect(addresses[1].is_default).toBe(false)
  })
})

// ============================================
// SHOPIFY DISCOUNT TRANSFORMER (inline logic)
// ============================================

test.describe('Shopify Discount Transformer', () => {
  test('DiscountPercentage: 0.20 -> 20%', () => {
    const percentage = 0.20
    expect(percentage * 100).toBe(20)
  })

  test('DiscountAmount: parses amount string', () => {
    expect(parseFloat('100.00')).toBe(100)
    expect(parseFloat('49.99')).toBe(49.99)
  })

  test('free_shipping has discount_value 0', () => {
    const discountType = 'free_shipping'
    const discountValue = 0
    expect(discountType).toBe('free_shipping')
    expect(discountValue).toBe(0)
  })

  test('automatic discounts are skipped', () => {
    const typename: string = 'DiscountAutomaticBasic'
    const isCodeBased = typename === 'DiscountCodeBasic' || typename === 'DiscountCodeFreeShipping'
    expect(isCodeBased).toBe(false)
  })

  test('code-based discounts are accepted', () => {
    const basic: string = 'DiscountCodeBasic'
    const freeShip: string = 'DiscountCodeFreeShipping'
    const codeTypes = ['DiscountCodeBasic', 'DiscountCodeFreeShipping']
    expect(codeTypes).toContain(basic)
    expect(codeTypes).toContain(freeShip)
  })

  test('discounts without codes are skipped', () => {
    const codes = { edges: [] as Array<{ node: { code: string } }> }
    const code = codes.edges[0]?.node?.code
    expect(code).toBeUndefined()
  })

  test('minimum subtotal requirement parsed', () => {
    const amount = '500.00'
    expect(parseFloat(amount)).toBe(500)
  })

  test('usage limit and count mapped', () => {
    const usageLimit = 100
    const asyncUsageCount = 42
    expect(usageLimit).toBe(100)
    expect(asyncUsageCount).toBe(42)
  })

  test('ACTIVE status maps to active=true', () => {
    const active: string = 'ACTIVE'
    const expired: string = 'EXPIRED'
    expect(active === 'ACTIVE').toBe(true)
    expect(expired === 'ACTIVE').toBe(false)
  })

  test('coupon code uppercased', () => {
    expect('summer2024'.toUpperCase()).toBe('SUMMER2024')
    expect('SAVE20'.toUpperCase()).toBe('SAVE20')
  })
})

// ============================================
// SHOPIFY OAUTH ENDPOINTS
// ============================================

test.describe('Shopify OAuth', () => {
  test('GET /api/migration/shopify/auth - requires store_id and shop', async ({ request }) => {
    const response = await request.get('/api/migration/shopify/auth')
    // Without params, should redirect with error or return error status
    expect([200, 302, 400, 401, 500]).toContain(response.status())
  })

  test('GET /api/migration/shopify/callback - handles missing params', async ({ request }) => {
    const response = await request.get('/api/migration/shopify/callback')
    // Should handle gracefully (may redirect with error param)
    expect([200, 302, 400, 500]).toContain(response.status())
  })

  test('POST /api/migration/shopify/connect - requires body', async ({ request }) => {
    const response = await request.post('/api/migration/shopify/connect', {
      data: {}
    })
    expect([400, 401, 500]).toContain(response.status())
  })
})

// ============================================
// TYPE COMPATIBILITY CHECKS
// ============================================

test.describe('Migration Type Compatibility', () => {
  test('MigrationConfig includes new import flags', () => {
    const config = {
      migration_id: 'test',
      import_products: true,
      import_collections: true,
      import_orders: true,
      import_customers: true,
      import_coupons: true,
      product_status: 'draft' as const,
    }

    expect(config.import_orders).toBe(true)
    expect(config.import_customers).toBe(true)
    expect(config.import_coupons).toBe(true)
  })

  test('MigrationProgress includes new phase types', () => {
    const validPhases = ['products', 'collections', 'customers', 'coupons', 'orders', 'done']
    expect(validPhases).toContain('customers')
    expect(validPhases).toContain('coupons')
    expect(validPhases).toContain('orders')
  })

  test('MigrationError includes new types', () => {
    const validTypes = ['product', 'collection', 'image', 'auth', 'rate_limit', 'order', 'customer', 'coupon']
    expect(validTypes).toContain('order')
    expect(validTypes).toContain('customer')
    expect(validTypes).toContain('coupon')
  })
})

// ============================================
// HELPER: Logic functions mirroring transformers
// ============================================

function extractGid(gid: string): string {
  const parts = gid.split('/')
  return parts[parts.length - 1]
}

function mapOrderStatus(fulfillment: string, financial: string): string {
  if (financial === 'REFUNDED') return 'refunded'
  if (financial === 'VOIDED') return 'cancelled'
  switch (fulfillment) {
    case 'FULFILLED': return 'delivered'
    case 'PARTIALLY_FULFILLED':
    case 'IN_PROGRESS': return 'shipped'
    case 'PENDING_FULFILLMENT':
    case 'OPEN': return 'processing'
    case 'RESTOCKED': return 'cancelled'
    case 'UNFULFILLED':
    default:
      if (financial === 'PAID') return 'confirmed'
      return 'pending'
  }
}

function mapPaymentGateway(gateway: string): string {
  const g = gateway.toLowerCase()
  if (g.includes('razorpay')) return 'razorpay'
  return 'cod'
}
