import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPollWithOptions } from '@poll-creator/db/queries'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShareBox } from '@/components/share-box'
import { VoteCard } from '@/components/vote-card'

// Public poll data changes on publish/expiry (and on votes in Phase 7); never cache.
export const dynamic = 'force-dynamic'

export default async function VotePage({ params }: { params: Promise<{ shareCode: string }> }) {
  const { shareCode } = await params
  const poll = await getPollWithOptions(db, shareCode)

  // Unknown code or an unpublished draft → 404 (don't leak draft existence).
  if (!poll || !poll.isPublished) notFound()

  const isExpired = poll.expiresAt !== null && poll.expiresAt < new Date()

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      {isExpired ? (
        <Card>
          <CardHeader>
            <CardTitle>{poll.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              This poll has closed and is no longer accepting votes.
            </p>
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/p/${poll.shareCode}/results`}>View results</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <VoteCard
          poll={{ question: poll.question, shareCode: poll.shareCode }}
          options={poll.options}
        />
      )}
      <ShareBox shareCode={poll.shareCode} />
    </div>
  )
}
