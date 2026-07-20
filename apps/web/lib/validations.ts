import { z } from 'zod'

export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 6
export const MAX_QUESTION = 280

export const pollInputSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Question is required')
    .max(MAX_QUESTION, `Question must be ${MAX_QUESTION} characters or fewer`),
  options: z
    .array(z.string().trim().min(1, 'Option cannot be empty'))
    .min(MIN_OPTIONS, `A poll needs at least ${MIN_OPTIONS} options`)
    .max(MAX_OPTIONS, `A poll can have at most ${MAX_OPTIONS} options`),
  // datetime-local yields 'YYYY-MM-DDTHH:mm'; kept a string, converted to Date in the action.
  expiresAt: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), 'Invalid date')
    .refine((v) => v === undefined || new Date(v) > new Date(), 'Expiry must be in the future'),
})

export type PollInput = z.infer<typeof pollInputSchema>
