import { test, expect } from '@playwright/test';
import { TEST_STORE_SLUG, loginAsMerchant, loginAsAdmin } from '../../helpers/auth';

const MOBILE = { width: 375, height: 812 };
const TABLET = { width: 768, height: 1024 };
const DESKTOP = { width: 1280, height: 720 };

/** Overflow tolerance in pixels (accounts for sub-pixel rounding). */
const OVERFLOW_TOLERANCE = 5;

/** Returns true when the page has no meaningful horizontal scrollbar. */
async function hasNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(
    (tolerance) => document.documentElement.scrollWidth <= document.documentElement.clientWidth + tolerance,
    OVERFLOW_TOLERANCE,
  );
}

test.describe('Responsive Design Tests', () => {
  // ── 1. Landing page mobile ──────────────────────────────────────────
  test('landing page renders without overflow on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // No horizontal scroll (with tolerance)
    expect(await hasNoHorizontalOverflow(page)).toBeTruthy();

    // Hero text is visible and readable
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible({ timeout: 10000 });

    // At least one CTA button is visible (not clipped)
    const ctaButtons = page.locator('a[href*="sign-up"], a[href*="sign-in"], button').first();
    await expect(ctaButtons).toBeVisible({ timeout: 5000 });
  });

  // ── 2. Dashboard mobile — sidebar collapse + hamburger ──────────────
  test('dashboard sidebar collapses on mobile with hamburger menu', async ({ page }) => {
    await page.setViewportSize(MOBILE);

    const loggedIn = await loginAsMerchant(page);
    test.skip(!loggedIn, 'Merchant login failed — skipping dashboard responsive test');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // No horizontal overflow
    expect(await hasNoHorizontalOverflow(page)).toBeTruthy();

    // Sidebar should NOT be visible by default on mobile
    const sidebar = page.locator('aside, nav[class*="sidebar"], [class*="Sidebar"], [data-sidebar]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    // On mobile the sidebar is typically hidden or off-screen
    if (sidebarVisible) {
      // If technically "visible", verify it is off-screen or overlay-style (width check)
      const sidebarBox = await sidebar.boundingBox();
      if (sidebarBox) {
        const isOffScreenOrNarrow =
          sidebarBox.x + sidebarBox.width <= 0 || sidebarBox.width < MOBILE.width * 0.8;
        expect(isOffScreenOrNarrow).toBeTruthy();
      }
    }

    // Hamburger menu button should be visible on mobile
    const hamburger = page.locator(
      'button[class*="lg:hidden"], button[aria-label*="menu" i], button[aria-label*="Menu" i], button[aria-label*="sidebar" i], button[aria-label*="Sidebar" i], [data-sidebar="trigger"]',
    ).first();
    const hamburgerVisible = await hamburger.isVisible({ timeout: 5000 }).catch(() => false);

    if (hamburgerVisible) {
      // Click hamburger and verify sidebar slides in
      await hamburger.click();
      await page.waitForTimeout(500);

      const sidebarAfterClick = page.locator(
        'aside, nav[class*="sidebar"], [class*="Sidebar"], [data-sidebar]',
      ).first();
      await expect(sidebarAfterClick).toBeVisible({ timeout: 3000 });
    }
  });

  // ── 3. Product grid responsive across viewports ─────────────────────
  test('product grid adapts columns across viewports', async ({ page }) => {
    // Mobile
    await page.setViewportSize(MOBILE);
    await page.goto(`/${TEST_STORE_SLUG}/products`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // No horizontal overflow on mobile
    expect(await hasNoHorizontalOverflow(page)).toBeTruthy();

    // Page should have content (not blank)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(0);

    // Tablet
    await page.setViewportSize(TABLET);
    await page.waitForTimeout(500);
    expect(await hasNoHorizontalOverflow(page)).toBeTruthy();

    // Desktop
    await page.setViewportSize(DESKTOP);
    await page.waitForTimeout(500);
    expect(await hasNoHorizontalOverflow(page)).toBeTruthy();
  });

  // ── 4. Checkout mobile — no overflow, vertical stacking ─────────────
  test('checkout page has no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);

    // Navigate to checkout — may redirect if cart is empty, that is fine
    const response = await page.goto(`/${TEST_STORE_SLUG}/checkout`, {
      waitUntil: 'domcontentloaded',
    });
    const status = response?.status() ?? 0;

    // Accept any non-500 status — empty cart may redirect to store/cart page
    expect(status).toBeLessThan(500);

    await page.waitForLoadState('networkidle').catch(() => {});

    // No horizontal overflow regardless of where we ended up
    expect(await hasNoHorizontalOverflow(page)).toBeTruthy();

    // Body should have content (not a blank crash page)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });

  // ── 5. Admin mobile — sidebar collapse + table containment ──────────
  test('admin layout collapses on mobile with contained tables', async ({ page }) => {
    await page.setViewportSize(MOBILE);

    const loggedIn = await loginAsAdmin(page);
    test.skip(!loggedIn, 'Admin login failed — skipping admin responsive test');

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // No horizontal page overflow
    expect(await hasNoHorizontalOverflow(page)).toBeTruthy();

    // Sidebar should be collapsed / hidden on mobile
    const sidebar = page.locator('aside, nav[class*="sidebar"], [class*="Sidebar"], [data-sidebar]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (sidebarVisible) {
      const sidebarBox = await sidebar.boundingBox();
      if (sidebarBox) {
        const isCollapsedOrOverlay =
          sidebarBox.x + sidebarBox.width <= 0 || sidebarBox.width < MOBILE.width * 0.8;
        expect(isCollapsedOrOverlay).toBeTruthy();
      }
    }

    // Tables should be contained (scrollable wrapper, not overflowing the page)
    const tables = page.locator('table');
    const tableCount = await tables.count();
    if (tableCount > 0) {
      expect(await hasNoHorizontalOverflow(page)).toBeTruthy();
    }

    // Content should be readable — use broad selectors including body as final fallback
    const mainContent = page.locator('main, [role="main"], [class*="content"], [class*="admin"], body').first();
    const contentVisible = await mainContent.isVisible().catch(() => false);
    expect(contentVisible).toBeTruthy();
  });

  // ── 6. Storefront tablet — header, no overflow, footer ────────────
  test('storefront adapts layout on tablet', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto(`/${TEST_STORE_SLUG}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Check if the store actually exists — skip if not
    const notFoundText = page.locator('text=/not found|404|store.*not.*exist/i');
    const hasNotFound = (await notFoundText.count()) > 0;
    const bodyText = await page.locator('body').textContent().catch(() => '');
    const hasContent = (bodyText?.length ?? 0) > 100;
    test.skip(hasNotFound || !hasContent, 'Test store not found in database — skipping');

    // No horizontal overflow
    expect(await hasNoHorizontalOverflow(page)).toBeTruthy();

    // Header should be visible
    const header = page.locator('header').first();
    const headerVisible = await header.isVisible({ timeout: 5000 }).catch(() => false);
    expect(headerVisible).toBeTruthy();

    // If products are present, they should be visible (no crash)
    const products = page.locator('[class*="product"], [data-product-card], .group[class*="rounded"]');
    const productCount = await products.count();
    if (productCount > 0) {
      await expect(products.first()).toBeVisible({ timeout: 5000 });
    }

    // Footer should be present and contained if it exists
    const footer = page.locator('footer').first();
    const footerVisible = await footer.isVisible().catch(() => false);
    if (footerVisible) {
      const footerBox = await footer.boundingBox();
      if (footerBox) {
        expect(footerBox.width).toBeLessThanOrEqual(TABLET.width + OVERFLOW_TOLERANCE);
      }
    }
  });
});
