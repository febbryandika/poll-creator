import { Skeleton } from '@/components/ui/skeleton'

// Mirrors the edit page heading + PollForm (question, two options, add-option, actions).
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <Skeleton className="h-8 w-36" />
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-7 w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  )
}
