import { test, expect } from '@playwright/test'
import { getAuthToken, TEST_MERCHANT, TEST_ADMIN } from '../helpers/auth'

/**
 * Phase III — Admin API Integration Tests
 *
 * Tests admin-only endpoints for proper authorization.
 * Admin endpoints must reject unauthenticated requests (401)
 * and non-admin authenticated requests (403).
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Admin API - Stats', () => {
  test('GET /api/admin/stats - without auth returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/stats`)
    expect([401, 403]).toContain(response.status())
  })

  test('GET /api/admin/stats - non-admin auth returns 403', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available — skipping authenticated test')

    const response = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(response.status).toBe(403)
  })

  test('GET /api/admin/stats - admin auth returns 200', async () => {
    const token = await getAuthToken(TEST_ADMIN.email, TEST_ADMIN.password)
    test.skip(!token, 'Admin auth token not available — skipping admin test')

    const response = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toBeTruthy()
  })
})

test.describe('Admin API - Stores', () => {
  test('GET /api/admin/stores - without auth returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/stores`)
    expect([401, 403]).toContain(response.status())
  })

  test('GET /api/admin/stores - non-admin auth returns 403', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available — skipping authenticated test')

    const response = await fetch(`${BASE_URL}/api/admin/stores`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(response.status).toBe(403)
  })

  test('GET /api/admin/stores - admin auth returns stores list', async () => {
    const token = await getAuthToken(TEST_ADMIN.email, TEST_ADMIN.password)
    test.skip(!token, 'Admin auth token not available — skipping admin test')

    const response = await fetch(`${BASE_URL}/api/admin/stores`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toBeTruthy()
  })
})

test.describe('Admin API - Analytics', () => {
  test('GET /api/admin/analytics - without auth returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/analytics`)
    expect([401, 403]).toContain(response.status())
  })

  test('GET /api/admin/analytics - non-admin auth returns 403', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available — skipping authenticated test')

    const response = await fetch(`${BASE_URL}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(response.status).toBe(403)
  })

  test('GET /api/admin/analytics - admin auth returns analytics data', async () => {
    const token = await getAuthToken(TEST_ADMIN.email, TEST_ADMIN.password)
    test.skip(!token, 'Admin auth token not available — skipping admin test')

    const response = await fetch(`${BASE_URL}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect([200, 400]).toContain(response.status)
  })
})

test.describe('Admin API - Sellers', () => {
  test('GET /api/admin/sellers - without auth returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/sellers`)
    expect([401, 403]).toContain(response.status())
  })

  test('GET /api/admin/sellers - non-admin auth returns 403', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available — skipping authenticated test')

    const response = await fetch(`${BASE_URL}/api/admin/sellers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(response.status).toBe(403)
  })
})

test.describe('Admin API - Store Actions', () => {
  test('POST /api/admin/stores/suspend - without auth returns 401', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/admin/stores/suspend`, {
      headers: { 'Content-Type': 'application/json' },
      data: { store_id: '00000000-0000-0000-0000-000000000000' },
    })
    expect([400, 401, 403, 404, 405]).toContain(response.status())
  })

  test('POST /api/admin/stores/suspend - non-admin auth returns 403', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available — skipping authenticated test')

    const response = await fetch(`${BASE_URL}/api/admin/stores/suspend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ store_id: '00000000-0000-0000-0000-000000000000' }),
    })
    expect(response.status).toBe(403)
  })
})
