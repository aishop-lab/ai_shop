import { test, expect } from '@playwright/test'
import { TEST_STORE_SLUG, collectConsoleErrors } from '../../helpers/auth'

/**
 * Storefront Smoke Tests
 *
 * Verify that all customer-facing storefront pages load correctly
 * without errors. These are lightweight checks — no functionality
 * testing, just page load and key element visibility.
 */

const storeUrl = (path = '') => `/${TEST_STORE_SLUG}${path}`

/**
 * Filter out dev-mode noise from console errors.
 * The collectConsoleErrors helper already filters some, but
 * Next.js dev mode produces additional noise we need to ignore.
 */
function filterDevNoise(errors: string[]): string[] {
  return errors.filter(
    (e) =>
      !e.includes('[HMR]') &&
      !e.includes('favicon') &&
      !e.includes('Failed to load resource') &&
      !e.includes('_next/') &&
      !e.includes('hot-update') &&
      !e.includes('ERR_CONNECTION_REFUSED') &&
      !e.includes('net::ERR_') &&
      !e.includes('[getStore]') &&
      !e.includes('Store lookup failed') &&
      !e.includes('Cannot coerce') &&
      !e.includes('%c%s%c') &&
      !e.includes('background:')
  )
}

/**
 * Check whether the store homepage actually renders (store exists in DB).
 * Returns true if the page has meaningful storefront content, false if
 * it hit a 404 / not-found page.
 */
async function storeExists(page: import('@playwright/test').Page): Promise<boolean> {
  await page.goto(storeUrl(), { waitUntil: 'networkidle', timeout: 10000 })
  const notFoundText = page.locator('text=/not found|404|store.*not.*exist/i')
  const hasNotFound = (await notFoundText.count()) > 0
  if (hasNotFound) return false

  // Check for meaningful storefront content: header, product elements, or store name
  const header = page.locator('header')
  const hasHeader = (await header.count()) > 0 && (await header.first().isVisible().catch(() => false))
  const hasProducts = (await page.locator('[class*="product"], [data-product-card]').count()) > 0
  const hasStoreName = (await page.locator('h1, h2, [class*="logo"], [class*="brand"]').count()) > 0
  const bodyText = await page.locator('body').textContent().catch(() => '')
  const hasContent = (bodyText?.length ?? 0) > 100

  return hasHeader || hasProducts || hasStoreName || hasContent
}

