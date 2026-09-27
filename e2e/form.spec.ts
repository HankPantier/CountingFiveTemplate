import { test, expect } from '@playwright/test'
import { contactFormPageUrl } from './site-pages'

/**
 * Browser-level contact-form coverage. The route logic (spam layers, Resend,
 * covert success) is covered by vitest route tests — these tests cover what
 * those can't: the rendered form, client-side validation feedback, and the
 * browser → /api/contact wiring.
 *
 * Runs against whichever page carries the `form | variant: contact` block:
 * the template's demo home page, or a client site's contact page. A site with
 * no form page skips.
 */
const FORM_PAGE = contactFormPageUrl()
test.skip(FORM_PAGE === null, 'no content/pages/*.md carries a form block')

test('contact form shows inline validation errors on empty submit', async ({ page }) => {
  await page.goto(FORM_PAGE!)
  const form = page.locator('#f-name').locator('xpath=ancestor::form')
  await form.scrollIntoViewIfNeeded()
  await form.getByRole('button', { name: /send|submit|get in touch/i }).click()
  await expect(page.locator('#f-name-error')).toBeVisible()
  await expect(page.locator('#f-email-error')).toBeVisible()
})

test('filled contact form submits to /api/contact (mailto fallback without Resend)', async ({ page }) => {
  await page.goto(FORM_PAGE!)
  await page.locator('#f-name').fill('Playwright Tester')
  await page.locator('#f-email').fill('delivered@resend.dev')
  await page.locator('#f-message').fill('End-to-end form wiring check — not a real inquiry.')

  // Outlast the timing spam trap (MIN_SUBMIT_MS = 3000).
  await page.waitForTimeout(3200)

  const form = page.locator('#f-name').locator('xpath=ancestor::form')
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/contact') && r.request().method() === 'POST'),
    form.getByRole('button', { name: /send|submit|get in touch/i }).click(),
  ])

  // Without RESEND_API_KEY the API answers 503 and the UI falls back to
  // mailto:; with a key configured it answers 200. Either proves the
  // browser → API wiring end-to-end.
  expect([200, 503]).toContain(response.status())
})
