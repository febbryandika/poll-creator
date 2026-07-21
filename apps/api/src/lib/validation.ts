import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { fail } from './errors'

export const voteSchema = z.object({
  shareCode: z.string().min(1),
  optionId: z.string().min(1),
  sessionKey: z.string().min(1),
})

export type VoteInput = z.infer<typeof voteSchema>

// Custom hook → SPEC §10 shape { error: { code, message } } at 400, not Hono's default.
export const voteJsonValidator = zValidator('json', voteSchema, (result, c) => {
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Invalid request body'
    return fail(c, 'VALIDATION_ERROR', message)
  }
})
