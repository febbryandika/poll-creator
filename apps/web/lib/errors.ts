import type { ZodError } from 'zod'

export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  POLL_EXPIRED: 410,
} as const

export type ErrorCode = keyof typeof ERROR_STATUS

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | {
      ok: false
      error: { code: ErrorCode; message: string }
      fieldErrors?: Record<string, string[]>
    }

export function fail(
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error: { code, message }, fieldErrors }
}

/** Flatten a ZodError into { question: [...], 'options.0': [...], ... } keyed by path. */
export function fieldErrorsFromZod(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    ;(out[key] ??= []).push(issue.message)
  }
  return out
}
