'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/error-state'

// Error boundary for the authenticated group (dashboard, polls/new, polls/[id]/edit).
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

  return <ErrorState description="We couldn't load this page. Please try again." onRetry={reset} />
}