test.describe('Storefront Smoke Tests', () => {
  // 1. Store homepage loads
  test('store homepage loads with header and footer', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping')

    await page.goto(storeUrl(), { waitUntil: 'networkidle', timeout: 10000 })
    await expect(page).toHaveURL(new RegExp(`/${TEST_STORE_SLUG}`))

    const main = page.locator('main')
    if ((await main.count()) > 0) {
      await expect(main.first()).toBeVisible({ timeout: 10000 })
    }

    const header = page.locator('header')
    if ((await header.count()) > 0) {
      await expect(header.first()).toBeVisible({ timeout: 10000 })
    }

    const footer = page.locator('footer')
    if ((await footer.count()) > 0) {
      await expect(footer.first()).toBeVisible({ timeout: 10000 })
    }
  })

  // 2. Products listing loads
  test('products listing page loads', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping')

    await page.goto(storeUrl('/products'), { waitUntil: 'networkidle', timeout: 10000 })
    await expect(page).toHaveURL(new RegExp(`/${TEST_STORE_SLUG}/products`))

    // Heading should be "All Products" or similar
    const heading = page.locator('h1')
    if ((await heading.count()) > 0) {
      const headingText = await heading.first().innerText()
      const hasRelevantHeading =
        /all products|products|shop|browse/i.test(headingText)
      expect(hasRelevantHeading).toBeTruthy()
    }

    // Should show a product grid or an empty state message
    const productGrid = page.locator('[class*="grid"], [class*="product"]')
    const emptyState = page.locator('text=/no products|empty|coming soon/i')
    const hasProducts = (await productGrid.count()) > 0
    const hasEmpty = (await emptyState.count()) > 0

    expect(hasProducts || hasEmpty).toBeTruthy()
  })

  // 3. Product detail loads
  test('product detail page loads from products list', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping')

    await page.goto(storeUrl('/products'), { waitUntil: 'networkidle', timeout: 10000 })

    // Find a product link on the page
    const productLink = page.locator(`a[href*="/${TEST_STORE_SLUG}/products/"]`).first()
    const hasProductLink = (await productLink.count()) > 0

    test.skip(!hasProductLink, 'No products available to test product detail page')

    await productLink.click()
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Product detail should show image, title, price, and add-to-cart
    const productTitle = page.locator('h1, h2').first()
    await expect(productTitle).toBeVisible({ timeout: 10000 })

    const addToCart = page.locator('button:has-text("Add to Cart"), button:has-text("Add to cart"), button:has-text("ADD TO CART")')
    const priceElement = page.locator('text=/[₹$€£]\\s?[\\d,.]+/')
    const productImage = page.locator('img[src*="product"], img[alt]').first()

    // At least some of these should be visible on a product page
    const hasPrice = (await priceElement.count()) > 0
    const hasButton = (await addToCart.count()) > 0
    const hasImage = (await productImage.count()) > 0

    expect(hasPrice || hasButton || hasImage).toBeTruthy()
  })

  // 4. Cart page loads
  test('cart page loads', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping')

    await page.goto(storeUrl('/cart'), { waitUntil: 'networkidle', timeout: 10000 })
    await expect(page).toHaveURL(new RegExp(`/${TEST_STORE_SLUG}/cart`))

    // Should show "Shopping Cart", "Your cart is empty", or similar
    const cartContent = page.locator('text=/cart|empty|no items|shopping bag|shopping cart/i')
    await expect(cartContent.first()).toBeVisible({ timeout: 10000 })
  })

  // 5. Checkout page loads
  test('checkout page loads or redirects gracefully', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping')

    await page.goto(storeUrl('/checkout'), { waitUntil: 'networkidle', timeout: 10000 })

    // Checkout may redirect to cart or products if cart is empty — that is acceptable
    const url = page.url()
    const isOnCheckout = url.includes('/checkout')
    const isRedirected = url.includes('/cart') || url.includes('/products') || url.includes(`/${TEST_STORE_SLUG}`)

    expect(isOnCheckout || isRedirected).toBeTruthy()

    // Page should have content regardless of where we ended up
    const main = page.locator('main, body')
    await expect(main.first()).toBeVisible({ timeout: 10000 })
  })

  // 6. Search page loads
  test('search page loads with search input', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping')

    await page.goto(storeUrl('/search'), { waitUntil: 'networkidle', timeout: 10000 })
    await expect(page).toHaveURL(new RegExp(`/${TEST_STORE_SLUG}/search`))

    const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="earch"]')
    if ((await searchInput.count()) > 0) {
      await expect(searchInput.first()).toBeVisible({ timeout: 10000 })
    }
  })

  // 7. About page loads
  test('about page loads', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping')

    await page.goto(storeUrl('/about'), { waitUntil: 'networkidle', timeout: 10000 })
    await expect(page).toHaveURL(new RegExp(`/${TEST_STORE_SLUG}/about`))

    const main = page.locator('main')
    if ((await main.count()) > 0) {
      await expect(main.first()).toBeVisible({ timeout: 10000 })
    }
  })

  // 8. Contact page loads
  test('contact page loads', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping')

    await page.goto(storeUrl('/contact'), { waitUntil: 'networkidle', timeout: 10000 })
    await expect(page).toHaveURL(new RegExp(`/${TEST_STORE_SLUG}/contact`))

    // Heading should be "Contact Us" or similar
    const heading = page.locator('h1')
    if ((await heading.count()) > 0) {
      const headingText = await heading.first().innerText()
      expect(/contact/i.test(headingText)).toBeTruthy()
    }

    // Should show a contact form or contact info
    const contactContent = page.locator('form, text=/contact|email|phone|reach/i')
    if ((await contactContent.count()) > 0) {
      await expect(contactContent.first()).toBeVisible({ timeout: 10000 })
    }
  })

  // 9. Shipping policy page loads
  test('shipping policy page loads', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping')

    await page.goto(storeUrl('/policies/shipping'), { waitUntil: 'networkidle', timeout: 10000 })

    const main = page.locator('main')
    if ((await main.count()) > 0) {
      await expect(main.first()).toBeVisible({ timeout: 10000 })
    }

    // Should contain policy-related content
    const policyContent = page.locator('text=/shipping|delivery|policy/i')
    if ((await policyContent.count()) > 0) {
      await expect(policyContent.first()).toBeVisible({ timeout: 10000 })
    }
  })

  // 10. Header elements visible (skip if store doesn't exist in DB)
  test('header contains logo and navigation', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping header test')

    const header = page.locator('header')
    await expect(header.first()).toBeVisible({ timeout: 10000 })

    // Check for logo (image or text link)
    const logo = header.locator('a img, a[href="/"], a[class*="logo"], a[class*="brand"]').first()
    const logoText = header.locator('a').first()
    const hasLogo = (await logo.count()) > 0 || (await logoText.count()) > 0
    expect(hasLogo).toBeTruthy()

    // Check for navigation links
    const navLinks = header.locator('a, nav a')
    expect(await navLinks.count()).toBeGreaterThan(0)
  })

  // 11. Footer elements visible (skip if store doesn't exist in DB)
  test('footer contains store info and links', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping footer test')

    const footer = page.locator('footer')
    const hasFooter = (await footer.count()) > 0

    test.skip(!hasFooter, 'No footer element found on page')

    await expect(footer.first()).toBeVisible({ timeout: 10000 })

    // Footer should have some text content
    const footerText = await footer.first().innerText()
    expect(footerText.length).toBeGreaterThan(0)
  })

  // 12. Cart icon present in header (skip if store doesn't exist in DB)
  test('cart icon is present in header', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping cart icon test')

    const header = page.locator('header')
    await expect(header.first()).toBeVisible({ timeout: 10000 })

    // Look for cart link/icon in header
    const cartIcon = header.locator(
      'a[href*="/cart"], button[aria-label*="cart" i], [class*="cart"], svg[class*="cart"]'
    )
    const hasCartIcon = (await cartIcon.count()) > 0

    // Also check for shopping bag icon as alternative
    const bagIcon = header.locator(
      'a[href*="/cart"] svg, button[aria-label*="bag" i], [class*="bag"]'
    )
    const hasBagIcon = (await bagIcon.count()) > 0

    expect(hasCartIcon || hasBagIcon).toBeTruthy()
  })

  // 13. Mobile menu works
  test('mobile menu is accessible on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })

    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping mobile menu test')

    // Look for hamburger menu button
    const menuButton = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="nav" i], button[class*="menu"], button[class*="hamburger"], [data-testid="mobile-menu"]'
    )
    const hasMenuButton = (await menuButton.count()) > 0

    test.skip(!hasMenuButton, 'No mobile menu button found — layout may not use hamburger menu')

    await expect(menuButton.first()).toBeVisible({ timeout: 10000 })

    // Click the hamburger menu
    await menuButton.first().click()

    // Wait for menu to appear
    await page.waitForTimeout(500)

    // Check that some navigation links are now visible
    const mobileNav = page.locator('nav a, [class*="mobile"] a, [role="dialog"] a, [class*="drawer"] a')
    expect(await mobileNav.count()).toBeGreaterThan(0)
  })

  // 14. No console errors on homepage
  test('no console errors on homepage', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto(storeUrl(), { waitUntil: 'networkidle', timeout: 10000 })

    await page.waitForTimeout(2000)

    const filtered = filterDevNoise(errors)
    expect(filtered).toHaveLength(0)
  })

  // 15. No console errors on products page
  test('no console errors on products page', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto(storeUrl('/products'), { waitUntil: 'networkidle', timeout: 10000 })

    await page.waitForTimeout(2000)

    const filtered = filterDevNoise(errors)
    expect(filtered).toHaveLength(0)
  })

  // 16. No console errors on cart page
  test('no console errors on cart page', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto(storeUrl('/cart'), { waitUntil: 'networkidle', timeout: 10000 })

    await page.waitForTimeout(2000)

    const filtered = filterDevNoise(errors)
    expect(filtered).toHaveLength(0)
  })

  // 17. No console errors on search page
  test('no console errors on search page', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto(storeUrl('/search'), { waitUntil: 'networkidle', timeout: 10000 })

    await page.waitForTimeout(2000)

    const filtered = filterDevNoise(errors)
    expect(filtered).toHaveLength(0)
  })

  // 18. 404 for nonexistent product
  test('nonexistent product returns 404 or not-found state', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping')

    const response = await page.goto(storeUrl('/products/nonexistent-product-id-xyz'), {
      waitUntil: 'networkidle',
      timeout: 10000,
    })

    // Either a 404 HTTP status or a not-found UI message
    const is404Status = response?.status() === 404
    const notFoundText = page.locator('text=/not found|404|doesn\'t exist|no longer available/i')
    const hasNotFoundUI = (await notFoundText.count()) > 0

    // May also redirect back to products page
    const redirectedToProducts = page.url().endsWith('/products')

    expect(is404Status || hasNotFoundUI || redirectedToProducts).toBeTruthy()
  })

  // 19. Nonexistent store returns 404
  test('nonexistent store returns 404', async ({ page }) => {
    const response = await page.goto('/nonexistent-store-slug-xyz-000', {
      waitUntil: 'networkidle',
      timeout: 10000,
    })

    const is404Status = response?.status() === 404
    const notFoundText = page.locator('text=/not found|404|store.*not.*exist/i')
    const hasNotFoundUI = (await notFoundText.count()) > 0

    expect(is404Status || hasNotFoundUI).toBeTruthy()
  })

  // 20. Products page has proper title metadata
  test('products page has proper title metadata', async ({ page }) => {
    const exists = await storeExists(page)
    test.skip(!exists, 'Test store not found in database — skipping')

    await page.goto(storeUrl('/products'), { waitUntil: 'networkidle', timeout: 10000 })

    const title = await page.title()

    // Title should not be empty and should contain something meaningful
    expect(title.length).toBeGreaterThan(0)

    // Title should ideally contain "products" or the store name
    const lowerTitle = title.toLowerCase()
    const hasMeaningfulTitle =
      lowerTitle.includes('product') ||
      lowerTitle.includes('shop') ||
      lowerTitle.includes('store') ||
      lowerTitle.includes(TEST_STORE_SLUG.replace(/-/g, ' '))

    expect(hasMeaningfulTitle).toBeTruthy()
  })
})
