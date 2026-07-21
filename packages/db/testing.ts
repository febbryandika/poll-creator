// Test-only helpers for the integration suite. Not imported by app code.
// Builds its OWN postgres()+drizzle() client (createDb exposes no handle to close),
// pointed at a disposable *_test database that we create + migrate + truncate.
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { schema } from './index'
import { createPoll, setPollPublished } from './queries'

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
if (!url) {
  throw new Error('TEST_DATABASE_URL (or DATABASE_URL) must be set to run the test suite')
}

// max:1 keeps truncate/seed strictly ordered; own pool so afterAll can close it.
const sql = postgres(url, { prepare: false, max: 1 })
export const testDb = drizzle(sql, { schema })

const migrationsFolder = fileURLToPath(new URL('./drizzle', import.meta.url))

function databaseName(connectionUrl: string): string {
  return new URL(connectionUrl).pathname.replace(/^\//, '')
}

/**
 * Create the test database if it is absent (connects to the `postgres` maintenance db).
 * Hard-refuses any database whose name doesn't end in `_test`, so a misconfigured
 * TEST_DATABASE_URL can never truncate a real database.
 */
export async function ensureTestDatabase(): Promise<void> {
  const name = databaseName(url!)
  if (!/^[a-zA-Z0-9_]+$/.test(name) || !name.endsWith('_test')) {
    throw new Error(`Refusing to run tests against a database not named *_test: "${name}"`)
  }
  const adminUrl = new URL(url!)
  adminUrl.pathname = '/postgres'
  const admin = postgres(adminUrl.toString(), { max: 1 })
  try {
    const rows = await admin`SELECT 1 FROM pg_database WHERE datname = ${name}`
    if (rows.length === 0) await admin.unsafe(`CREATE DATABASE "${name}"`)
  } finally {
    await admin.end({ timeout: 5 })
  }
}

export async function migrateTestDb(): Promise<void> {
  await migrate(testDb, { migrationsFolder })
}

/** Reset between tests. `user` is a reserved word, so it must be quoted; CASCADE clears FKs. */
export async function resetDb(): Promise<void> {
  await sql`TRUNCATE polls, options, votes, "user", session, account, verification RESTART IDENTITY CASCADE`
}

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}

type SeedOptions = {
  userId?: string
  question?: string
  options?: string[]
  expiresAt?: Date | null
  published?: boolean
}

/** Seed a poll (published unless `published:false`) and return it with its option rows. */
export async function seedPublishedPoll(opts: SeedOptions = {}) {
  const poll = await createPoll(testDb, {
    userId: opts.userId ?? 'user_test',
    question: opts.question ?? 'Best language?',
    options: opts.options ?? ['Rust', 'Go', 'TypeScript'],
    expiresAt: opts.expiresAt ?? null,
  })
  if (opts.published !== false) {
    await setPollPublished(testDb, { id: poll.id, userId: poll.userId, isPublished: true })
  }
  const full = await testDb.query.polls.findFirst({
    where: (p, { eq }) => eq(p.id, poll.id),
    with: { options: true },
  })
  if (!full) throw new Error('seedPublishedPoll: poll not found after insert')
  return { poll, options: full.options }
}
