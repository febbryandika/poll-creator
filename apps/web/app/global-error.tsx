'use client'

import { useEffect } from 'react'
import './globals.css'
import { ErrorState } from '@/components/error-state'

// Catches errors thrown in the root layout. It replaces the root layout when active,
// so it must render its own <html>/<body> and pull in global styles (Next 16 docs).
export default function GlobalError({
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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full font-sans antialiased">
        <ErrorState description="An unexpected error occurred. Please try again." onRetry={reset} />
      </body>
    </html>
  )
}
