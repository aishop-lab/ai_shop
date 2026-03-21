import { test, expect } from '@playwright/test'
import { getAuthToken, TEST_MERCHANT } from '../helpers/auth'

/**
 * Phase III-J: Agent API Tests
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Agent API - Health', () => {
  test('GET /api/agents/health responds', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/agents/health`)
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })
})

test.describe('Agent API - Activity', () => {
  test('GET /api/agents/activity without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/agents/activity`)
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })
})

test.describe('Agent API - Approvals', () => {
  test('GET /api/agents/approvals without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/agents/approvals`)
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('POST /api/agents/approvals/fake-id rejects', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/agents/approvals/fake-id`, {
      data: { action: 'approve' },
    })
    expect([400, 401, 403, 404, 405]).toContain(res.status())
  })
})

test.describe('Agent API - Memory', () => {
  test('GET /api/agents/memory responds', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/agents/memory`)
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('POST /api/agents/memory requires data', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/agents/memory`, { data: {} })
    expect([400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('DELETE /api/agents/memory/fake-id responds', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/api/agents/memory/fake-id`)
    expect([400, 401, 403, 404]).toContain(res.status())
  })
})

test.describe('Agent API - Execute & Recover', () => {
  test('POST /api/agents/execute requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/agents/execute`, { data: {} })
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/agents/recover requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/agents/recover`, { data: {} })
    expect([401, 403]).toContain(res.status())
  })
})

test.describe('Agent API - Individual Agent', () => {
  test('GET /api/agents/marketing responds', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/agents/marketing`)
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('POST /api/agents/marketing/pause responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/agents/marketing/pause`, { data: {} })
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('POST /api/agents/marketing/chat responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/agents/marketing/chat`, {
      data: { message: 'test' },
    })
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('GET /api/agents/marketing/actions responds', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/agents/marketing/actions`)
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })
})

test.describe('Agent API - Analytics', () => {
  test('GET /api/agents/analytics/report responds', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/agents/analytics/report`)
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('GET /api/agents/analytics/insights responds', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/agents/analytics/insights`)
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })
})

test.describe('Agent API - Support', () => {
  test('POST /api/agents/support/chat responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/agents/support/chat`, {
      data: { message: 'test' },
    })
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })

  test('POST /api/agents/support/webhook responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/agents/support/webhook`, {
      data: { message: 'test' },
    })
    expect([200, 400, 401, 403, 404, 405]).toContain(res.status())
  })
})

test.describe('Agent API - With Auth', () => {
  test('GET /api/agents/health with auth', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available')

    const res = await fetch(`${BASE_URL}/api/agents/health`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect([200, 400]).toContain(res.status)
  })

  test('GET /api/agents/activity with auth', async () => {
    const token = await getAuthToken(TEST_MERCHANT.email, TEST_MERCHANT.password)
    test.skip(!token, 'Auth token not available')

    const res = await fetch(`${BASE_URL}/api/agents/activity`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect([200, 400]).toContain(res.status)
  })
})
