import 'dotenv/config' // load an optional repo-root .env (e.g. TEST_DATABASE_URL) before anything reads env
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Integration tests run against a REAL, disposable *_test Postgres. Override the port/host
// via TEST_DATABASE_URL (a repo-root .env or the shell); CI sets it explicitly.
const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://poll:poll@localhost:5432/poll_creator_test'

// Main process (globalSetup) doesn't get `test.env`, so pin it here too.
process.env.TEST_DATABASE_URL = TEST_DB_URL
process.env.DATABASE_URL = TEST_DB_URL

const dbPath = (file: string) => fileURLToPath(new URL(`./packages/db/${file}`, import.meta.url))

export default defineConfig({
  // @poll-creator/db ships raw .ts via subpath exports. Alias them straight to source so Vite
  // transforms them (subpath-exports-to-raw-.ts resolution is otherwise unreliable under Vite).
  // Order matters: specific subpaths before the bare package (regex → exact match only).
  resolve: {
    alias: [
      { find: '@poll-creator/db/testing', replacement: dbPath('testing.ts') },
      { find: '@poll-creator/db/queries', replacement: dbPath('queries.ts') },
      { find: '@poll-creator/db/schema', replacement: dbPath('schema.ts') },
      { find: /^@poll-creator\/db$/, replacement: dbPath('index.ts') },
    ],
  },
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'e2e/**', '**/*.spec.ts'],

    // apps/api/src/lib/db.ts calls createDb() reading DATABASE_URL at import — force the test DB.
    // REDIS_URL is inherited from the shell/CI (absence → the live-push test self-skips).
    env: { DATABASE_URL: TEST_DB_URL, TEST_DATABASE_URL: TEST_DB_URL },

    globalSetup: ['./test/global-setup.ts'], // create-if-missing + migrate, once
    setupFiles: ['./test/setup.ts'], // beforeEach(resetDb) + afterAll(closeDb)

    // One shared test DB → serialize files so truncate/seed never interleave.
    fileParallelism: false,
  },
})
