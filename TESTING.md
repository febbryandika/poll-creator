# Testing

Two layers, both integration-first with **no mocking** — real Postgres, real Redis, the real Hono
app, and a real browser.

- **Vitest** (`pnpm test`) — DB logic, the Hono public API, the SSE stream, and the Zod schemas.
- **Playwright** (`pnpm test:e2e`) — one end-to-end happy path: create → share → vote → live update.

## Prerequisites

- **Postgres** running (e.g. `docker compose up -d postgres`). The Vitest suite auto-creates,
  migrates, and truncates a disposable **`poll_creator_test`** database — it never touches your
  dev data. Point `TEST_DATABASE_URL` at your Postgres (copy the `.env.example` block into a
  repo-root `./.env`); the name must end in `_test`.
- **Redis** running (e.g. `docker compose up -d redis`) — needed only for the live-push SSE
  Vitest test and the Playwright E2E. Without `REDIS_URL`, the live-push test self-skips.

## Vitest

```bash
pnpm test          # run once (unit + integration + realtime)
pnpm test:watch    # watch mode
```

`vitest.config.ts` points the app code at `TEST_DATABASE_URL`, provisions the schema once in
`test/global-setup.ts`, and truncates between tests via `test/setup.ts`. Suites are serialized
(`fileParallelism: false`) because they share one database.

Files: `packages/db/queries.test.ts` (dedup, vote-count aggregation, poll lifecycle),
`apps/api/src/routes/public.test.ts` (vote/results guards + SSE), `apps/api/src/lib/validation.test.ts`
and `apps/web/lib/validations.test.ts` (Zod schemas).

## Playwright (local)

```bash
pnpm exec playwright install --with-deps chromium   # one-time
pnpm test:e2e
```

Needs Postgres **and** Redis up, and the app `.env` files configured (`BETTER_AUTH_SECRET`, a shared
`DATABASE_URL` for web + api). `playwright.config.ts` starts both servers (`reuseExistingServer`
locally, so it reuses your running dev servers) and drives `e2e/happy-path.spec.ts`. The E2E is
local-only by design — CI runs Vitest (with Postgres + Redis services); see `.github/workflows/ci.yml`.
