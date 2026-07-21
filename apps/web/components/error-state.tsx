import { Button } from '@/components/ui/button'

/**
 * Presentational fallback for the App Router error boundaries (error.tsx / global-error.tsx).
 * The boundary owns `console.error(error)` + `reset`; this just renders the message + retry.
 */
export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string
  description: string
  onRetry?: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-16 text-center">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground text-sm">{description}</p>
      {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
    </div>
  )
}
