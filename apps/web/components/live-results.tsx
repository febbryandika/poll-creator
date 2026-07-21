'use client'

import { useLiveResults, type LiveStatus } from '@/lib/use-live-results'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LiveResultsChart } from '@/components/live-results-chart'

type Props = {
  shareCode: string
  question: string
  options: { id: string; text: string }[]
  initialCounts: Record<string, number>
}

export function LiveResults({ shareCode, question, options, initialCounts }: Props) {
  const { counts, status } = useLiveResults(shareCode, initialCounts)

  // Map live counts onto the poll's option order; unseen option ids default to 0.
  const data = options.map((o) => ({ name: o.text, votes: counts[o.id] ?? 0 }))
  const total = data.reduce((sum, d) => sum + d.votes, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{question}</span>
          <LiveBadge status={status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {total} {total === 1 ? 'vote' : 'votes'} so far
        </p>
        {/* Recharts animates the bars on each data change automatically. */}
        <LiveResultsChart data={data} />
      </CardContent>
    </Card>
  )
}

function LiveBadge({ status }: { status: LiveStatus }) {
  const label =
    status === 'live' ? 'Live' : status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'
  const dot =
    status === 'live'
      ? 'bg-green-500'
      : status === 'reconnecting'
        ? 'bg-amber-500'
        : 'bg-muted-foreground'
  return (
    <span
      role="status"
      className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-normal"
    >
      <span
        className={`h-2 w-2 rounded-full ${dot} ${status === 'live' ? 'animate-pulse' : ''}`}
        aria-hidden
      />
      {label}
    </span>
  )
}
