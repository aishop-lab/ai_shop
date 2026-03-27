import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for StoreForge E2E Tests
 *
 * Run tests with: npx playwright test
 * Run with UI: npx playwright test --ui
 * Run specific file: npx playwright test tests/checkout.spec.ts
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Default: run all e2e tests
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Smoke tests only (Phase I)
    {
      name: 'smoke',
      testDir: './tests/e2e/smoke',
      use: { ...devices['Desktop Chrome'] },
    },
    // Journey tests only (Phase II)
    {
      name: 'journeys',
      testDir: './tests/e2e/journeys',
      use: { ...devices['Desktop Chrome'] },
    },
    // API tests only (Phase III)
    {
      name: 'api',
      testDir: './tests/api',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile responsive tests
    {
      name: 'mobile',
      testDir: './tests/e2e/smoke',
      testMatch: 'responsive.spec.ts',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Run local dev server before tests (optional)
  // Uncomment if you want Playwright to start the server
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
})
