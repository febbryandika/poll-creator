import { afterAll, beforeEach } from 'vitest'
import { closeDb, resetDb } from '@poll-creator/db/testing'

// Runs in every test worker: a clean DB before each test, pool closed at the end.
beforeEach(async () => {
  await resetDb()
})

afterAll(async () => {
  await closeDb()
})
