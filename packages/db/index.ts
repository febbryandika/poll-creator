import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Factory (not a module-level connection) so importing this package never opens
// a socket — it stays typecheckable and safe to import without a live database.
export function createDb(url = process.env.DATABASE_URL!) {
  return drizzle(postgres(url, { prepare: false }), { schema })
}

export type DB = ReturnType<typeof createDb>
export { schema }
