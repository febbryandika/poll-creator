'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onSignOut() {
    setPending(true)
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={onSignOut} disabled={pending}>
      Sign out
    </Button>
  )
}
