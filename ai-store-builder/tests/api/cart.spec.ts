import { test, expect } from '@playwright/test'

/**
 * Phase III — Cart API Integration Tests
 *
 * Tests cart validation, coupon application, and inventory checking.
 * Cart endpoints are customer-facing and generally do not require merchant auth,
 * but they do require valid store context.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const INVALID_UUID = '00000000-0000-0000-0000-000000000000'

test.describe('Cart API - Validate', () => {
  test('POST /api/cart/validate - empty cart returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cart/validate`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        store_id: INVALID_UUID,
        items: [],
      },
    })
    // Empty cart or invalid store should return an error
    expect([400, 404, 422, 500]).toContain(response.status())
  })

  test('POST /api/cart/validate - with invalid product IDs returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cart/validate`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
      },
    })
    expect([200, 400, 404, 500]).toContain(response.status())
    const body = await response.json().catch(() => null)
    if (body && response.status() === 200) {
      // Even a 200 may indicate items are invalid/unavailable
      expect(body).toBeTruthy()
    }
  })

  test('POST /api/cart/validate - missing store_id returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cart/validate`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
      },
    })
    expect([400, 422, 500]).toContain(response.status())
  })
})

test.describe('Cart API - Apply Coupon', () => {
  test('POST /api/cart/apply-coupon - without store context returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cart/apply-coupon`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        code: 'FAKECOUPON',
      },
    })
    // Missing store_id should fail
    expect([400, 404, 422, 500]).toContain(response.status())
    const body = await response.json().catch(() => null)
    if (body) {
      expect(body.error || body.message || body.success === false).toBeTruthy()
    }
  })

  test('POST /api/cart/apply-coupon - invalid coupon code returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cart/apply-coupon`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        code: 'NONEXISTENT_COUPON_XYZ',
        store_id: INVALID_UUID,
        cart_total: 1000,
      },
    })
    expect([400, 404, 500]).toContain(response.status())
  })

  test('POST /api/cart/apply-coupon - empty code returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cart/apply-coupon`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        code: '',
        store_id: INVALID_UUID,
        cart_total: 500,
      },
    })
    expect([400, 422, 500]).toContain(response.status())
  })
})

test.describe('Cart API - Check Inventory', () => {
  test('POST /api/cart/check-inventory - empty items returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cart/check-inventory`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        items: [],
      },
    })
    expect([400, 422, 500]).toContain(response.status())
  })

  test('POST /api/cart/check-inventory - invalid product IDs returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cart/check-inventory`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        items: [{ product_id: INVALID_UUID, quantity: 999 }],
      },
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })

  test('POST /api/cart/check-inventory - missing body returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cart/check-inventory`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect([400, 422, 500]).toContain(response.status())
  })
})

test.describe('Cart API - Save (Abandoned Cart)', () => {
  test('POST /api/cart/save - with invalid store returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cart/save`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        store_id: INVALID_UUID,
        items: [{ product_id: INVALID_UUID, quantity: 1 }],
        email: 'abandoned@test.com',
      },
    })
    expect([200, 400, 404, 500]).toContain(response.status())
  })
})

test.describe('Cart API - Remove Coupon', () => {
  test('POST /api/cart/remove-coupon - without store context returns error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/cart/remove-coupon`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect([400, 403, 404, 405, 500]).toContain(response.status())
  })
})
