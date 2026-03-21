import { test, expect } from '@playwright/test'
import { loginAsMerchant, collectConsoleErrors, TEST_STORE_SLUG } from '../../helpers/auth'

/**
 * Dashboard Navigation Smoke Tests
 *
 * Verifies all merchant dashboard pages load without errors,
 * sidebar navigation works, and key UI elements render.
 */

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsMerchant(page)
    if (!loggedIn) {
      test.skip()
      return
    }
  })

  // ============================================
  // CORE DASHBOARD PAGES
  // ============================================

  test.describe('Core Pages', () => {
    test('Dashboard home loads', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      // Dashboard should show a welcome message, stats, or overview content
      const hasContent = await page
        .locator('h1, h2, h3')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasContent).toBe(true)
    })

    test('Sidebar renders with navigation links', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      // Sidebar should contain key navigation items
      const sidebar = page.locator('nav, aside, [role="navigation"]').first()
      const hasSidebar = await sidebar.isVisible({ timeout: 5000 }).catch(() => false)
      expect(hasSidebar).toBe(true)

      // Check for key navigation links
      const expectedLinks = ['Products', 'Orders', 'Analytics']
      for (const linkText of expectedLinks) {
        const link = page.locator('a, button').filter({ hasText: new RegExp(linkText, 'i') })
        const hasLink = await link.first().isVisible({ timeout: 3000 }).catch(() => false)
        expect(hasLink, `Expected sidebar link "${linkText}" to be visible`).toBe(true)
      }
    })

    test('Products page loads', async ({ page }) => {
      await page.goto('/dashboard/products', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      const heading = page.locator('h1, h2').filter({ hasText: /products/i })
      const hasHeading = await heading.first().isVisible({ timeout: 5000 }).catch(() => false)
      expect(hasHeading).toBe(true)

      // "Add Product" button should be present
      const addBtn = page.locator('a, button').filter({ hasText: /add product/i })
      const hasAddBtn = await addBtn.first().isVisible({ timeout: 5000 }).catch(() => false)
      expect(hasAddBtn).toBe(true)
    })

    test('New product page loads', async ({ page }) => {
      await page.goto('/dashboard/products/new', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      // Should have a form or input fields
      const hasForm = await page
        .locator('form, input[type="text"], textarea')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasForm).toBe(true)

      // Should have image upload area
      const hasUpload = await page
        .locator('[type="file"], [class*="upload"], [class*="drop"], [class*="image"]')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasUpload).toBe(true)
    })

    test('Orders page loads', async ({ page }) => {
      await page.goto('/dashboard/orders', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      const heading = page.locator('h1, h2').filter({ hasText: /orders/i })
      const hasHeading = await heading.first().isVisible({ timeout: 5000 }).catch(() => false)
      // Could show heading or an empty state
      const emptyState = page.locator('text=/no orders/i, text=/empty/i')
      const hasEmptyState = await emptyState.first().isVisible({ timeout: 3000 }).catch(() => false)
      expect(hasHeading || hasEmptyState).toBe(true)
    })

    test('Analytics page loads', async ({ page }) => {
      await page.goto('/dashboard/analytics', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      // Should have charts, analytics content, or at least a heading
      const hasContent = await page
        .locator('h1, h2, canvas, svg, [class*="chart"], [class*="analytics"]')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasContent).toBe(true)
    })

    test('Collections page loads', async ({ page }) => {
      await page.goto('/dashboard/collections', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      const heading = page.locator('h1, h2').filter({ hasText: /collections/i })
      const hasHeading = await heading.first().isVisible({ timeout: 5000 }).catch(() => false)
      expect(hasHeading).toBe(true)
    })

    test('Coupons page loads', async ({ page }) => {
      await page.goto('/dashboard/coupons', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      const heading = page.locator('h1, h2').filter({ hasText: /coupons/i })
      const hasHeading = await heading.first().isVisible({ timeout: 5000 }).catch(() => false)
      expect(hasHeading).toBe(true)
    })

    test('Reviews page loads', async ({ page }) => {
      await page.goto('/dashboard/reviews', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      const heading = page.locator('h1, h2').filter({ hasText: /reviews/i })
      const hasHeading = await heading.first().isVisible({ timeout: 5000 }).catch(() => false)
      expect(hasHeading).toBe(true)
    })

    test('Abandoned Carts page loads', async ({ page }) => {
      await page.goto('/dashboard/abandoned-carts', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      const heading = page.locator('h1, h2').filter({ hasText: /abandoned|cart/i })
      const hasHeading = await heading.first().isVisible({ timeout: 5000 }).catch(() => false)
      expect(hasHeading).toBe(true)
    })
  })

  // ============================================
  // SETTINGS PAGES
  // ============================================

  test.describe('Settings Pages', () => {
    test('Settings page loads', async ({ page }) => {
      await page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      // Should have store name input or settings form
      const hasForm = await page
        .locator('form, input, textarea')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasForm).toBe(true)
    })

    test('Payment settings loads', async ({ page }) => {
      await page.goto('/dashboard/settings/payments', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      // Should mention Razorpay or Stripe
      const hasPaymentProvider = await page
        .locator('text=/razorpay/i, text=/stripe/i, text=/payment/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasPaymentProvider).toBe(true)
    })

    test('Notification settings loads', async ({ page }) => {
      await page.goto('/dashboard/settings/notifications', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      // Should have email or WhatsApp section
      const hasNotificationSection = await page
        .locator('text=/email/i, text=/whatsapp/i, text=/notification/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasNotificationSection).toBe(true)
    })

    test('Shipping settings loads', async ({ page }) => {
      await page.goto('/dashboard/settings/shipping-providers', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      // Should have provider configuration content
      const hasShippingContent = await page
        .locator('text=/shipping/i, text=/provider/i, text=/shiprocket/i, text=/delhivery/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasShippingContent).toBe(true)
    })

    test('Security settings loads', async ({ page }) => {
      await page.goto('/dashboard/settings/security', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      // Should have 2FA or security section
      const hasSecurityContent = await page
        .locator('text=/2fa/i, text=/two-factor/i, text=/security/i, text=/password/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasSecurityContent).toBe(true)
    })

    test('Domain settings loads', async ({ page }) => {
      await page.goto('/dashboard/settings/domain', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      // Should have domain configuration
      const hasDomainContent = await page
        .locator('text=/domain/i, text=/subdomain/i, text=/custom domain/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasDomainContent).toBe(true)
    })

    test('Policies settings loads', async ({ page }) => {
      await page.goto('/dashboard/settings/policies', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      // Should have policy editor
      const hasPolicyContent = await page
        .locator('text=/polic/i, text=/privacy/i, text=/refund/i, text=/terms/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasPolicyContent).toBe(true)
    })

    test('Data settings loads', async ({ page }) => {
      await page.goto('/dashboard/settings/data', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      // Should have data management section
      const hasDataContent = await page
        .locator('text=/data/i, text=/export/i, text=/import/i, text=/backup/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasDataContent).toBe(true)
    })
  })

  // ============================================
  // MIGRATION
  // ============================================

  test.describe('Migration', () => {
    test('Migration page loads', async ({ page }) => {
      await page.goto('/dashboard/migrate', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(50)

      // Should show Shopify and/or Etsy migration options
      const hasMigrationOptions = await page
        .locator('text=/shopify/i, text=/etsy/i, text=/migrat/i, text=/import/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasMigrationOptions).toBe(true)
    })
  })

  // ============================================
  // INTERACTIVE ELEMENTS
  // ============================================

  test.describe('Interactive Elements', () => {
    test('Notification bell is clickable', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      // Find notification bell icon button
      const bellButton = page.locator(
        'button:has(svg[class*="bell"]), button[aria-label*="notification" i], button[aria-label*="bell" i], [class*="notification"] button'
      )
      const hasBell = await bellButton.first().isVisible({ timeout: 5000 }).catch(() => false)

      if (hasBell) {
        await bellButton.first().click()
        await page.waitForTimeout(1000)

        // A dropdown, panel, or popover should appear
        const hasDropdown = await page
          .locator('[role="menu"], [role="dialog"], [class*="dropdown"], [class*="popover"], [class*="notification"]')
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false)
        expect(hasDropdown).toBe(true)
      } else {
        // Bell may not be present in all layouts; pass if sidebar has notifications link
        const notifLink = page.locator('a, button').filter({ hasText: /notification/i })
        const hasNotifLink = await notifLink.first().isVisible({ timeout: 3000 }).catch(() => false)
        expect(hasNotifLink).toBe(true)
      }
    })

    test('User dropdown works', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      // Find user avatar or account button in top bar
      const userButton = page.locator(
        'button:has(img[alt*="avatar" i]), button:has(img[alt*="profile" i]), button[aria-label*="account" i], button[aria-label*="user" i], button[aria-label*="profile" i], [class*="avatar"] button, button:has([class*="avatar"])'
      )
      const hasUserBtn = await userButton.first().isVisible({ timeout: 5000 }).catch(() => false)

      if (hasUserBtn) {
        await userButton.first().click()
        await page.waitForTimeout(1000)

        // Dropdown should have sign-out option
        const hasSignOut = await page
          .locator('text=/sign out/i, text=/log out/i, text=/logout/i, text=/sign-out/i')
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false)
        expect(hasSignOut).toBe(true)
      } else {
        // Some layouts may have sign-out directly in sidebar
        const signOutInSidebar = page.locator('a, button').filter({ hasText: /sign out|log out/i })
        const hasSignOut = await signOutInSidebar.first().isVisible({ timeout: 3000 }).catch(() => false)
        expect(hasSignOut).toBe(true)
      }
    })

    test('Sidebar links navigate correctly', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      // Click "Products" link in sidebar
      const productsLink = page.locator('a').filter({ hasText: /^products$/i })
      const hasProductsLink = await productsLink
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasProductsLink).toBe(true)

      if (hasProductsLink) {
        await productsLink.first().click()
        await page.waitForURL(/\/dashboard\/products/, { timeout: 10000 }).catch(() => {})
        expect(page.url()).toContain('/dashboard/products')
      }
    })
  })

  // ============================================
  // CONSOLE ERROR CHECK
  // ============================================

  test.describe('Console Errors', () => {
    test('No console errors across dashboard pages', async ({ page }) => {
      const errors = collectConsoleErrors(page)

      const pagesToVisit = [
        '/dashboard',
        '/dashboard/products',
        '/dashboard/orders',
        '/dashboard/analytics',
        '/dashboard/settings',
      ]

      for (const pagePath of pagesToVisit) {
        await page.goto(pagePath, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2000)
      }

      // Filter out non-critical errors (network failures in test env are expected)
      const criticalErrors = errors.filter((error) => {
        const lowerError = error.toLowerCase()
        return (
          !lowerError.includes('failed to fetch') &&
          !lowerError.includes('networkerror') &&
          !lowerError.includes('net::err') &&
          !lowerError.includes('aborted') &&
          !lowerError.includes('cancelled') &&
          !lowerError.includes('cors') &&
          !lowerError.includes('404') &&
          !lowerError.includes('chunk')
        )
      })

      if (criticalErrors.length > 0) {
        console.log('Critical console errors found:', criticalErrors)
      }

      expect(
        criticalErrors.length,
        `Found ${criticalErrors.length} critical console error(s):\n${criticalErrors.join('\n')}`
      ).toBe(0)
    })
  })
})
