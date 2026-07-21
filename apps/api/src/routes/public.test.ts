import { describe, expect, it } from 'vitest'
import { seedPublishedPoll } from '@poll-creator/db/testing'
import server from '../index'

const post = (path: string, body: unknown) =>
  server.fetch(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

const get = (path: string) => server.fetch(new Request(`http://localhost${path}`))

// Response.json() is typed `unknown` here — read it as the shape we expect.
const readJson = <T>(res: Response): Promise<T> => res.json() as Promise<T>
type ErrorBody = { error: { code: string; message: string } }
type CountsBody = { counts: Record<string, number>; voted?: boolean }

describe('POST /vote', () => {
  it('403 on an unpublished poll', async () => {
    const { poll, options } = await seedPublishedPoll({ published: false })
    const res = await post('/vote', {
      shareCode: poll.shareCode,
      optionId: options[0]!.id,
      sessionKey: 's1',
    })
    expect(res.status).toBe(403)
    expect(await readJson<ErrorBody>(res)).toEqual({
      error: { code: 'FORBIDDEN', message: 'Poll not active' },
    })
  })

  it('410 on an expired poll', async () => {
    const { poll, options } = await seedPublishedPoll({ expiresAt: new Date('2000-01-01') })
    const res = await post('/vote', {
      shareCode: poll.shareCode,
      optionId: options[0]!.id,
      sessionKey: 's1',
    })
    expect(res.status).toBe(410)
    expect((await readJson<ErrorBody>(res)).error.code).toBe('POLL_EXPIRED')
  })

  it('400 when the option does not belong to the poll', async () => {
    const { poll } = await seedPublishedPoll()
    const res = await post('/vote', {
      shareCode: poll.shareCode,
      optionId: 'not-an-option',
      sessionKey: 's1',
    })
    expect(res.status).toBe(400)
    expect((await readJson<ErrorBody>(res)).error.code).toBe('VALIDATION_ERROR')
  })

  it('400 on a malformed body (missing sessionKey)', async () => {
    const { poll, options } = await seedPublishedPoll()
    const res = await post('/vote', { shareCode: poll.shareCode, optionId: options[0]!.id })
    expect(res.status).toBe(400)
    expect((await readJson<ErrorBody>(res)).error.code).toBe('VALIDATION_ERROR')
  })

  it('records a vote, then dedups a repeat sessionKey (counts unchanged)', async () => {
    const { poll, options } = await seedPublishedPoll({ options: ['A', 'B'] })

    const first = await post('/vote', {
      shareCode: poll.shareCode,
      optionId: options[0]!.id,
      sessionKey: 's1',
    })
    expect(first.status).toBe(200)
    const firstBody = await readJson<CountsBody>(first)
    expect(firstBody.voted).toBe(true)
    expect(firstBody.counts[options[0]!.id]).toBe(1)

    const dup = await post('/vote', {
      shareCode: poll.shareCode,
      optionId: options[1]!.id,
      sessionKey: 's1',
    })
    expect(dup.status).toBe(200)
    const dupBody = await readJson<CountsBody>(dup)
    expect(dupBody.voted).toBe(false)
    expect(dupBody.counts[options[0]!.id]).toBe(1)
    expect(dupBody.counts[options[1]!.id]).toBe(0)
  })
})

describe('GET /results', () => {
  it('400 without a shareCode', async () => {
    const res = await get('/results')
    expect(res.status).toBe(400)
  })

  it('404 for an unpublished poll', async () => {
    const { poll } = await seedPublishedPoll({ published: false })
    const res = await get(`/results?shareCode=${poll.shareCode}`)
    expect(res.status).toBe(404)
  })

  it('returns counts (including zero-vote options) for a published poll', async () => {
    const { poll, options } = await seedPublishedPoll({ options: ['A', 'B'] })
    const res = await get(`/results?shareCode=${poll.shareCode}`)
    expect(res.status).toBe(200)
    const body = await readJson<CountsBody>(res)
    expect(Object.keys(body.counts)).toHaveLength(2)
    expect(body.counts[options[0]!.id]).toBe(0)
  })
})

// --- SSE helper: read the stream, skip pings, parse counts, bounded timeout + abort cleanup ---

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout: ${label}`)), ms)),
  ])
}

async function openStream(shareCode: string) {
  const ac = new AbortController()
  const res = await server.fetch(
    new Request(`http://localhost/stream?shareCode=${shareCode}`, { signal: ac.signal }),
  )
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  async function nextCounts(timeoutMs = 5000): Promise<Record<string, number>> {
    for (;;) {
      const sep = buffer.indexOf('\n\n')
      if (sep !== -1) {
        const frame = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        const event = /event:\s*(.*)/.exec(frame)?.[1]?.trim() ?? 'message'
        if (event === 'ping') continue // ignore heartbeats
        const data = /data:\s*([\s\S]*)/.exec(frame)?.[1] ?? ''
        return JSON.parse(data) as Record<string, number>
      }
      const { value, done } = await withTimeout(reader.read(), timeoutMs, 'sse read')
      if (done) throw new Error('stream closed before a counts event')
      buffer += decoder.decode(value, { stream: true })
    }
  }

  // Abort the request (fires streamSSE onAbort → unsubscribe + breaks the heartbeat loop)
  // AND cancel the reader, so no test leaves the 20s sleep coroutine holding the worker.
  function close() {
    ac.abort()
    void reader.cancel().catch(() => {})
  }

  return { nextCounts, close }
}

describe('GET /stream (SSE)', () => {
  it('emits the initial counts snapshot', async () => {
    const { poll, options } = await seedPublishedPoll({ options: ['A', 'B'] })
    const stream = await openStream(poll.shareCode)
    try {
      const snapshot = await stream.nextCounts()
      expect(Object.keys(snapshot)).toHaveLength(2)
      expect(snapshot[options[0]!.id]).toBe(0)
    } finally {
      stream.close()
    }
  })

  // Requires a real Redis: vote → publishCounts → Redis → subscriber → in-process fan-out → SSE.
  it.skipIf(!process.env.REDIS_URL)('pushes updated counts after a vote', async () => {
    const { poll, options } = await seedPublishedPoll({ options: ['A', 'B'] })
    const stream = await openStream(poll.shareCode)
    try {
      await stream.nextCounts() // consume the snapshot
      // Give the Redis SUBSCRIBE (fire-and-forget in subscribeToChannel) a moment to register,
      // otherwise the publish can race ahead of the subscription and the push is lost.
      await new Promise((r) => setTimeout(r, 300))

      const voteRes = await post('/vote', {
        shareCode: poll.shareCode,
        optionId: options[0]!.id,
        sessionKey: 'live-voter',
      })
      expect(voteRes.status).toBe(200)

      const pushed = await stream.nextCounts()
      expect(pushed[options[0]!.id]).toBe(1)
    } finally {
      stream.close()
    }
  })
})
