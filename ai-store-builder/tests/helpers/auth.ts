import { type Page, type BrowserContext } from '@playwright/test'

/**
 * Test authentication helpers.
 * Uses Supabase auth API to programmatically log in test users.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const TEST_MERCHANT = {
  email: process.env.PLAYWRIGHT_MERCHANT_EMAIL || 'test-merchant@storeforge.site',
  password: process.env.PLAYWRIGHT_MERCHANT_PASSWORD || 'TestPassword123!',
}

export const TEST_ADMIN = {
  email: process.env.PLAYWRIGHT_ADMIN_EMAIL || 'aishop@middlefieldbrands.com',
  password: process.env.PLAYWRIGHT_ADMIN_PASSWORD || 'AdminPassword123!',
}

export const TEST_CUSTOMER = {
  email: process.env.PLAYWRIGHT_CUSTOMER_EMAIL || 'test-customer@example.com',
  password: process.env.PLAYWRIGHT_CUSTOMER_PASSWORD || 'CustomerPass123!',
}

export const TEST_STORE_SLUG = process.env.PLAYWRIGHT_TEST_STORE_SLUG || 'demo-store'

/**
 * Sign in as merchant via the sign-in page.
 * Sets auth cookies for subsequent navigation.
 */
export async function loginAsMerchant(page: Page): Promise<boolean> {
  try {
    await page.goto('/sign-in', { waitUntil: 'networkidle' })

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')

    if (!(await emailInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      return false
    }

    await emailInput.fill(TEST_MERCHANT.email)
    await passwordInput.fill(TEST_MERCHANT.password)

    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    // Wait for redirect to dashboard or platform
    await page.waitForURL(/\/(dashboard|platform|onboarding)/, { timeout: 15000 }).catch(() => {})

    return page.url().includes('/dashboard') || page.url().includes('/platform') || page.url().includes('/onboarding')
  } catch {
    return false
  }
}

/**
 * Sign in as admin user.
 */
export async function loginAsAdmin(page: Page): Promise<boolean> {
  try {
    await page.goto('/sign-in', { waitUntil: 'networkidle' })

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')

    if (!(await emailInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      return false
    }

    await emailInput.fill(TEST_ADMIN.email)
    await passwordInput.fill(TEST_ADMIN.password)

    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    await page.waitForURL(/\/(dashboard|admin|onboarding)/, { timeout: 15000 }).catch(() => {})

    return true
  } catch {
    return false
  }
}

/**
 * Get an auth token for API tests via Supabase auth.
 */
export async function getAuthToken(email: string, password: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.access_token || null
  } catch {
    return null
  }
}

/**
 * Collect console errors from a page.
 * Returns an array of error messages.
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Ignore known non-critical errors
      if (
        text.includes('favicon.ico') ||
        text.includes('hydration') ||
        text.includes('Warning:') ||
        text.includes('DevTools') ||
        text.includes('Download the React DevTools')
      ) {
        return
      }
      errors.push(text)
    }
  })
  return errors
}
