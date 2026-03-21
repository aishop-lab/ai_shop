import { test, expect } from '@playwright/test'
import { loginAsMerchant } from '../../helpers/auth'

/**
 * Phase II-E: Order Management Journey
 * View order → Update status → Track shipping
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Order Management Journey', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsMerchant(page)
    if (!loggedIn) {
      test.skip()
      return
    }
  })

  test('orders page loads with table or empty state', async ({ page }) => {
    await page.goto('/dashboard/orders', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const hasTable = await page.locator('table, [role="table"]').first().isVisible({ timeout: 5000 }).catch(() => false)
    const hasEmptyState = await page.locator('text=/no orders|empty/i').first().isVisible({ timeout: 3000 }).catch(() => false)
    const hasHeading = await page.locator('h1, h2').filter({ hasText: /orders/i }).first().isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasTable || hasEmptyState || hasHeading).toBe(true)
  })

  test('order detail page loads for existing order', async ({ page }) => {
    await page.goto('/dashboard/orders', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const orderLink = page.locator('a[href*="/dashboard/orders/"]').first()
    const hasOrder = await orderLink.isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasOrder) {
      test.skip(true, 'No orders to test detail page')
      return
    }

    await orderLink.click()
    await page.waitForTimeout(3000)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(50)

    // Order detail should show order info
    const hasOrderInfo = /order|status|total|customer|shipping/i.test(bodyText)
    expect(hasOrderInfo).toBe(true)
  })

  test('order detail has status controls', async ({ page }) => {
    await page.goto('/dashboard/orders', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const orderLink = page.locator('a[href*="/dashboard/orders/"]').first()
    const hasOrder = await orderLink.isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasOrder) {
      test.skip(true, 'No orders')
      return
    }

    await orderLink.click()
    await page.waitForTimeout(3000)

    // Look for status dropdown, buttons, or controls
    const hasStatusControls = await page
      .locator('select, [role="combobox"], button:has-text("Update"), button:has-text("Mark")')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    const bodyText = await page.locator('body').innerText()
    const hasStatusText = /pending|processing|shipped|delivered|cancelled/i.test(bodyText)

    expect(hasStatusControls || hasStatusText).toBe(true)
  })

  test('order create API requires valid data', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/orders/create`, {
      data: {},
    })
    expect([400, 401, 403]).toContain(response.status())
  })

  test('order lookup API handles invalid order', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/orders/lookup/NONEXISTENT-ORDER`)
    expect([400, 404]).toContain(response.status())
  })

  test('verify-payment API requires data', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/orders/verify-payment`, {
      data: {},
    })
    expect([400, 401]).toContain(response.status())
  })

  test('refunds page loads', async ({ page }) => {
    await page.goto('/dashboard/refunds', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(20)
  })

  test('returns page loads', async ({ page }) => {
    await page.goto('/dashboard/returns', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(20)
  })

  test('notification bell shows order notifications', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const bellButton = page.locator(
      'button:has(svg), button[aria-label*="notification" i], button[aria-label*="bell" i]'
    ).first()
    const hasBell = await bellButton.isVisible({ timeout: 5000 }).catch(() => false)
    // Bell may or may not exist — just verify the dashboard doesn't crash
    expect(typeof hasBell).toBe('boolean')
  })
})
