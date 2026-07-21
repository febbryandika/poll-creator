import { notFound } from 'next/navigation'
import { getPollWithOptions, getVoteCounts } from '@poll-creator/db/queries'
import { db } from '@/lib/db'
import { LiveResults } from '@/components/live-results'
import { ShareBox } from '@/components/share-box'

export const dynamic = 'force-dynamic'

export default async function ResultsPage({ params }: { params: Promise<{ shareCode: string }> }) {
  const { shareCode } = await params
  const poll = await getPollWithOptions(db, shareCode)
  if (!poll || !poll.isPublished) notFound()

  // Initial snapshot (also the no-JS fallback); the client hook takes over live.
  const counts = await getVoteCounts(db, poll.id)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <LiveResults
        shareCode={poll.shareCode}
        question={poll.question}
        options={poll.options.map((o) => ({ id: o.id, text: o.text }))}
        initialCounts={counts}
      />
      <ShareBox shareCode={poll.shareCode} />
    </div>
  )
}
