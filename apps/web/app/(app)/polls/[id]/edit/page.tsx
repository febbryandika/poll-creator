import { notFound } from 'next/navigation'
import { getPollForOwner } from '@poll-creator/db/queries'
import { requireSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { PollForm } from '@/components/poll-form'

// datetime-local expects 'YYYY-MM-DDTHH:mm' in local time.
function toLocalInput(d: Date | null): string {
  if (!d) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default async function EditPollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()
  const poll = await getPollForOwner(db, { id, userId: session.user.id })
  if (!poll) notFound()

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Edit poll</h1>
      <PollForm
        mode="edit"
        pollId={poll.id}
        defaultValues={{
          question: poll.question,
          options: poll.options.map((o) => o.text),
          expiresAt: toLocalInput(poll.expiresAt),
        }}
      />
    </div>
  )
}
