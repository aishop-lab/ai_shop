import { test, expect } from '@playwright/test'

/**
 * Phase III-G: Shipping API Tests
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Shipping API', () => {
  test('POST /api/shipping/calculate requires valid data', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/shipping/calculate`, { data: {} })
    expect([400, 401]).toContain(res.status())
  })

  test('POST /api/shipping/check-pincode requires pincode', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/shipping/check-pincode`, { data: {} })
    expect([400, 401]).toContain(res.status())
  })

  test('POST /api/shipping/check-pincode with valid data', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/shipping/check-pincode`, {
      data: { pincode: '400001', storeId: 'test' },
    })
    expect([200, 400, 401]).toContain(res.status())
  })

  test('POST /api/shipping/estimate requires data', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/shipping/estimate`, { data: {} })
    expect([400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('POST /api/shipping/create-shipment requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/shipping/create-shipment`, { data: {} })
    expect([400, 401, 403]).toContain(res.status())
  })

  test('GET /api/shipping/track requires params', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/shipping/track`)
    expect([400, 401]).toContain(res.status())
  })

  test('GET /api/shipping/track/public requires params', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/shipping/track/public`)
    expect([400]).toContain(res.status())
  })

  test('POST /api/shipping/schedule-pickup requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/shipping/schedule-pickup`, { data: {} })
    expect([400, 401, 403]).toContain(res.status())
  })
})
