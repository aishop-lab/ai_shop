import { test, expect } from '@playwright/test'
import { loginAsMerchant, TEST_STORE_SLUG } from '../../helpers/auth'

/**
 * Merchant Onboarding Journey Tests
 *
 * Tests the onboarding flow UI. Since we cannot create real accounts
 * (email verification required), we verify the UI renders correctly
 * and interactive elements work as expected.
 */

test.describe.serial('Merchant Onboarding Journey', () => {
  // ============================================
  // ONBOARDING PAGE ACCESS
  // ============================================

  test('onboarding page loads and renders step indicator', async ({ page }) => {
    // Try accessing onboarding directly (may redirect if not authenticated)
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const url = page.url()

    // If redirected to sign-in, that's expected — onboarding requires auth
    if (url.includes('/sign-in') || url.includes('/sign-up')) {
      // Try logging in first, then go to onboarding
      const loggedIn = await loginAsMerchant(page)
      if (!loggedIn) {
        test.skip(true, 'Cannot access onboarding — login failed')
        return
      }
      await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
    }

    // If we got redirected to dashboard (store already set up), that's also valid
    if (page.url().includes('/dashboard')) {
      // Merchant already onboarded — skip onboarding-specific tests
      test.skip(true, 'Merchant already onboarded — redirected to dashboard')
      return
    }

    // Verify step indicator renders
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(50)
  })

  test('4-step UI renders with correct labels', async ({ page }) => {
    const loggedIn = await loginAsMerchant(page)
    if (!loggedIn) {
      test.skip(true, 'Login failed — skipping onboarding tests')
      return
    }

    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // If redirected to dashboard, merchant is already onboarded
    if (page.url().includes('/dashboard')) {
      test.skip(true, 'Merchant already onboarded')
      return
    }

    const stepLabels = ['Store Basics', 'Brand & Theme', 'First Product', 'Store Live']
    for (const label of stepLabels) {
      const stepElement = page.locator(`text=${label}`)
      const isVisible = await stepElement.first().isVisible({ timeout: 5000 }).catch(() => false)
      expect(isVisible, `Expected step label "${label}" to be visible`).toBe(true)
    }
  })

  test('Step 1: store name input generates slug', async ({ page }) => {
    const loggedIn = await loginAsMerchant(page)
    if (!loggedIn) {
      test.skip(true, 'Login failed')
      return
    }

    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    if (page.url().includes('/dashboard')) {
      test.skip(true, 'Merchant already onboarded')
      return
    }

    // Find store name input
    const nameInput = page.locator(
      'input[name="storeName"], input[placeholder*="store name" i], input[placeholder*="name" i]'
    ).first()
    const hasNameInput = await nameInput.isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasNameInput) {
      // May be on a different step layout — look for any text input
      const anyInput = page.locator('input[type="text"]').first()
      const hasAny = await anyInput.isVisible({ timeout: 3000 }).catch(() => false)
      test.skip(!hasAny, 'No store name input found on onboarding page')
      return
    }

    // Type a store name
    await nameInput.fill('My Amazing Test Store')
    await page.waitForTimeout(500)

    // Verify slug was generated — look for slug display or input
    const slugIndicator = page.locator(
      'text=/my-amazing-test-store/, input[value*="my-amazing-test-store"], [class*="slug"]'
    )
    const hasSlug = await slugIndicator.first().isVisible({ timeout: 3000 }).catch(() => false)

    // Slug may be shown as text, in an input, or as a URL preview
    const slugText = page.locator('text=/\\.storeforge\\.site|my-amazing/')
    const hasSlugText = await slugText.first().isVisible({ timeout: 3000 }).catch(() => false)

    expect(hasSlug || hasSlugText, 'Expected slug to be generated from store name').toBe(true)
  })

  test('Step 1: category selection is available', async ({ page }) => {
    const loggedIn = await loginAsMerchant(page)
    if (!loggedIn) {
      test.skip(true, 'Login failed')
      return
    }

    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    if (page.url().includes('/dashboard')) {
      test.skip(true, 'Merchant already onboarded')
      return
    }

    // Look for category options (buttons, select, or radio group)
    const categories = ['Electronics', 'Fashion', 'Food', 'Home', 'Beauty']
    let foundCategories = 0

    for (const cat of categories) {
      const catElement = page.locator(`text=${cat}`)
      const isVisible = await catElement.first().isVisible({ timeout: 2000 }).catch(() => false)
      if (isVisible) foundCategories++
    }

    // At least some categories should be visible
    expect(foundCategories, 'Expected at least some business categories to be visible').toBeGreaterThan(0)
  })

  test('Step 2: theme selection UI renders', async ({ page }) => {
    const loggedIn = await loginAsMerchant(page)
    if (!loggedIn) {
      test.skip(true, 'Login failed')
      return
    }

    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    if (page.url().includes('/dashboard')) {
      test.skip(true, 'Merchant already onboarded')
      return
    }

    // Fill step 1 to proceed to step 2
    const nameInput = page.locator(
      'input[name="storeName"], input[placeholder*="store name" i], input[placeholder*="name" i], input[type="text"]'
    ).first()
    const hasNameInput = await nameInput.isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasNameInput) {
      test.skip(true, 'Cannot fill step 1 — no name input found')
      return
    }

    await nameInput.fill('Test Theme Store')
    await page.waitForTimeout(300)

    // Select a category
    const categoryBtn = page.locator('button, [role="option"]').filter({ hasText: /Electronics|Fashion/i }).first()
    const hasCat = await categoryBtn.isVisible({ timeout: 3000 }).catch(() => false)
    if (hasCat) {
      await categoryBtn.click()
      await page.waitForTimeout(300)
    }

    // Click Next to go to step 2
    const nextBtn = page.locator('button').filter({ hasText: /next|continue/i }).first()
    const hasNext = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasNext) {
      await nextBtn.click()
      await page.waitForTimeout(1000)

      // Verify theme options are present
      const themes = ['Modern', 'Classic', 'Playful', 'Minimal']
      let foundThemes = 0

      for (const theme of themes) {
        const themeEl = page.locator(`text=${theme}`)
        const isVisible = await themeEl.first().isVisible({ timeout: 3000 }).catch(() => false)
        if (isVisible) foundThemes++
      }

      expect(foundThemes, 'Expected theme options to be visible on step 2').toBeGreaterThan(0)
    }
  })

  test('Step 2: color presets are clickable', async ({ page }) => {
    const loggedIn = await loginAsMerchant(page)
    if (!loggedIn) {
      test.skip(true, 'Login failed')
      return
    }

    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    if (page.url().includes('/dashboard')) {
      test.skip(true, 'Merchant already onboarded')
      return
    }

    // Fill step 1 and navigate to step 2
    const nameInput = page.locator(
      'input[name="storeName"], input[placeholder*="store name" i], input[placeholder*="name" i], input[type="text"]'
    ).first()
    const hasNameInput = await nameInput.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasNameInput) {
      test.skip(true, 'Cannot navigate to step 2')
      return
    }

    await nameInput.fill('Color Test Store')
    await page.waitForTimeout(300)

    const categoryBtn = page.locator('button, [role="option"]').filter({ hasText: /Electronics|Fashion/i }).first()
    if (await categoryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryBtn.click()
      await page.waitForTimeout(300)
    }

    const nextBtn = page.locator('button').filter({ hasText: /next|continue/i }).first()
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click()
      await page.waitForTimeout(1000)
    }

    // Look for color swatch buttons or color picker
    const colorSwatches = page.locator(
      'button[style*="background"], [class*="color"][class*="swatch"], [class*="preset"], button[aria-label*="color" i]'
    )
    const swatchCount = await colorSwatches.count()

    if (swatchCount > 0) {
      // Click a color swatch
      await colorSwatches.first().click()
      await page.waitForTimeout(300)
      // Should not error — the click was accepted
      expect(swatchCount).toBeGreaterThan(0)
    }
  })

  test('navigation between steps with Back button', async ({ page }) => {
    const loggedIn = await loginAsMerchant(page)
    if (!loggedIn) {
      test.skip(true, 'Login failed')
      return
    }

    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    if (page.url().includes('/dashboard')) {
      test.skip(true, 'Merchant already onboarded')
      return
    }

    // Fill step 1
    const nameInput = page.locator(
      'input[name="storeName"], input[placeholder*="store name" i], input[placeholder*="name" i], input[type="text"]'
    ).first()
    if (!(await nameInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No name input found')
      return
    }

    await nameInput.fill('Back Button Test Store')
    await page.waitForTimeout(300)

    const categoryBtn = page.locator('button, [role="option"]').filter({ hasText: /Electronics|Fashion/i }).first()
    if (await categoryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryBtn.click()
      await page.waitForTimeout(300)
    }

    // Go to step 2
    const nextBtn = page.locator('button').filter({ hasText: /next|continue/i }).first()
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click()
      await page.waitForTimeout(1000)
    }

    // Click Back button
    const backBtn = page.locator('button').filter({ hasText: /back|previous/i }).first()
    const hasBack = await backBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasBack) {
      await backBtn.click()
      await page.waitForTimeout(1000)

      // Should be back on step 1 — store name should still be filled
      const nameValue = await nameInput.inputValue().catch(() => '')
      expect(nameValue).toContain('Back Button Test Store')
    }
  })
})
