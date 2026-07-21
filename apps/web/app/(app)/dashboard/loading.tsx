import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Mirrors dashboard/page.tsx so the swap to real content is visually stable.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>
      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
