import Link from 'next/link'
import { Inbox, Plus } from 'lucide-react'
import { listPollsByUser } from '@poll-creator/db/queries'
import { requireSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PollRowActions } from '@/components/poll-row-actions'

export default async function DashboardPage() {
  const session = await requireSession()
  const polls = await listPollsByUser(db, session.user.id)

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your polls</h1>
        <Button asChild>
          <Link href="/polls/new">
            <Plus />
            New poll
          </Link>
        </Button>
      </div>

      {polls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="size-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <CardTitle>No polls yet</CardTitle>
              <CardDescription className="max-w-sm">
                Create your first poll to start collecting votes. You&apos;ll get a shareable link
                and results that update live.
              </CardDescription>
            </div>
            <Button asChild className="mt-1">
              <Link href="/polls/new">
                <Plus />
                Create a poll
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {polls.map((poll) => (
            <li key={poll.id}>
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{poll.question}</CardTitle>
                    <CardDescription>
                      Share link: <code className="text-xs">/p/{poll.shareCode}</code>
                    </CardDescription>
                  </div>
                  <Badge variant={poll.isPublished ? 'default' : 'secondary'}>
                    {poll.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/polls/${poll.id}/edit`}>Edit</Link>
                  </Button>
                  <PollRowActions pollId={poll.id} isPublished={poll.isPublished} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
