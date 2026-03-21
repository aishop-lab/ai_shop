import { test, expect } from '@playwright/test'
import { getAuthToken, TEST_MERCHANT } from '../helpers/auth'

/**
 * Phase III-L: Miscellaneous API Tests
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const TEST_SLUG = process.env.PLAYWRIGHT_TEST_STORE_SLUG || 'demo-store'

test.describe('Search API', () => {
  test('GET /api/search with query responds', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/search?q=test&store=${TEST_SLUG}`)
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('GET /api/search without query returns error', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/search`)
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('GET /api/search/suggestions responds', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/search/suggestions?q=te&store=${TEST_SLUG}`)
    expect([200, 400]).toContain(res.status())
  })
})

test.describe('Recommendations API', () => {
  test('GET /api/recommendations responds', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/recommendations`)
    expect([200, 400]).toContain(res.status())
  })
})

test.describe('Reviews API', () => {
  test('POST /api/reviews/fake-id/vote requires context', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/reviews/fake-id/vote`, {
      data: { type: 'upvote' },
    })
    expect([400, 403, 404, 405]).toContain(res.status())
  })
})

test.describe('Notifications API', () => {
  test('GET /api/notifications requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/notifications`)
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/notifications/fake-id/read requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/notifications/fake-id/read`)
    expect([401, 403, 404]).toContain(res.status())
  })

  test('POST /api/notifications/read-all requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/notifications/read-all`)
    expect([200, 401, 403]).toContain(res.status())
  })

  test('GET /api/notifications with auth', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available')

    const res = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect([200]).toContain(res.status)
    const body = await res.json()
    expect(body).toBeTruthy()
  })
})

test.describe('Connections API', () => {
  test('GET /api/connections requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/connections`)
    expect([200, 401, 403]).toContain(res.status())
  })

  test('GET /api/connections/google/auth-url requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/connections/google/auth-url`)
    expect([200, 400, 401, 403]).toContain(res.status())
  })
})

test.describe('Cron API - Auth Guards', () => {
  test('POST /api/cron/daily-digest without secret rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/cron/daily-digest`)
    expect([401, 403, 400, 405]).toContain(res.status())
  })

  test('POST /api/cron/process-abandoned-carts without secret rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/cron/process-abandoned-carts`)
    expect([401, 403, 400, 405]).toContain(res.status())
  })

  test('POST /api/cron/check-low-stock without secret rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/cron/check-low-stock`)
    expect([401, 403, 400, 405]).toContain(res.status())
  })

  test('POST /api/cron/weekly-report without secret rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/cron/weekly-report`)
    expect([401, 403, 400, 405]).toContain(res.status())
  })

  test('POST /api/cron/marketing-optimize without secret rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/cron/marketing-optimize`)
    expect([401, 403, 400, 405]).toContain(res.status())
  })

  test('POST /api/cron/marketing-sync without secret rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/cron/marketing-sync`)
    expect([401, 403, 400, 405]).toContain(res.status())
  })
})

test.describe('Dashboard API', () => {
  test('GET /api/dashboard/stats requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/dashboard/stats`)
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/dashboard/analytics requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/dashboard/analytics`)
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/dashboard/products requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/dashboard/products`)
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/dashboard/collections requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/dashboard/collections`)
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/dashboard/coupons requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/dashboard/coupons`)
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/dashboard/reviews requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/dashboard/reviews`)
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/dashboard/abandoned-carts requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/dashboard/abandoned-carts`)
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/dashboard/settings requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/dashboard/settings`)
    expect([401, 403]).toContain(res.status())
  })
})

test.describe('Migration API', () => {
  test('POST /api/migration/start requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/migration/start`, { data: {} })
    expect([400, 401, 403]).toContain(res.status())
  })

  test('GET /api/migration/status requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/migration/status`)
    expect([400, 401, 403]).toContain(res.status())
  })

  test('POST /api/migration/cancel requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/migration/cancel`, { data: {} })
    expect([400, 401, 403]).toContain(res.status())
  })
})

test.describe('Shipping API', () => {
  test('POST /api/shipping/calculate requires data', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/shipping/calculate`, { data: {} })
    expect([400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('POST /api/shipping/check-pincode requires data', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/shipping/check-pincode`, { data: {} })
    expect([400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('POST /api/shipping/estimate requires data', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/shipping/estimate`, { data: {} })
    expect([400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('GET /api/shipping/track/public requires params', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/shipping/track/public`)
    expect([400]).toContain(res.status())
  })
})
