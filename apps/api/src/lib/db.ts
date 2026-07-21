import { createDb } from '@poll-creator/db'

// One module-scoped instance for all routes. postgres-js is lazy, so constructing
// it at import opens no socket (import/typecheck/CI-safe).
export const db = createDb()
