import Link from 'next/link'
import { getServerSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { SignOutButton } from '@/components/sign-out-button'

export async function SiteHeader() {
  const session = await getServerSession()

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Poll Creator
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          {session?.user.email && (
            <span className="text-muted-foreground hidden px-2 text-sm sm:inline">
              {session.user.email}
            </span>
          )}
          <SignOutButton />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
