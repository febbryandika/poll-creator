import { notFound } from 'next/navigation'
import { getPollWithOptions, getVoteCounts } from '@poll-creator/db/queries'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LiveResultsChart } from '@/components/live-results-chart'
import { ShareBox } from '@/components/share-box'

export const dynamic = 'force-dynamic'

export default async function ResultsPage({ params }: { params: Promise<{ shareCode: string }> }) {
  const { shareCode } = await params
  const poll = await getPollWithOptions(db, shareCode)
  if (!poll || !poll.isPublished) notFound()

  const counts = await getVoteCounts(db, poll.id)
  const data = poll.options.map((o) => ({ name: o.text, votes: counts[o.id] ?? 0 }))
  const total = data.reduce((sum, d) => sum + d.votes, 0)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{poll.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {total} {total === 1 ? 'vote' : 'votes'} so far
          </p>
          <LiveResultsChart data={data} />
        </CardContent>
      </Card>
      <ShareBox shareCode={poll.shareCode} />
    </div>
  )
}
