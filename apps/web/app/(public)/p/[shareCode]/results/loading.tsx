import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ResultsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
