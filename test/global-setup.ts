import { closeDb, ensureTestDatabase, migrateTestDb } from '@poll-creator/db/testing'

// Runs once before the whole suite (main process): provision + migrate the test DB.
export default async function setup() {
  await ensureTestDatabase()
  await migrateTestDb()
  return async () => {
    await closeDb()
  }
}
