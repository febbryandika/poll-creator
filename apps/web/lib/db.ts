import { createDb } from '@poll-creator/db'

// One module-scoped instance for Server Actions + server components. postgres-js is
// lazy, so constructing it at import opens no socket (build/typecheck-safe).
export const db = createDb()
