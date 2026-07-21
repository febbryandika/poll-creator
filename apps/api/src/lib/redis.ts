import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

// Constructed only when configured, so local dev + CI run with no Upstash at all.
const redis = url && token ? new Redis({ url, token }) : null

/**
 * Best-effort publish of live counts. The DB is the source of truth, so a missing
 * config or a Redis failure must never fail the vote — we no-op / log and move on.
 * SUBSCRIBE (the SSE fan-out consumer) is a later phase; only PUBLISH is used here.
 */
export async function publishCounts(
  shareCode: string,
  counts: Record<string, number>,
): Promise<void> {
  if (!redis) return
  try {
    await redis.publish(`poll:${shareCode}`, JSON.stringify(counts))
  } catch (err) {
    console.error(`[redis] publish failed for poll:${shareCode}`, err)
  }
}
