'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-16 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
      <p className="text-muted-foreground text-sm">
        We couldn&apos;t load this poll. Please try again.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  )
}
