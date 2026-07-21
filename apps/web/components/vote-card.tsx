'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import type { Option, Poll } from '@poll-creator/db/schema'
import { useHydrated } from '@/lib/use-hydrated'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const SESSION_KEY = 'poll_session_key'
const votedMarker = (shareCode: string) => `voted_${shareCode}`

function hasVoted(shareCode: string) {
  try {
    return !!localStorage.getItem(votedMarker(shareCode))
  } catch {
    return false
  }
}

function getSessionKey(): string {
  try {
    let key = localStorage.getItem(SESSION_KEY)
    if (!key) {
      key = nanoid(16)
      localStorage.setItem(SESSION_KEY, key)
    }
    return key
  } catch {
    return nanoid(16) // private mode: ephemeral key, the vote still works this session
  }
}

type Props = {
  poll: Pick<Poll, 'question' | 'shareCode'>
  options: Pick<Option, 'id' | 'text'>[]
}

export function VoteCard({ poll, options }: Props) {
  const hydrated = useHydrated()
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [isPending, startTransition] = useTransition()

  // Ensure a stable per-browser session key exists on mount.
  useEffect(() => {
    getSessionKey()
  }, [])

  // Client-only convenience: show results on return instead of the form.
  if (hydrated && hasVoted(poll.shareCode)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{poll.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">You&apos;ve already voted on this poll.</p>
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/p/${poll.shareCode}/results`}>View results</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected || isPending) return

    startTransition(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shareCode: poll.shareCode,
            optionId: selected,
            sessionKey: getSessionKey(),
          }),
        })

        if (!res.ok) {
          // SPEC §10 shape: { error: { code, message } }. Covers 400/403/410 alike.
          const body = (await res.json().catch(() => null)) as {
            error?: { code?: string; message?: string }
          } | null
          toast.error(body?.error?.message ?? 'Something went wrong. Please try again.')
          return
        }

        try {
          localStorage.setItem(votedMarker(poll.shareCode), '1')
        } catch {
          // ignore private-mode write failure; the redirect still shows live results
        }
        router.push(`/p/${poll.shareCode}/results`)
        router.refresh()
      } catch {
        toast.error('Network error — please check your connection and try again.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{poll.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <RadioGroup value={selected} onValueChange={setSelected} className="space-y-2">
            {options.map((o) => (
              <Label
                key={o.id}
                htmlFor={`opt-${o.id}`}
                className="has-data-[state=checked]:border-primary has-data-[state=checked]:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border p-4 font-normal"
              >
                <RadioGroupItem id={`opt-${o.id}`} value={o.id} />
                <span className="text-sm">{o.text}</span>
              </Label>
            ))}
          </RadioGroup>

          <Button type="submit" className="w-full sm:w-auto" disabled={!selected || isPending}>
            {isPending ? 'Voting…' : 'Vote'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
