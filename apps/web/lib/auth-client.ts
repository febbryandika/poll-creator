import { createAuthClient } from 'better-auth/react'

// Same-origin: Better Auth is served from /api/auth on this app, so no baseURL.
export const authClient = createAuthClient()
export const { signIn, signUp, signOut, useSession } = authClient
