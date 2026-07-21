import type { Context } from 'hono'

export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  POLL_EXPIRED: 410,
} as const

export type ErrorCode = keyof typeof ERROR_STATUS

/** SPEC §10 error response: { error: { code, message } } with the mapped status. */
export function fail(c: Context, code: ErrorCode, message: string) {
  return c.json({ error: { code, message } }, ERROR_STATUS[code])
}
