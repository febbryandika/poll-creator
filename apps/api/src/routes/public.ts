import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import {
  getPollByShareCode,
  getPollWithOptions,
  getVoteCounts,
  insertVote,
} from '@poll-creator/db/queries'
import { db } from '../lib/db'
import { fail } from '../lib/errors'
import { publishCounts, subscribeToChannel } from '../lib/redis'
import { voteJsonValidator } from '../lib/validation'

const HEARTBEAT_MS = 20_000

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

// Live vote counts over Server-Sent Events (SPEC §5). One EventSource per viewer;
// all viewers of a poll share ONE Redis subscription via the in-process fan-out.
publicRoutes.get('/stream', async (c) => {
  const shareCode = c.req.query('shareCode')
  // Validate BEFORE streamSSE — once it runs, a 200 is committed and we can no
  // longer return a real 400/404 status.
  if (!shareCode) return fail(c, 'VALIDATION_ERROR', 'shareCode query parameter is required')

  const poll = await getPollByShareCode(db, shareCode)
  if (!poll || !poll.isPublished) return fail(c, 'NOT_FOUND', 'Poll not found')

  const pollId = poll.id
  return streamSSE(c, async (stream) => {
    // 1) Initial snapshot so a fresh client renders immediately.
    const counts = await getVoteCounts(db, pollId)
    await stream.writeSSE({ data: JSON.stringify(counts), event: 'counts' })

    // 2) Live updates. `message` is already the JSON string the publisher sent —
    //    forward it verbatim (the browser does the single JSON.parse).
    const unsubscribe = subscribeToChannel(`poll:${shareCode}`, (message) => {
      stream.writeSSE({ data: message, event: 'counts' }).catch(() => {})
    })

    // 3) Core leak prevention: on disconnect drop this client's listener (which
    //    UNSUBSCRIBEs from Redis if it was the last viewer of the poll).
    stream.onAbort(() => unsubscribe())

    // 4) Hold the stream open + keepalive. The sleep loop stops the handler from
    //    resolving (which would end the stream) and pings every ~20s so proxies
    //    don't cull the idle connection. Exits once aborted.
    while (!stream.aborted) {
      await stream.sleep(HEARTBEAT_MS)
      if (stream.aborted) break
      await stream.writeSSE({ data: '', event: 'ping' })
    }
  })
})
