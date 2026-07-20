'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createPoll, deletePoll, setPollPublished, updatePoll } from '@poll-creator/db/queries'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { fail, fieldErrorsFromZod, type ActionResult } from '@/lib/errors'
import { pollInputSchema } from '@/lib/validations'

type RawPollInput = { question: string; options: string[]; expiresAt?: string }

export async function createPollAction(input: RawPollInput): Promise<ActionResult> {
  const session = await getServerSession()
  if (!session) return fail('UNAUTHORIZED', 'You must be signed in.')

  const parsed = pollInputSchema.safeParse(input)
  if (!parsed.success) {
    return fail(
      'VALIDATION_ERROR',
      'Please fix the errors below.',
      fieldErrorsFromZod(parsed.error),
    )
  }

  await createPoll(db, {
    userId: session.user.id,
    question: parsed.data.question,
    options: parsed.data.options,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
  })

  revalidatePath('/dashboard')
  redirect('/dashboard') // throws NEXT_REDIRECT — must be last, never inside try/catch
}

export async function updatePollAction(pollId: string, input: RawPollInput): Promise<ActionResult> {
  const session = await getServerSession()
  if (!session) return fail('UNAUTHORIZED', 'You must be signed in.')

  const parsed = pollInputSchema.safeParse(input)
  if (!parsed.success) {
    return fail(
      'VALIDATION_ERROR',
      'Please fix the errors below.',
      fieldErrorsFromZod(parsed.error),
    )
  }

  const result = await updatePoll(db, {
    id: pollId,
    userId: session.user.id,
    question: parsed.data.question,
    options: parsed.data.options,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
  })

  if (result.status === 'not_found') return fail('NOT_FOUND', 'Poll not found.')
  if (result.status === 'has_votes') {
    return fail('FORBIDDEN', 'This poll already has votes and can no longer be edited.')
  }

  revalidatePath('/dashboard')
  revalidatePath(`/polls/${pollId}/edit`)
  redirect('/dashboard')
}

export async function deletePollAction(pollId: string): Promise<ActionResult> {
  const session = await getServerSession()
  if (!session) return fail('UNAUTHORIZED', 'You must be signed in.')

  const deleted = await deletePoll(db, { id: pollId, userId: session.user.id })
  if (!deleted) return fail('NOT_FOUND', 'Poll not found.')

  revalidatePath('/dashboard')
  return { ok: true }
}

export async function setPublishedAction(
  pollId: string,
  isPublished: boolean,
): Promise<ActionResult> {
  const session = await getServerSession()
  if (!session) return fail('UNAUTHORIZED', 'You must be signed in.')

  const updated = await setPollPublished(db, { id: pollId, userId: session.user.id, isPublished })
  if (!updated) return fail('NOT_FOUND', 'Poll not found.')

  revalidatePath('/dashboard')
  return { ok: true }
}
