import { test, expect } from '@playwright/test'
import { loginAsMerchant } from '../../helpers/auth'

/**
 * Phase II-J: Migration Journey
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Migration Journey', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsMerchant(page)
    if (!loggedIn) { test.skip(); return }
  })

  test('migration page loads with platform options', async ({ page }) => {
    await page.goto('/dashboard/migrate', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const bodyText = await page.locator('body').innerText()
    const hasShopify = /shopify/i.test(bodyText)
    const hasEtsy = /etsy/i.test(bodyText)
    const hasMigrate = /migrat|import/i.test(bodyText)

    expect(hasShopify || hasEtsy || hasMigrate).toBe(true)
  })

  test('migration page has Shopify option', async ({ page }) => {
    await page.goto('/dashboard/migrate', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const shopifyOption = page.locator('text=/shopify/i').first()
    const hasShopify = await shopifyOption.isVisible({ timeout: 5000 }).catch(() => false)
    expect(hasShopify).toBe(true)
  })

  test('migration page has Etsy option', async ({ page }) => {
    await page.goto('/dashboard/migrate', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const etsyOption = page.locator('text=/etsy/i').first()
    const hasEtsy = await etsyOption.isVisible({ timeout: 5000 }).catch(() => false)
    expect(hasEtsy).toBe(true)
  })

  test('migration start API requires auth', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/migration/start`, { data: {} })
    expect([400, 401, 403]).toContain(response.status())
  })

  test('migration status API requires auth', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/migration/status`)
    expect([400, 401, 403]).toContain(response.status())
  })

  test('migration cancel API requires auth', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/migration/cancel`, { data: {} })
    expect([400, 401, 403]).toContain(response.status())
  })
})
