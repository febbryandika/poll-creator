import { requireSession } from '@/lib/auth'
import { SiteHeader } from '@/components/site-header'
import { Toaster } from '@/components/ui/sonner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession()

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <Toaster />
    </div>
  )
}
