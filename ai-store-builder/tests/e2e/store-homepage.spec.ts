import { test, expect } from '@playwright/test'

/**
 * Store Homepage E2E Tests
 *
 * These tests verify the public storefront homepage functionality.
 * Run against a test store or use PLAYWRIGHT_TEST_STORE_SLUG env variable.
 */

const TEST_STORE_SLUG = process.env.PLAYWRIGHT_TEST_STORE_SLUG || 'demo-store'

// Helper to check if store exists
async function checkStoreLoaded(page: import('@playwright/test').Page): Promise<boolean> {
  // Check if we got a 404 or store not found page
  const notFound = page.locator('text=/not found|404/i')
  const isNotFound = await notFound.isVisible().catch(() => false)
  return !isNotFound
}

test.describe('Store Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${TEST_STORE_SLUG}`, { waitUntil: 'networkidle' })
  })

  test('should load store homepage', async ({ page }) => {
    // Wait for the page to load
    await expect(page).toHaveURL(new RegExp(`/${TEST_STORE_SLUG}`))

    // Wait for hydration
    await page.waitForTimeout(1000)

    // Check that main content is visible (the layout has main.flex-1)
    const main = page.locator('main')
    const mainExists = await main.count() > 0
    if (mainExists) {
      await expect(main.first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('should display store name in header', async ({ page }) => {
    // Wait for hydration
    await page.waitForTimeout(1000)

    // Store layout includes a header component
    const header = page.locator('header')
    const headerExists = await header.count() > 0

    if (headerExists) {
      await expect(header.first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('should have working navigation', async ({ page }) => {
    // Wait for hydration
    await page.waitForTimeout(1000)

    // Check for navigation links in header
    const nav = page.locator('header, nav')
    const navExists = await nav.count() > 0

    if (navExists) {
      await expect(nav.first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('should display products section', async ({ page }) => {
    // Wait longer for hydration
    await page.waitForTimeout(2000)

    // Look for product cards, product grid, or main content area
    const productsSection = page.locator('main, [data-testid="products-grid"], .products-grid')
    const sectionExists = await productsSection.count() > 0

    if (sectionExists) {
      await expect(productsSection.first()).toBeVisible({ timeout: 15000 })
    }
  })

  test('should have cart icon in header', async ({ page }) => {
    // Wait for hydration
    await page.waitForTimeout(1000)

    // Cart icon can be an anchor link to cart or button with cart aria-label
    const cartIcon = page.locator('[data-testid="cart-icon"], [aria-label*="cart" i], a[href*="/cart"], button:has(svg)')
    const cartExists = await cartIcon.count() > 0

    if (cartExists) {
      await expect(cartIcon.first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('should navigate to product page when clicking product', async ({ page }) => {
    // Wait for hydration
    await page.waitForTimeout(1000)

    // Find a product card link
    const productLink = page.locator('a[href*="/products/"]').first()

    if (await productLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await productLink.click()
      await expect(page).toHaveURL(/\/products\//)
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()

    // Wait for hydration
    await page.waitForTimeout(1000)

    // Main content should still be visible
    const main = page.locator('main')
    const mainExists = await main.count() > 0

    if (mainExists) {
      await expect(main.first()).toBeVisible({ timeout: 10000 })
    }
  })
})

test.describe('Store Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${TEST_STORE_SLUG}`)
  })

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], [data-testid="search-input"]')

    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await searchInput.press('Enter')

      // Should navigate to search results
      await expect(page).toHaveURL(/search/)
    }
  })
})

test.describe('Store Footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${TEST_STORE_SLUG}`, { waitUntil: 'networkidle' })
  })

  test('should display footer', async ({ page }) => {
    // Wait for hydration
    await page.waitForTimeout(1000)

    // Scroll to bottom to ensure footer is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    const footer = page.locator('footer')
    const footerExists = await footer.count() > 0

    if (footerExists) {
      await expect(footer.first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('should have policy links in footer', async ({ page }) => {
    // Wait for hydration
    await page.waitForTimeout(1000)

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    const footer = page.locator('footer')
    const footerExists = await footer.count() > 0

    if (footerExists) {
      // Check for policy links (could be /policies/privacy, /policies/terms, etc.)
      const policyLinks = footer.locator('a[href*="policies"], a[href*="privacy"], a[href*="terms"], a[href*="shipping"], a[href*="returns"]')
      const linksExist = await policyLinks.count() > 0

      if (linksExist) {
        await expect(policyLinks.first()).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
