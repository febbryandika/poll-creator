import { Hono } from 'hono'
import {
  getPollByShareCode,
  getPollWithOptions,
  getVoteCounts,
  insertVote,
} from '@poll-creator/db/queries'
import { db } from '../lib/db'
import { fail } from '../lib/errors'
import { publishCounts } from '../lib/redis'
import { voteJsonValidator } from '../lib/validation'

export const publicRoutes = new Hono()

// Cast a vote. Deduped by the DB uq_vote(poll_id, session_key) constraint.
publicRoutes.post('/vote', voteJsonValidator, async (c) => {
  const { shareCode, optionId, sessionKey } = c.req.valid('json')

  const poll = await getPollWithOptions(db, shareCode)
  if (!poll || !poll.isPublished) return fail(c, 'FORBIDDEN', 'Poll not active')
  if (poll.expiresAt && poll.expiresAt < new Date()) {
    return fail(c, 'POLL_EXPIRED', 'Poll has expired')
  }
  if (!poll.options.some((o) => o.id === optionId)) {
    return fail(c, 'VALIDATION_ERROR', 'Option does not belong to this poll')
  }

  const voted = await insertVote(db, { pollId: poll.id, optionId, sessionKey })
  const counts = await getVoteCounts(db, poll.id)
  await publishCounts(shareCode, counts) // best-effort; never fails the vote

  return c.json({ counts, voted })
})

// Current vote counts (initial load / fallback for the live results page).
publicRoutes.get('/results', async (c) => {
  const shareCode = c.req.query('shareCode')
  if (!shareCode) return fail(c, 'VALIDATION_ERROR', 'shareCode query parameter is required')

  const poll = await getPollByShareCode(db, shareCode)
  if (!poll || !poll.isPublished) return fail(c, 'NOT_FOUND', 'Poll not found')

  const counts = await getVoteCounts(db, poll.id)
  return c.json({ counts })
})
