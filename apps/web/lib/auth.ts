import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { schema } from '@poll-creator/db'
import { db } from '@/lib/db'

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
