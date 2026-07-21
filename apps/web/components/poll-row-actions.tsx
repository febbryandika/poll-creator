'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deletePollAction, setPublishedAction } from '@/app/(app)/polls/actions'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function PollRowActions({ pollId, isPublished }: { pollId: string; isPublished: boolean }) {
  // Separate transitions so each button shows its own pending state independently.
  const [publishPending, startPublish] = useTransition()
  const [deletePending, startDelete] = useTransition()

  const togglePublish = () =>
    startPublish(async () => {
      const res = await setPublishedAction(pollId, !isPublished)
      if (res.ok) toast.success(isPublished ? 'Poll unpublished' : 'Poll published')
      else toast.error(res.error.message)
    })

  const remove = () =>
    startDelete(async () => {
      const res = await deletePollAction(pollId)
      if (res.ok) toast.success('Poll deleted')
      else toast.error(res.error.message)
    })

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={togglePublish} disabled={publishPending}>
        {publishPending
          ? isPublished
            ? 'Unpublishing…'
            : 'Publishing…'
          : isPublished
            ? 'Unpublish'
            : 'Publish'}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={deletePending}>
            <Trash2 />
            {deletePending ? 'Deleting…' : 'Delete'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this poll?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the poll and all of its votes. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={remove}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
