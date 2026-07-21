import { expect, test, type Browser } from '@playwright/test'

// Cast one vote from a fresh, unauthenticated context (each gets its own localStorage
// session key, so it counts as a distinct voter).
async function castVote(browser: Browser, shareCode: string, option: string) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(`/p/${shareCode}`)
  await page.getByText(option, { exact: true }).click() // exact → the option, not the question text
  await page.getByRole('button', { name: 'Vote' }).click()
  await page.waitForURL(`**/p/${shareCode}/results`)
  await ctx.close()
}

// The flagship test: it exercises the exact thing that justifies the Hono server —
// a vote from one browser pushing a live SSE update to the creator's results page.
test('create → share → vote → creator results update live', async ({ page, browser }) => {
  const email = `poll-${Date.now()}@example.test`

  // 1) Register — emailAndPassword has autoSignIn, so this lands on /dashboard.
  await page.goto('/register')
  await page.getByLabel('Name').fill('E2E User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL('**/dashboard')

  // 2) Create a poll.
  await page.goto('/polls/new')
  await page.getByLabel('Question').fill('Tabs or spaces?')
  await page.getByPlaceholder('Option 1').fill('Tabs')
  await page.getByPlaceholder('Option 2').fill('Spaces')
  await page.getByRole('button', { name: 'Create poll' }).click()
  await page.waitForURL('**/dashboard')

  // 3) Publish, then read the share code from the dashboard row.
  await page.getByRole('button', { name: 'Publish' }).click()
  const shareText = await page.locator('code', { hasText: '/p/' }).first().innerText()
  const shareCode = shareText.trim().replace('/p/', '')

  // 4) Creator opens live results; wait until SSE is actually connected.
  await page.goto(`/p/${shareCode}/results`)
  await expect(page.getByText('0 votes so far')).toBeVisible()
  await expect(page.getByRole('status')).toHaveText(/Live/, { timeout: 10_000 })

  // 5) First vote warms the API's Redis publisher (its cold first publish is best-effort and
  //    dropped by design); the second vote's counts then push over SSE.
  await castVote(browser, shareCode, 'Tabs')
  await castVote(browser, shareCode, 'Spaces')

  // 6) The creator's page reflects the votes live — no reload.
  await expect(page.getByText('2 votes so far')).toBeVisible({ timeout: 15_000 })
})
