'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { deletePollAction, setPublishedAction } from '@/app/(app)/polls/actions'
import { Button } from '@/components/ui/button'

export function PollRowActions({ pollId, isPublished }: { pollId: string; isPublished: boolean }) {
  const [isPending, startTransition] = useTransition()

  const togglePublish = () =>
    startTransition(async () => {
      const res = await setPublishedAction(pollId, !isPublished)
      if (!res.ok) toast.error(res.error.message)
    })

  const remove = () => {
    if (!confirm('Delete this poll? This cannot be undone.')) return
    startTransition(async () => {
      const res = await deletePollAction(pollId)
      if (!res.ok) toast.error(res.error.message)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={togglePublish} disabled={isPending}>
        {isPublished ? 'Unpublish' : 'Publish'}
      </Button>
      <Button variant="destructive" size="sm" onClick={remove} disabled={isPending}>
        Delete
      </Button>
    </div>
  )
}
