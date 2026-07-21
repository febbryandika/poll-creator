import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-16 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Poll not found</h2>
      <p className="text-muted-foreground text-sm">
        This poll doesn&apos;t exist or is no longer available.
      </p>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  )
}
