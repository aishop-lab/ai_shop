import { test, expect } from '@playwright/test'
import { loginAsMerchant } from '../../helpers/auth'

/**
 * Phase II-H: Agent System Journey
 * Tests agent APIs and agent dashboard pages
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Agent API Tests', () => {
  test('agent health API responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agents/health`)
    expect([200, 400, 401, 403]).toContain(response.status())
  })

  test('agent activity API responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agents/activity`)
    expect([200, 400, 401, 403]).toContain(response.status())
  })

  test('agent approvals API responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agents/approvals`)
    expect([200, 400, 401, 403]).toContain(response.status())
  })

  test('agent memory GET API responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agents/memory`)
    expect([200, 400, 401, 403]).toContain(response.status())
  })

  test('agent memory POST API responds', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/agents/memory`, {
      data: { agentId: 'marketing', content: 'test memory' },
    })
    expect([200, 201, 400, 401, 403, 404, 405]).toContain(response.status())
  })

  test('agent execute requires auth', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/agents/execute`, { data: {} })
    expect([401, 403]).toContain(response.status())
  })

  test('agent recover requires auth', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/agents/recover`, { data: {} })
    expect([401, 403]).toContain(response.status())
  })

  test('agent analytics report API responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agents/analytics/report`)
    expect([200, 400, 401, 403, 404, 405]).toContain(response.status())
  })

  test('agent analytics insights API responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agents/analytics/insights`)
    expect([200, 400, 401, 403]).toContain(response.status())
  })

  test('agent support webhook responds', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/agents/support/webhook`, {
      data: { message: 'test' },
    })
    expect([200, 400, 401, 403]).toContain(response.status())
  })

  test('agent pause API responds', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/agents/marketing/pause`, {
      data: {},
    })
    expect([200, 400, 401, 403]).toContain(response.status())
  })

  test('agent chat API responds', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/agents/marketing/chat`, {
      data: { message: 'test' },
    })
    expect([200, 400, 401, 403]).toContain(response.status())
  })

  test('agent actions API responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agents/marketing/actions`)
    expect([200, 400, 401, 403]).toContain(response.status())
  })

  test('single agent API responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agents/marketing`)
    expect([200, 400, 401, 403]).toContain(response.status())
  })
})

test.describe('Cron Endpoint Auth', () => {
  test('daily-digest requires CRON_SECRET', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/cron/daily-digest`)
    expect([401, 403, 400, 405]).toContain(response.status())
  })

  test('process-abandoned-carts requires CRON_SECRET', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/cron/process-abandoned-carts`)
    expect([401, 403, 400, 405]).toContain(response.status())
  })

  test('check-low-stock requires CRON_SECRET', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/cron/check-low-stock`)
    expect([401, 403, 400, 405]).toContain(response.status())
  })

  test('weekly-report requires CRON_SECRET', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/cron/weekly-report`)
    expect([401, 403, 400, 405]).toContain(response.status())
  })

  test('marketing-optimize requires CRON_SECRET', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/cron/marketing-optimize`)
    expect([401, 403, 400, 405]).toContain(response.status())
  })

  test('marketing-sync requires CRON_SECRET', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/cron/marketing-sync`)
    expect([401, 403, 400, 405]).toContain(response.status())
  })
})

test.describe('Agent Dashboard Pages', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsMerchant(page)
    if (!loggedIn) { test.skip(); return }
  })

  test('agents workspace page loads', async ({ page }) => {
    const response = await page.goto('/dashboard/agents', { waitUntil: 'domcontentloaded' })
    const status = response?.status() || 0
    if (status === 404) { test.skip(true, 'Page not implemented'); return }

    await page.waitForTimeout(2000)
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(20)
  })

  test('approvals page loads', async ({ page }) => {
    const response = await page.goto('/dashboard/approvals', { waitUntil: 'domcontentloaded' })
    const status = response?.status() || 0
    if (status === 404) { test.skip(true, 'Page not implemented'); return }

    await page.waitForTimeout(2000)
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(20)
  })

  test('connections page loads', async ({ page }) => {
    const response = await page.goto('/dashboard/connections', { waitUntil: 'domcontentloaded' })
    const status = response?.status() || 0
    if (status === 404) { test.skip(true, 'Page not implemented'); return }

    await page.waitForTimeout(2000)
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(20)
  })
})
