import { count, eq } from 'drizzle-orm'
import type { DB } from './index'
import { options, polls, votes } from './schema'
import type { NewVote } from './schema'

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
