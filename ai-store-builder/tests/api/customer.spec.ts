import { test, expect } from '@playwright/test'

/**
 * Phase III-F: Customer API Tests
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Customer API', () => {
  test('GET /api/customer/addresses requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/customer/addresses`)
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/customer/addresses requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/addresses`, {
      data: { name: 'Test', address: '123 St' },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/customer/wishlist requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/customer/wishlist`)
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/customer/wishlist requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/wishlist`, {
      data: { productId: 'test' },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('DELETE /api/customer/wishlist requires auth', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/api/customer/wishlist`)
    expect([401, 403, 405]).toContain(res.status())
  })

  test('POST /api/customer/register handles missing fields', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/register`, { data: {} })
    expect([400]).toContain(res.status())
  })

  test('POST /api/customer/login rejects wrong credentials', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/login`, {
      data: { email: 'no@one.com', password: 'wrong', storeId: 'test' },
    })
    expect([400, 401]).toContain(res.status())
  })

  test('POST /api/customer/forgot-password handles invalid email', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/forgot-password`, {
      data: { email: 'nonexistent@test.com', storeId: 'test' },
    })
    // May return 200 (to not leak user existence) or 400/404
    expect([200, 400, 404]).toContain(res.status())
  })

  test('GET /api/customer/me requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/customer/me`)
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/customer/orders requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/customer/orders`)
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/customer/logout handles no session', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/logout`)
    expect([200, 401]).toContain(res.status())
  })
})
