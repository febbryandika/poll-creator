import { defineConfig, devices } from '@playwright/test'

// Local-only E2E (SPEC §8 keeps CI to Vitest). Requires Postgres + Redis running and the
// app .env files present; both servers load their own env and must share one DATABASE_URL.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts', // Vitest owns *.test.ts; Playwright owns *.spec.ts
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'pnpm --filter @poll-creator/api start',
      port: 8787,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @poll-creator/web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
