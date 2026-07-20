import { and, count, desc, eq } from 'drizzle-orm'
import type { DB } from './index'
import { options, polls, votes } from './schema'
import type { NewVote, Poll } from './schema'

/** Vote route + SSE bootstrap: look up a poll by its public share code. */
export function getPollByShareCode(db: DB, shareCode: string) {
  return db.query.polls.findFirst({ where: eq(polls.shareCode, shareCode) })
}

/** Public SSR vote page: poll plus its options. */
export function getPollWithOptions(db: DB, shareCode: string) {
  return db.query.polls.findFirst({
    where: eq(polls.shareCode, shareCode),
    with: { options: true },
  })
}

/**
 * Live results. options LEFT JOIN votes, grouped per option, so options with
 * zero votes are included (SPEC §11). Returns Record<optionId, number> — the
 * exact shape the client parses as JSON.parse(e.data).
 */
export async function getVoteCounts(db: DB, pollId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ optionId: options.id, count: count(votes.id) })
    .from(options)
    .leftJoin(votes, eq(votes.optionId, options.id))
    .where(eq(options.pollId, pollId))
    .groupBy(options.id)

  const counts: Record<string, number> = {}
  for (const row of rows) counts[row.optionId] = row.count
  return counts
}

/**
 * Cast a vote, deduped by the uq_vote(poll_id, session_key) constraint.
 * Returns true if a row was actually inserted (false on conflict) so the caller
 * can skip the count recompute / Redis publish on a duplicate.
 */
export async function insertVote(
  db: DB,
  vote: Pick<NewVote, 'pollId' | 'optionId' | 'sessionKey'>,
): Promise<boolean> {
  const inserted = await db
    .insert(votes)
    .values(vote)
    .onConflictDoNothing({ target: [votes.pollId, votes.sessionKey] })
    .returning({ id: votes.id })

  return inserted.length > 0
}

// ── Poll CRUD (auth-gated; every query is scoped by userId for ownership) ──

/** Dashboard list: a user's polls, newest first. */
export function listPollsByUser(db: DB, userId: string) {
  return db.query.polls.findMany({
    where: eq(polls.userId, userId),
    orderBy: desc(polls.createdAt),
  })
}

/** Edit page: poll + options, only if owned by userId (else undefined — never leak existence). */
export function getPollForOwner(db: DB, input: { id: string; userId: string }) {
  return db.query.polls.findFirst({
    where: and(eq(polls.id, input.id), eq(polls.userId, input.userId)),
    with: { options: true },
  })
}

/** True if any vote exists for the poll (before-votes edit guard). */
export async function pollHasVotes(db: DB, pollId: string): Promise<boolean> {
  const rows = await db
    .select({ id: votes.id })
    .from(votes)
    .where(eq(votes.pollId, pollId))
    .limit(1)
  return rows.length > 0
}

export async function createPoll(
  db: DB,
  input: { userId: string; question: string; options: string[]; expiresAt: Date | null },
): Promise<Poll> {
  return db.transaction(async (tx) => {
    const [poll] = await tx
      .insert(polls)
      .values({ userId: input.userId, question: input.question, expiresAt: input.expiresAt })
      .returning()
    if (!poll) throw new Error('createPoll: insert returned no row')
    await tx.insert(options).values(input.options.map((text) => ({ pollId: poll.id, text })))
    return poll
  })
}

export type UpdatePollResult =
  { status: 'ok'; poll: Poll } | { status: 'not_found' } | { status: 'has_votes' }

/** Ownership-scoped update; blocked once the poll has votes (editing options corrupts tallies). */
export async function updatePoll(
  db: DB,
  input: {
    id: string
    userId: string
    question: string
    options: string[]
    expiresAt: Date | null
  },
): Promise<UpdatePollResult> {
  return db.transaction(async (tx) => {
    const existing = await tx.query.polls.findFirst({
      where: and(eq(polls.id, input.id), eq(polls.userId, input.userId)),
    })
    if (!existing) return { status: 'not_found' }

    const voted = await tx
      .select({ id: votes.id })
      .from(votes)
      .where(eq(votes.pollId, input.id))
      .limit(1)
    if (voted.length > 0) return { status: 'has_votes' }

    const [updated] = await tx
      .update(polls)
      .set({ question: input.question, expiresAt: input.expiresAt })
      .where(and(eq(polls.id, input.id), eq(polls.userId, input.userId)))
      .returning()
    await tx.delete(options).where(eq(options.pollId, input.id))
    await tx.insert(options).values(input.options.map((text) => ({ pollId: input.id, text })))

    if (!updated) return { status: 'not_found' }
    return { status: 'ok', poll: updated }
  })
}

/** Ownership-scoped delete (cascade removes options + votes); allowed regardless of votes. */
export async function deletePoll(db: DB, input: { id: string; userId: string }): Promise<boolean> {
  const deleted = await db
    .delete(polls)
    .where(and(eq(polls.id, input.id), eq(polls.userId, input.userId)))
    .returning({ id: polls.id })
  return deleted.length > 0
}

/** Ownership-scoped publish/unpublish toggle. */
export async function setPollPublished(
  db: DB,
  input: { id: string; userId: string; isPublished: boolean },
): Promise<boolean> {
  const updated = await db
    .update(polls)
    .set({ isPublished: input.isPublished })
    .where(and(eq(polls.id, input.id), eq(polls.userId, input.userId)))
    .returning({ id: polls.id })
  return updated.length > 0
}
