import { describe, expect, it } from 'vitest'
import { testDb } from './testing'
import {
  createPoll,
  deletePoll,
  getPollByShareCode,
  getPollWithOptions,
  getVoteCounts,
  insertVote,
  setPollPublished,
  updatePoll,
} from './queries'

async function makePoll(options = ['A', 'B', 'C'], userId = 'u1') {
  const poll = await createPoll(testDb, { userId, question: 'Q?', options, expiresAt: null })
  const full = await testDb.query.polls.findFirst({
    where: (p, { eq }) => eq(p.id, poll.id),
    with: { options: true },
  })
  return { poll, options: full!.options }
}

describe('insertVote — dedup', () => {
  it('accepts one vote per (poll, sessionKey) and ignores duplicates', async () => {
    const { poll, options } = await makePoll()
    const first = await insertVote(testDb, {
      pollId: poll.id,
      optionId: options[0]!.id,
      sessionKey: 's1',
    })
    // Same sessionKey again — even on a DIFFERENT option — is a no-op (uq_vote is on poll+session).
    const dup = await insertVote(testDb, {
      pollId: poll.id,
      optionId: options[1]!.id,
      sessionKey: 's1',
    })
    const other = await insertVote(testDb, {
      pollId: poll.id,
      optionId: options[1]!.id,
      sessionKey: 's2',
    })

    expect(first).toBe(true)
    expect(dup).toBe(false)
    expect(other).toBe(true)

    const counts = await getVoteCounts(testDb, poll.id)
    expect(counts[options[0]!.id]).toBe(1) // s1's original choice, unchanged by the duplicate
    expect(counts[options[1]!.id]).toBe(1) // s2 only
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(2)
  })
})

describe('getVoteCounts', () => {
  it('includes zero-vote options', async () => {
    const { poll, options } = await makePoll(['A', 'B', 'C'])
    await insertVote(testDb, { pollId: poll.id, optionId: options[0]!.id, sessionKey: 's1' })

    const counts = await getVoteCounts(testDb, poll.id)
    expect(Object.keys(counts).sort()).toEqual(options.map((o) => o.id).sort())
    expect(counts[options[0]!.id]).toBe(1)
    expect(counts[options[1]!.id]).toBe(0)
    expect(counts[options[2]!.id]).toBe(0)
  })
})

describe('poll lifecycle', () => {
  it('creates an unpublished poll with a shareCode', async () => {
    const poll = await createPoll(testDb, {
      userId: 'u1',
      question: 'Q?',
      options: ['A', 'B'],
      expiresAt: null,
    })
    expect(poll.isPublished).toBe(false)
    expect(poll.shareCode).toBeTruthy()
    expect(await getPollByShareCode(testDb, poll.shareCode)).toMatchObject({ id: poll.id })
  })

  it('publishes only for the owner', async () => {
    const { poll } = await makePoll(['A', 'B'])
    expect(await setPollPublished(testDb, { id: poll.id, userId: 'u1', isPublished: true })).toBe(
      true,
    )
    expect(
      await setPollPublished(testDb, { id: poll.id, userId: 'someone-else', isPublished: true }),
    ).toBe(false)
  })

  it('updates before votes, blocks after votes, and 404s for a non-owner', async () => {
    const { poll } = await makePoll(['A', 'B'])

    const wrongOwner = await updatePoll(testDb, {
      id: poll.id,
      userId: 'not-owner',
      question: 'X',
      options: ['A', 'B'],
      expiresAt: null,
    })
    expect(wrongOwner.status).toBe('not_found')

    const ok = await updatePoll(testDb, {
      id: poll.id,
      userId: 'u1',
      question: 'Updated?',
      options: ['A', 'B', 'C'],
      expiresAt: null,
    })
    expect(ok.status).toBe('ok')

    // A single vote makes further edits illegal (guards tally integrity).
    const refreshed = await getPollWithOptions(testDb, poll.shareCode)
    await insertVote(testDb, {
      pollId: poll.id,
      optionId: refreshed!.options[0]!.id,
      sessionKey: 's1',
    })
    const blocked = await updatePoll(testDb, {
      id: poll.id,
      userId: 'u1',
      question: 'Again?',
      options: ['A', 'B'],
      expiresAt: null,
    })
    expect(blocked.status).toBe('has_votes')
  })

  it('deletes a poll and cascades to options and votes', async () => {
    const { poll, options } = await makePoll(['A', 'B'])
    await insertVote(testDb, { pollId: poll.id, optionId: options[0]!.id, sessionKey: 's1' })

    expect(await deletePoll(testDb, { id: poll.id, userId: 'u1' })).toBe(true)
    expect(await getPollByShareCode(testDb, poll.shareCode)).toBeUndefined()
    expect(await getVoteCounts(testDb, poll.id)).toEqual({}) // options gone → no rows
  })
})

describe('share-code reads are not publish/expiry gated', () => {
  it('returns an unpublished poll (guarding is route-level)', async () => {
    const { poll } = await makePoll(['A', 'B'])
    expect((await getPollByShareCode(testDb, poll.shareCode))?.isPublished).toBe(false)
    expect((await getPollWithOptions(testDb, poll.shareCode))?.options).toHaveLength(2)
  })
})
