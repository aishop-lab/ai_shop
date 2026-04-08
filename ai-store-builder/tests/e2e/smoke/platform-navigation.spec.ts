import { test, expect } from '@playwright/test'
import { loginAsMerchant } from '../../helpers/auth'

/**
 * Platform Navigation Smoke Tests
 *
 * Verifies all platform pages load without errors,
 * sidebar navigation works, and key UI elements render
 * in the dark platform theme.
 */

test.describe('Platform Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsMerchant(page)
    if (!loggedIn) {
      test.skip()
      return
    }
  })

  // ============================================
  // COMMAND CENTER
  // ============================================

  test('Command Center loads', async ({ page }) => {
    await page.goto('/platform', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Should have heading content
    const hasContent = await page
      .locator('h1, h2, h3')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hasContent).toBe(true)
  })

  test('Sidebar renders with navigation links', async ({ page }) => {
    await page.goto('/platform', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Check for key navigation items
    const expectedLinks = ['Command Center', 'Products', 'Orders', 'Settings']
    for (const linkText of expectedLinks) {
      const link = page.locator('a, button').filter({ hasText: new RegExp(linkText, 'i') })
      const hasLink = await link.first().isVisible({ timeout: 3000 }).catch(() => false)
      expect(hasLink, `Expected sidebar link "${linkText}" to be visible`).toBe(true)
    }
  })

  test('Sidebar shows agent links', async ({ page }) => {
    await page.goto('/platform', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const agentLinks = ['Support', 'Sales', 'Analytics', 'Technical', 'Marketing']
    for (const agent of agentLinks) {
      const link = page.locator('a').filter({ hasText: new RegExp(agent, 'i') })
      const hasLink = await link.first().isVisible({ timeout: 3000 }).catch(() => false)
      expect(hasLink, `Expected agent link "${agent}" to be visible`).toBe(true)
    }
  })

  // ============================================
  // SETTINGS PAGES
  // ============================================

  test('Settings page shows all setting cards', async ({ page }) => {
    await page.goto('/platform/settings', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const expectedCards = [
      'Agent Configuration',
      'Connected Accounts',
      'Store Settings',
      'Notifications',
      'Payments',
      'Shipping',
    ]
    for (const card of expectedCards) {
      const el = page.locator('a, div').filter({ hasText: new RegExp(card, 'i') })
      const visible = await el.first().isVisible({ timeout: 3000 }).catch(() => false)
      expect(visible, `Expected setting card "${card}" to be visible`).toBe(true)
    }
  })

  test('Payments settings renders in platform theme', async ({ page }) => {
    await page.goto('/platform/settings/payments', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Should have back link to Settings
    const backLink = page.locator('a').filter({ hasText: 'Settings' }).first()
    expect(await backLink.isVisible({ timeout: 3000 }).catch(() => false)).toBe(true)

    // Should have Razorpay section
    expect(
      await page.locator('text=Razorpay').first().isVisible({ timeout: 3000 }).catch(() => false)
    ).toBe(true)

    // Should have Stripe section
    expect(
      await page.locator('text=Stripe').first().isVisible({ timeout: 3000 }).catch(() => false)
    ).toBe(true)

    // Should NOT have shadcn CardHeader elements (old theme)
    const cardHeaders = await page.locator('[class*="CardHeader"]').count()
    expect(cardHeaders).toBe(0)
  })

  test('Shipping settings renders in platform theme', async ({ page }) => {
    await page.goto('/platform/settings/shipping', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const backLink = page.locator('a').filter({ hasText: 'Settings' }).first()
    expect(await backLink.isVisible({ timeout: 3000 }).catch(() => false)).toBe(true)
  })

  test('Notifications settings renders in platform theme', async ({ page }) => {
    await page.goto('/platform/settings/notifications', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const backLink = page.locator('a').filter({ hasText: 'Settings' }).first()
    expect(await backLink.isVisible({ timeout: 3000 }).catch(() => false)).toBe(true)

    // Should have email and whatsapp tabs or sections
    expect(
      await page
        .locator('text=Email')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ).toBe(true)
  })

  test('Agent config shows all 5 agents', async ({ page }) => {
    await page.goto('/platform/settings/agents', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const agents = ['Support', 'Sales', 'Analytics', 'Technical', 'Marketing']
    for (const agent of agents) {
      const el = page.locator('div').filter({ hasText: new RegExp(`${agent} Agent`, 'i') })
      const visible = await el.first().isVisible({ timeout: 5000 }).catch(() => false)
      expect(visible, `Expected agent card "${agent}" to be visible`).toBe(true)
    }
  })

  test('Store settings renders in platform theme', async ({ page }) => {
    await page.goto('/platform/settings/store', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const backLink = page.locator('a').filter({ hasText: 'Settings' }).first()
    expect(await backLink.isVisible({ timeout: 3000 }).catch(() => false)).toBe(true)

    // Should have store name input
    expect(
      await page
        .locator('text=Store Name')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ).toBe(true)
  })

  test('Connections page renders', async ({ page }) => {
    await page.goto('/platform/settings/connections', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    expect(
      await page
        .locator('text=Connected Accounts')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ).toBe(true)
  })

  // ============================================
  // AGENT WORKSPACE PAGES
  // ============================================

  test('Support agent workspace loads', async ({ page }) => {
    await page.goto('/platform/agents/support', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    // Should show agent name
    expect(
      await page
        .locator('text=Support Agent')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ).toBe(true)

    // Should show timeline and chat tabs
    const timelineTab = page.locator('button').filter({ hasText: /timeline/i })
    const chatTab = page.locator('button').filter({ hasText: /chat/i })
    expect(await timelineTab.first().isVisible({ timeout: 3000 }).catch(() => false)).toBe(true)
    expect(await chatTab.first().isVisible({ timeout: 3000 }).catch(() => false)).toBe(true)
  })

  test('Sales agent workspace loads', async ({ page }) => {
    await page.goto('/platform/agents/sales', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    expect(
      await page
        .locator('text=Sales Agent')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ).toBe(true)
  })

  test('Invalid agent shows error', async ({ page }) => {
    await page.goto('/platform/agents/invalid-type', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    expect(
      await page
        .locator('text=Agent not found')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ).toBe(true)
  })

  // ============================================
  // OTHER PLATFORM PAGES
  // ============================================

  test('Approvals page loads', async ({ page }) => {
    await page.goto('/platform/approvals', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    expect(
      await page
        .locator('text=Approvals')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ).toBe(true)
  })

  test('Products page loads', async ({ page }) => {
    await page.goto('/platform/products', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const hasContent = await page
      .locator('h1, h2, h3')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hasContent).toBe(true)
  })

  test('Orders page loads', async ({ page }) => {
    await page.goto('/platform/orders', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const hasContent = await page
      .locator('h1, h2, h3')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hasContent).toBe(true)
  })

  test('Analytics page loads', async ({ page }) => {
    await page.goto('/platform/analytics', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const hasContent = await page
      .locator('h1, h2, h3')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hasContent).toBe(true)
  })

  test('Customers page loads', async ({ page }) => {
    await page.goto('/platform/customers', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    expect(
      await page
        .locator('text=Customers')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ).toBe(true)
  })

  test('Collections page loads', async ({ page }) => {
    await page.goto('/platform/collections', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    expect(
      await page
        .locator('text=Collections')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ).toBe(true)
  })

  test('Coupons page loads', async ({ page }) => {
    await page.goto('/platform/coupons', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    expect(
      await page
        .locator('text=Coupons')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ).toBe(true)
  })

  // ============================================
  // SIDEBAR NAVIGATION
  // ============================================

  test('Sidebar shows all store navigation links', async ({ page }) => {
    await page.goto('/platform', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const storeLinks = ['Products', 'Collections', 'Orders', 'Customers', 'Coupons', 'Reports']
    for (const linkText of storeLinks) {
      const link = page.locator('a').filter({ hasText: new RegExp(`^${linkText}$`, 'i') })
      const visible = await link.first().isVisible({ timeout: 3000 }).catch(() => false)
      expect(visible, `Expected sidebar store link "${linkText}" to be visible`).toBe(true)
    }
  })
})
