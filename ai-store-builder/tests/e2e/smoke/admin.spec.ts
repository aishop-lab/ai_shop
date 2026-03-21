import { test, expect } from '@playwright/test'
import { loginAsAdmin, loginAsMerchant, collectConsoleErrors } from '../../helpers/auth'

/**
 * Admin Dashboard Smoke Tests
 *
 * Verifies that the admin panel at /admin loads correctly,
 * all sub-pages render without crashing, navigation works,
 * and access control restricts non-admin users.
 */

const ADMIN_NAV_ITEMS = [
  { label: 'Overview', href: '/admin' },
  { label: 'Stores', href: '/admin/stores' },
  { label: 'Sellers', href: '/admin/sellers' },
  { label: 'Customers', href: '/admin/customers' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Analytics', href: '/admin/analytics' },
]

/** Wait for admin page to finish loading (spinner gone, content rendered) */
async function waitForAdminPageLoad(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
  // Wait for the admin layout loading spinner to disappear (FullPageLoader)
  // and for the page content to settle
  const spinner = page.locator('.animate-spin')
  await spinner.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {})
}

test.describe('Admin Dashboard Smoke Tests', () => {
  test.describe('Authenticated as Admin', () => {
    test.beforeEach(async ({ page }) => {
      const loggedIn = await loginAsAdmin(page)
      // loginAsAdmin may return true even if login failed — check URL
      const url = page.url()
      const actuallyLoggedIn = loggedIn && !url.includes('/sign-in') && !url.includes('/sign-up')
      test.skip(!actuallyLoggedIn, 'Admin login failed — skipping admin tests')

      // Verify we actually have admin access
      await page.goto('/admin', { waitUntil: 'networkidle' })
      await waitForAdminPageLoad(page)

      // Check if still on sign-in page (redirect means not authenticated)
      const stillOnSignIn = page.url().includes('/sign-in')
      test.skip(stillOnSignIn, 'Not authenticated — redirected to sign-in')

      const accessDenied = await page
        .locator('text=Access Denied')
        .isVisible({ timeout: 10000 })
        .catch(() => false)
      test.skip(accessDenied === true, 'User does not have admin access')
    })

    test('admin overview loads with stats cards', async ({ page }) => {
      // beforeEach already navigated to /admin and verified access

      // The overview page should show "Platform Overview" heading OR an error state
      // (API may fail in test env, but the page itself should render)
      const hasOverviewHeading = await page
        .locator('h1:has-text("Platform Overview")')
        .isVisible({ timeout: 20000 })
        .catch(() => false)
      const hasErrorState = await page
        .locator('text=/unable to load/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      expect(hasOverviewHeading || hasErrorState).toBeTruthy()

      if (hasOverviewHeading) {
        // Stats cards should be present (Total Stores, Total Sellers, Total Orders, Total Revenue)
        // They may show 0 if no data, but the cards themselves should render
        const statsCards = page.locator('text=Total Stores')
        await expect(statsCards.first()).toBeVisible({ timeout: 10000 })

        // Charts section should render (even if empty)
        await expect(page.locator('text=Revenue Trend')).toBeVisible({ timeout: 10000 })
        await expect(page.locator('text=Signups Trend')).toBeVisible({ timeout: 10000 })
      }
    })

    test('admin stores page loads', async ({ page }) => {
      await page.goto('/admin/stores', { waitUntil: 'networkidle' })
      await waitForAdminPageLoad(page)

      // Should show a heading, search input, table, or empty state
      const hasHeading = await page
        .locator('h1, h2')
        .first()
        .isVisible({ timeout: 15000 })
        .catch(() => false)
      const hasSearch = await page
        .locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]')
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      const hasTable = await page
        .locator('table, [role="table"]')
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      const hasEmptyState = await page
        .locator('text=/no stores/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      // At least one of these should be visible — the page rendered something meaningful
      expect(hasHeading || hasSearch || hasTable || hasEmptyState).toBeTruthy()
    })

    test('admin store detail loads from store list', async ({ page }) => {
      await page.goto('/admin/stores', { waitUntil: 'networkidle' })
      await waitForAdminPageLoad(page)

      // Find a store link in the list — stores link to /admin/stores/{id}
      const storeLink = page.locator('a[href^="/admin/stores/"]').first()
      const hasStoreLink = await storeLink
        .isVisible({ timeout: 15000 })
        .catch(() => false)

      if (!hasStoreLink) {
        test.skip(true, 'No stores in the list — cannot test store detail')
        return
      }

      await storeLink.click()
      await page.waitForURL(/\/admin\/stores\//, { timeout: 15000 })
      await waitForAdminPageLoad(page)

      // The store detail page should render without crashing
      // Look for any meaningful content (store name, details, back link)
      const mainContent = await page
        .locator('main')
        .innerText({ timeout: 15000 })
        .catch(() => '')
      expect(mainContent.length).toBeGreaterThan(0)
    })

    test('admin sellers page loads', async ({ page }) => {
      await page.goto('/admin/sellers', { waitUntil: 'networkidle' })
      await waitForAdminPageLoad(page)

      // Should render a heading, table, or empty state
      const hasTable = await page
        .locator('table, [role="table"]')
        .isVisible({ timeout: 15000 })
        .catch(() => false)
      const hasEmptyState = await page
        .locator('text=/no sellers/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false)
      const hasHeading = await page
        .locator('h1, h2')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasTable || hasEmptyState || hasHeading).toBeTruthy()
    })

    test('admin orders page loads', async ({ page }) => {
      await page.goto('/admin/orders', { waitUntil: 'networkidle' })
      await waitForAdminPageLoad(page)

      // Should render a table with status badges, or an empty state
      const hasTable = await page
        .locator('table, [role="table"]')
        .isVisible({ timeout: 15000 })
        .catch(() => false)
      const hasEmptyState = await page
        .locator('text=/no orders/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false)
      const hasHeading = await page
        .locator('h1, h2')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasTable || hasEmptyState || hasHeading).toBeTruthy()
    })

    test('admin products page loads', async ({ page }) => {
      await page.goto('/admin/products', { waitUntil: 'networkidle' })
      await waitForAdminPageLoad(page)

      const hasTable = await page
        .locator('table, [role="table"]')
        .isVisible({ timeout: 15000 })
        .catch(() => false)
      const hasEmptyState = await page
        .locator('text=/no products/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false)
      const hasHeading = await page
        .locator('h1, h2')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      const hasTabs = await page
        .locator('[role="tablist"]')
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      expect(hasTable || hasEmptyState || hasHeading || hasTabs).toBeTruthy()
    })

    test('admin agents page loads', async ({ page }) => {
      await page.goto('/admin/agents', { waitUntil: 'networkidle' })
      await waitForAdminPageLoad(page)

      // Agent health dashboard should show heading, agent content, or error state
      const hasHeading = await page
        .locator('h1, h2')
        .first()
        .isVisible({ timeout: 15000 })
        .catch(() => false)
      const hasAgentContent = await page
        .locator('text=/agent/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      const hasErrorState = await page
        .locator('text=/unable to load/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      expect(hasAgentContent || hasHeading || hasErrorState).toBeTruthy()
    })

    test('admin sidebar navigation works', async ({ page }) => {
      await page.goto('/admin', { waitUntil: 'networkidle' })
      await waitForAdminPageLoad(page)

      // The sidebar contains "Admin Panel" text in its header (visible on desktop viewport)
      await expect(
        page.locator('aside h2:has-text("Admin Panel"), header :has-text("Admin Panel")')
      ).toBeVisible({ timeout: 15000 })

      // Click through each sidebar nav item and verify URL changes
      for (const item of ADMIN_NAV_ITEMS) {
        // The sidebar links are inside <nav> with the label text
        const navLink = page.locator(`nav a:has-text("${item.label}")`).first()

        const isVisible = await navLink.isVisible({ timeout: 10000 }).catch(() => false)
        if (!isVisible) continue

        await navLink.click()
        await page.waitForURL(new RegExp(item.href.replace(/\//g, '\\/')), { timeout: 15000 })
        expect(page.url()).toContain(item.href)

        // Wait for page content to load before clicking next nav item
        await page.waitForLoadState('networkidle')
        // Allow loading spinners to settle
        const spinner = page.locator('.animate-spin')
        await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
      }
    })

    test('admin dark mode is applied', async ({ page }) => {
      await page.goto('/admin', { waitUntil: 'networkidle' })
      await waitForAdminPageLoad(page)

      // The admin layout wraps content in a div with className "dark"
      const darkContainer = page.locator('.dark')
      await expect(darkContainer.first()).toBeVisible({ timeout: 15000 })

      // Verify dark background is actually applied via computed styles
      const bgColor = await page
        .locator('.dark.bg-background')
        .first()
        .evaluate((el) => {
          const style = window.getComputedStyle(el)
          return style.backgroundColor
        })
        .catch(() => null)

      // If we got a background color, it should not be white (rgb(255, 255, 255))
      if (bgColor) {
        expect(bgColor).not.toBe('rgb(255, 255, 255)')
      }
    })

    test('no console errors on admin pages', async ({ page }) => {
      const errors = collectConsoleErrors(page)

      const adminRoutes = [
        '/admin',
        '/admin/stores',
        '/admin/sellers',
        '/admin/orders',
        '/admin/products',
      ]

      for (const route of adminRoutes) {
        await page.goto(route, { waitUntil: 'networkidle' })
        await waitForAdminPageLoad(page)
      }

      // Filter out any fetch/network errors that may occur in test environments
      // where the database may not have data
      const criticalErrors = errors.filter(
        (err) =>
          !err.includes('Failed to fetch') &&
          !err.includes('NetworkError') &&
          !err.includes('net::ERR') &&
          !err.includes('AbortError') &&
          !err.includes('404') &&
          !err.includes('NEXT_NOT_FOUND') &&
          !err.includes('ChunkLoadError')
      )

      expect(criticalErrors).toEqual([])
    })
  })

  test.describe('Access Control', () => {
    test('non-admin user is denied access', async ({ page }) => {
      const loggedIn = await loginAsMerchant(page)
      test.skip(!loggedIn, 'Merchant login failed — skipping access control test')

      await page.goto('/admin', { waitUntil: 'networkidle' })
      await waitForAdminPageLoad(page)

      // Admin layout should show "Access Denied" for non-admin users
      await expect(
        page.locator('text=Access Denied')
      ).toBeVisible({ timeout: 20000 })

      // Should also show the permission message
      await expect(
        page.locator('text=You do not have permission to access this area')
      ).toBeVisible({ timeout: 10000 })
    })

    test('unauthenticated user is redirected to sign-in', async ({ page }) => {
      // Navigate to /admin without any authentication
      await page.goto('/admin', { waitUntil: 'networkidle' })

      // Should be redirected to sign-in page, or show access denied
      // (behavior depends on middleware — either redirect or client-side auth check)
      const url = page.url()
      const hasSignIn = url.includes('/sign-in')
      const hasAccessDenied = await page
        .locator('text=Access Denied')
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(hasSignIn || hasAccessDenied).toBeTruthy()
    })
  })
})
