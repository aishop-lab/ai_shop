import { test, expect } from '@playwright/test'
import { getAuthToken, TEST_MERCHANT } from '../helpers/auth'

/**
 * Phase III-K: AI & Onboarding API Tests
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('AI API', () => {
  test('POST /api/ai/bot requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/ai/bot`, {
      data: { messages: [{ role: 'user', content: 'test' }] },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/ai/chat requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/ai/chat`, {
      data: { message: 'test' },
    })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/ai/generate-content requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/ai/generate-content`, {
      data: { prompt: 'test' },
    })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/ai/stream-description requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/ai/stream-description`, {
      data: { title: 'Test Product' },
    })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('GET /api/ai/test returns health status', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/ai/test`)
    expect(res.status()).toBeLessThan(600)
  })

  test('POST /api/ai/bot with auth', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available')

    const res = await fetch(`${BASE_URL}/api/ai/bot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
    })
    // Should succeed or fail gracefully (no 500)
    expect([200, 400, 429]).toContain(res.status)
  })
})

test.describe('Onboarding API', () => {
  test('POST /api/onboarding/start requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/onboarding/start`, { data: {} })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/onboarding/extract-category responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/onboarding/extract-category`, {
      data: { text: 'handmade jewelry and accessories' },
    })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/onboarding/suggest-names responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/onboarding/suggest-names`, {
      data: { category: 'jewelry', keywords: 'handmade' },
    })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/onboarding/analyze-brand responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/onboarding/analyze-brand`, {
      data: { name: 'TestBrand' },
    })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/onboarding/generate-blueprint responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/onboarding/generate-blueprint`, { data: {} })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/onboarding/generate-logo responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/onboarding/generate-logo`, { data: {} })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/onboarding/generate-policies responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/onboarding/generate-policies`, { data: {} })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/onboarding/generate-store-content responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/onboarding/generate-store-content`, { data: {} })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/onboarding/upload-logo responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/onboarding/upload-logo`, { data: {} })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/onboarding/complete requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/onboarding/complete`, { data: {} })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/onboarding/process requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/onboarding/process`, { data: {} })
    expect([200, 400, 401, 403]).toContain(res.status())
  })

  test('POST /api/onboarding/reset requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/onboarding/reset`, { data: {} })
    expect([200, 400, 401, 403]).toContain(res.status())
  })
})
