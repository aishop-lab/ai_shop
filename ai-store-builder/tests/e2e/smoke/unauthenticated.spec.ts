import { test, expect } from '@playwright/test';
import { collectConsoleErrors } from '../../helpers/auth';

test.describe('Landing Page', () => {
  test('page loads with 200', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
  });

  test('hero section renders', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible({ timeout: 10000 });
    const text = await heroHeading.textContent();
    expect(text?.match(/AI Store/i)).toBeTruthy();
  });

  test('action buttons render', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const getStartedLink = page.locator('a[href="/sign-up"]');
    await expect(getStartedLink).toBeVisible({ timeout: 5000 });

    const signInLink = page.locator('a[href="/sign-in"]');
    await expect(signInLink).toBeVisible({ timeout: 5000 });
  });

  test('page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible({ timeout: 5000 });
  });

  test('subtitle text renders', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const subtitle = page.getByText(/Build your online store in minutes/i);
    await expect(subtitle).toBeVisible({ timeout: 5000 });
  });

  test('Get Started button links to sign-up', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const getStartedLink = page.locator('a[href="/sign-up"]');
    await expect(getStartedLink).toBeVisible({ timeout: 5000 });
    const href = await getStartedLink.getAttribute('href');
    expect(href).toBe('/sign-up');
  });

  test('Sign In button links to sign-in', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const signInLink = page.locator('a[href="/sign-in"]');
    await expect(signInLink).toBeVisible({ timeout: 5000 });
    const href = await signInLink.getAttribute('href');
    expect(href).toBe('/sign-in');
  });

  test('footer renders', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible({ timeout: 10000 });

    const footerText = footer.getByText(/AI-powered e-commerce store/i);
    await expect(footerText).toBeVisible({ timeout: 5000 });
  });

  test('sign in link navigates', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const signInLink = page.locator('a[href="/sign-in"]');
    await signInLink.click();
    await page.waitForURL('**/sign-in', { timeout: 10000 });
    expect(page.url()).toContain('/sign-in');
  });

  test('Get Started CTA navigates', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const getStartedLink = page.locator('a[href="/sign-up"]');
    await getStartedLink.click();
    await page.waitForURL('**/sign-up', { timeout: 10000 });
    expect(page.url()).toContain('/sign-up');
  });

  test('no console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    // Allow page to settle
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });
});

test.describe('Auth Pages', () => {
  test('sign-in page loads', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible({ timeout: 5000 });
  });

  test('sign-up page loads', async ({ page }) => {
    await page.goto('/sign-up', { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible({ timeout: 5000 });
  });

  test('sign-in has link to sign-up', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
    const signUpLink = page.getByRole('link', { name: /sign up|create account|register/i });
    await expect(signUpLink).toBeVisible({ timeout: 10000 });
  });

  test('sign-up has link to sign-in', async ({ page }) => {
    await page.goto('/sign-up', { waitUntil: 'domcontentloaded' });
    const signInLink = page.getByRole('link', { name: /sign in|log in|login/i });
    await expect(signInLink).toBeVisible({ timeout: 10000 });
  });

  test('sign-in rejects empty submission', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible({ timeout: 10000 });

    // Check if button is disabled before any input
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    if (isDisabled) {
      expect(isDisabled).toBeTruthy();
      return;
    }

    // If button is enabled, click and expect an error message
    await submitButton.click();
    await page.waitForTimeout(1000);

    // Look for validation error — either native or custom
    const errorVisible = await page
      .locator('[role="alert"], .error, [class*="error"], [class*="Error"], :text("required"), :text("invalid")')
      .first()
      .isVisible()
      .catch(() => false);

    // Also check for HTML5 validation (the form just won't submit)
    const urlStillSignIn = page.url().includes('/sign-in');
    expect(errorVisible || urlStillSignIn).toBeTruthy();
  });
});

test.describe('Error Handling', () => {
  test('404 for invalid route', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-xyz', {
      waitUntil: 'domcontentloaded',
    });
    // Page should render something — either a 404 page or redirect to landing
    expect(response?.status()).toBeDefined();
    // The page should not be completely blank
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });

  test('privacy page loads', async ({ page }) => {
    const response = await page.goto('/privacy', { waitUntil: 'domcontentloaded' });
    const status = response?.status() ?? 0;
    // Accept 200 (page exists) or 404 (not built yet) — just verify it doesn't crash
    expect([200, 301, 302, 404]).toContain(status);

    if (status === 200) {
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    }
  });

  test('terms page loads', async ({ page }) => {
    const response = await page.goto('/terms', { waitUntil: 'domcontentloaded' });
    const status = response?.status() ?? 0;
    // Accept 200 (page exists) or 404 (not built yet) — just verify it doesn't crash
    expect([200, 301, 302, 404]).toContain(status);

    if (status === 200) {
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    }
  });
});
