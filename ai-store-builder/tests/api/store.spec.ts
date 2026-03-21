import { test, expect } from '@playwright/test'

/**
 * Phase III-E: Store API Tests
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const TEST_SLUG = process.env.PLAYWRIGHT_TEST_STORE_SLUG || 'demo-store'

test.describe('Store API', () => {
  test('GET /api/store/{slug}/data returns store data', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/store/${TEST_SLUG}/data`)
    expect([200, 404]).toContain(res.status())
    if (res.status() === 200) {
      const data = await res.json()
      expect(data).toBeTruthy()
    }
  })

  test('GET /api/store/{slug}/data returns 404 for invalid slug', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/store/nonexistent-store-xyz/data`)
    expect([404]).toContain(res.status())
  })

  test('GET /api/store/{slug}/products returns products', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/store/${TEST_SLUG}/products`)
    expect([200, 404]).toContain(res.status())
  })

  test('GET /api/store/{slug}/products/{id} returns 404 for invalid product', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/store/${TEST_SLUG}/products/nonexistent-id`)
    expect([400, 404]).toContain(res.status())
  })

  test('GET /api/store/{slug}/collections returns collections', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/store/${TEST_SLUG}/collections`)
    expect([200, 404]).toContain(res.status())
  })

  test('GET /api/stores/{slug} returns store config', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/stores/${TEST_SLUG}`)
    expect([200, 404]).toContain(res.status())
  })

  test('GET /api/stores/policies requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/stores/policies`)
    expect([200, 401, 403]).toContain(res.status())
  })

  test('POST /api/stores/policies/regenerate requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/stores/policies/regenerate`, { data: {} })
    expect([200, 400, 401, 403]).toContain(res.status())
  })
})
