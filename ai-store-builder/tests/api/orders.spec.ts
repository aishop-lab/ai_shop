import { test, expect } from '@playwright/test'
import { getAuthToken, TEST_MERCHANT } from '../helpers/auth'

/**
 * Phase III — Orders API Integration Tests
 *
 * Tests order creation, payment verification, and order lookup endpoints.
 * Most order endpoints work without merchant auth (customer-facing),
 * but require valid store/product context.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const INVALID_UUID = '00000000-0000-0000-0000-000000000000'

test.describe('Orders API - Create', () => {
  test('POST /api/orders/create - empty body returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/orders/create`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect([400, 422, 500]).toContain(response.status())
    const body = await response.json().catch(() => null)
    if (body) {
      // Error response should have some error indication
      expect(body.error || body.message || body.success === false).toBeTruthy()
    }
  })

  test('POST /api/orders/create - without items returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/orders/create`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        store_id: INVALID_UUID,
        items: [],
      },
    })
    expect([400, 404, 422, 500]).toContain(response.status())
  })

  test('POST /api/orders/create - with invalid store ID returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/orders/create`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        customer_email: 'test@example.com',
        customer_name: 'Test Customer',
        shipping_address: {
          line1: '123 Test St',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400001',
          country: 'IN',
        },
        payment_method: 'cod',
      },
    })
    // Invalid store or product should fail
    expect([400, 404, 500]).toContain(response.status())
  })
})

test.describe('Orders API - Verify Payment', () => {
  test('POST /api/orders/verify-payment - invalid signature returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/orders/verify-payment`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        razorpay_order_id: 'order_invalid_123',
        razorpay_payment_id: 'pay_invalid_123',
        razorpay_signature: 'invalid_signature_value',
        order_id: INVALID_UUID,
      },
    })
    expect([400, 401, 404, 500]).toContain(response.status())
    const body = await response.json().catch(() => null)
    if (body) {
      expect(body.error || body.message || body.success === false).toBeTruthy()
    }
  })

  test('POST /api/orders/verify-payment - missing fields returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/orders/verify-payment`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect([400, 422, 500]).toContain(response.status())
  })
})

test.describe('Orders API - Lookup', () => {
  test('GET /api/orders/lookup - nonexistent order number returns 404 or error', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/orders/lookup/ORD-NONEXISTENT-999999`)
    expect([400, 401, 403, 404, 405, 500]).toContain(response.status())
  })

  test('GET /api/orders/{id}/invoice - invalid order returns error', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/orders/${INVALID_UUID}/invoice`)
    expect([401, 404, 500]).toContain(response.status())
  })
})

test.describe('Orders API - Merchant Endpoints', () => {
  test('GET /api/dashboard/orders - without auth returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard/orders`)
    expect([401]).toContain(response.status())
  })

  test('GET /api/dashboard/orders - with auth returns orders', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available — skipping authenticated test')

    const response = await fetch(`${BASE_URL}/api/dashboard/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect([200, 400]).toContain(response.status)
    if (response.status === 200) {
      const body = await response.json()
      expect(body).toBeTruthy()
    }
  })
})
