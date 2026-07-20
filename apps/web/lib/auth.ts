import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createDb, schema } from '@poll-creator/db'

// One module-scoped instance. postgres-js connects lazily, so constructing this
// at import time opens no socket (safe for build/typecheck without DATABASE_URL).
const db = createDb()

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true, autoSignIn: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  plugins: [nextCookies()], // must be last
})

// Server-side session validation, memoized per render pass.
export const getServerSession = cache(async () => auth.api.getSession({ headers: await headers() }))

export async function requireSession() {
  const session = await getServerSession()
  if (!session) redirect('/login')
  return session
}
