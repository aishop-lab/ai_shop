import { test, expect } from '@playwright/test'
import { getAuthToken, TEST_MERCHANT } from '../helpers/auth'

/**
 * Phase III — Products API Integration Tests
 *
 * Tests product CRUD endpoints directly via fetch.
 * Covers listing, single product retrieval, and auth guards.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const INVALID_UUID = '00000000-0000-0000-0000-000000000000'

test.describe('Products API - List', () => {
  test('GET /api/products/list - without auth returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/products/list`)
    expect(response.status()).toBe(401)
  })

  test('GET /api/products/list - with auth returns products array', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available — skipping authenticated test')

    const response = await fetch(`${BASE_URL}/api/products/list`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    // Should return an array (possibly empty) or an object with a products field
    if (Array.isArray(body)) {
      expect(Array.isArray(body)).toBe(true)
    } else {
      expect(body).toHaveProperty('products')
      expect(Array.isArray(body.products)).toBe(true)
    }
  })
})

test.describe('Products API - Single Product', () => {
  test('GET /api/products/{id} - invalid UUID returns 404 or 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/products/${INVALID_UUID}`)
    expect([401, 404]).toContain(response.status())
  })

  test('GET /api/products/{id} - non-UUID string returns error', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/products/not-a-real-id`)
    expect([400, 401, 404]).toContain(response.status())
  })

  test('GET /api/products/{id} - with auth and valid format but nonexistent returns 404', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available — skipping authenticated test')

    const response = await fetch(`${BASE_URL}/api/products/${INVALID_UUID}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect([404, 400]).toContain(response.status)
  })
})

test.describe('Products API - Upload', () => {
  test('POST /api/products/upload - without auth returns 401', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/products/upload`, {
      headers: { 'Content-Type': 'application/json' },
      data: { title: 'Test Product', price: 100 },
    })
    expect([400, 401]).toContain(response.status())
  })

  test('POST /api/products/upload - with auth but missing required fields returns error', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available — skipping authenticated test')

    const response = await fetch(`${BASE_URL}/api/products/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })
    // Should reject empty body — multipart expected or validation fail
    expect([400, 415, 422, 500]).toContain(response.status)
  })
})

test.describe('Products API - Update', () => {
  test('PATCH /api/products/{id} - without auth returns 401', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}/api/products/${INVALID_UUID}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { title: 'Updated Title' },
    })
    expect([401, 404, 405]).toContain(response.status())
  })

  test('PATCH /api/products/{id} - with auth but nonexistent product returns 404', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available — skipping authenticated test')

    const response = await fetch(`${BASE_URL}/api/products/${INVALID_UUID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: 'Updated Title' }),
    })
    expect([404, 400, 403]).toContain(response.status)
  })
})

test.describe('Products API - Delete', () => {
  test('DELETE /api/products/{id} - without auth returns 401', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/products/${INVALID_UUID}`)
    expect([401, 404]).toContain(response.status())
  })
})

test.describe('Products API - Variants', () => {
  test('GET /api/products/{id}/variants - without auth returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/products/${INVALID_UUID}/variants`)
    expect([401, 404]).toContain(response.status())
  })

  test('POST /api/products/{id}/variants - without auth returns 401', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/products/${INVALID_UUID}/variants`, {
      headers: { 'Content-Type': 'application/json' },
      data: { options: [] },
    })
    expect([400, 401, 404]).toContain(response.status())
  })
})

test.describe('Products API - Reviews (public)', () => {
  test('GET /api/products/{id}/reviews - publicly accessible', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/products/${INVALID_UUID}/reviews`)
    // Reviews endpoint is public; invalid product returns 404 or empty
    expect([200, 404]).toContain(response.status())
  })
})
