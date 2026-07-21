'use client'

import { useEffect, useState } from 'react'

export type LiveStatus = 'connecting' | 'live' | 'reconnecting'

/**
 * Subscribe to a poll's live counts via SSE. Seeded with the SSR snapshot so the
 * chart is correct before the socket opens. EventSource auto-reconnects, so we only
 * reflect connection state and never close on error — close() runs once, on unmount,
 * which is what prevents duplicate / leaked connections.
 */
export function useLiveResults(shareCode: string, initialCounts: Record<string, number>) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts)
  const [status, setStatus] = useState<LiveStatus>('connecting')

  useEffect(() => {
    const es = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/stream?shareCode=${encodeURIComponent(shareCode)}`,
    )

    es.addEventListener('counts', (e) => {
      setCounts(JSON.parse((e as MessageEvent).data))
    })
    es.onopen = () => setStatus('live')
    es.onerror = () => setStatus('reconnecting') // transient; EventSource retries itself

    return () => es.close()
  }, [shareCode])

  return { counts, status }
}
