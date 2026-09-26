import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E config. Run with `npm run test:e2e`.
 *
 * Spins up the production build (`npm run build && npm run start`) before
 * tests run, then tears it down. Single chromium project keeps CI fast;
 * the tests are smoke-grade and don't need cross-browser coverage to be
 * useful. If you ever want Firefox / WebKit too, add projects to the array.
 *
 * `npx playwright install chromium` is a one-time setup step in any
 * environment (CI or local) that hasn't run Playwright before.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  // @visual tests compare against screenshots captured on a developer machine
  // (font rasterisation differs per OS), so they are a local R1 gate only.
  grepInvert: process.env.CI ? /@visual/ : undefined,

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Start a production server before tests, tear down after. Build is run
  // outside this command so we don't rebuild on every test invocation.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
