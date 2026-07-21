import { Redis } from 'ioredis'
import { logger, serializeError } from './logger'

const url = process.env.REDIS_URL

// One shared publisher + one shared subscriber for the whole process. We NEVER open
// a Redis connection per SSE client — instead we fan out in-process via `listeners`.
// Both are created lazily (first use), so importing this module connects to nothing
// (CI / tsc / lint are safe with no Redis running).
let publisher: Redis | null = null
let subscriber: Redis | null = null

// channel -> set of per-SSE-client listeners. The single subscriber connection's
// 'message' handler dispatches each Redis message to every listener for that channel.
const listeners = new Map<string, Set<(message: string) => void>>()

// Bounded reconnect so a down Redis retries calmly (every <=2s) instead of spamming.
const retryStrategy = (times: number) => Math.min(times * 200, 2000)

function getPublisher(): Redis | null {
  if (!url) return null
  if (!publisher) {
    // enableOfflineQueue:false + maxRetriesPerRequest:1 => publish() fails fast when
    // Redis is unreachable, so the awaited publish in the vote path never hangs.
    publisher = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy,
    })
    publisher.on('error', (err) =>
      logger.error('redis_publisher_error', { err: serializeError(err) }),
    )
  }
  return publisher
}

function getSubscriber(): Redis | null {
  if (!url) return null
  if (!subscriber) {
    subscriber = new Redis(url, { lazyConnect: true, retryStrategy })
    subscriber.on('error', (err) =>
      logger.error('redis_subscriber_error', { err: serializeError(err) }),
    )
    subscriber.on('message', (channel: string, message: string) => {
      const set = listeners.get(channel)
      if (!set) return
      for (const fn of set) fn(message)
    })
  }
  return subscriber
}

/**
 * Best-effort publish of live counts. The DB is the source of truth, so a missing
 * config or a Redis failure must never fail the vote — we no-op / log and move on.
 * Wire format: publish JSON.stringify(counts) (a plain string). The subscriber
 * receives that exact string, the SSE `data` is that string, and the browser does
 * one JSON.parse — one encode here, one decode client-side (no double-encoding).
 */
export async function publishCounts(
  shareCode: string,
  counts: Record<string, number>,
): Promise<void> {
  const pub = getPublisher()
  if (!pub) return
  try {
    await pub.publish(`poll:${shareCode}`, JSON.stringify(counts))
  } catch (err) {
    logger.error('redis_publish_failed', {
      channel: `poll:${shareCode}`,
      err: serializeError(err),
    })
  }
}

/**
 * Register one SSE client's listener on a channel. Only the FIRST listener for a
 * channel issues a real Redis SUBSCRIBE; only the LAST to leave issues UNSUBSCRIBE.
 * Returns an unsubscribe fn (call it from streamSSE's onAbort). When REDIS_URL is
 * unset it returns a no-op, so the SSE endpoint still serves the initial snapshot
 * with no live updates (and CI stays green).
 */
export function subscribeToChannel(
  channel: string,
  listener: (message: string) => void,
): () => void {
  const sub = getSubscriber()
  if (!sub) return () => {}

  let set = listeners.get(channel)
  if (!set) {
    set = new Set()
    listeners.set(channel, set)
    sub
      .subscribe(channel)
      .catch((err) => logger.error('redis_subscribe_failed', { channel, err: serializeError(err) }))
  }
  set.add(listener)

  return () => {
    const current = listeners.get(channel)
    if (!current) return
    current.delete(listener)
    if (current.size === 0) {
      listeners.delete(channel)
      sub
        .unsubscribe(channel)
        .catch((err) =>
          logger.error('redis_unsubscribe_failed', { channel, err: serializeError(err) }),
        )
    }
  }
}
