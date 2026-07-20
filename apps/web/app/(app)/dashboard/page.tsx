import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your polls</h1>
        <Button asChild>
          <Link href="/polls/new">New poll</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No polls yet</CardTitle>
          <CardDescription>
            Create your first poll to start collecting votes. You&apos;ll get a shareable link and
            results that update live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/polls/new">Create a poll</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
