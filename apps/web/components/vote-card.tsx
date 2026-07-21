'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { nanoid } from 'nanoid'
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

type Props = {
  poll: Pick<Poll, 'question' | 'shareCode'>
  options: Pick<Option, 'id' | 'text'>[]
}

export function VoteCard({ poll, options }: Props) {
  const hydrated = useHydrated()
  const [selected, setSelected] = useState('')
  // Phase 6 stub flag. Phase 7 replaces this with the Hono POST + marker + redirect.
  const [submitted, setSubmitted] = useState(false)

  // Ensure a stable per-browser session key exists (write-only; used when voting in Phase 7).
  useEffect(() => {
    try {
      if (!localStorage.getItem(SESSION_KEY)) {
        localStorage.setItem(SESSION_KEY, nanoid(16))
      }
    } catch {
      // localStorage blocked (private mode) — degrade gracefully.
    }
  }, [])

  // Convenience marker (client-only): show results on return instead of the form.
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
    if (!selected) return
    // Phase 7: POST `${NEXT_PUBLIC_API_URL}/vote` { shareCode, optionId, sessionKey };
    // on success set localStorage.setItem(votedMarker(shareCode), '1') and push results.
    setSubmitted(true) // Phase 6 stub: no write, no navigation.
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

          <Button type="submit" className="w-full sm:w-auto" disabled={!selected || submitted}>
            Vote
          </Button>

          {submitted && (
            <p
              role="status"
              className="border-primary/30 bg-muted/50 text-muted-foreground rounded-lg border p-3 text-sm"
            >
              Live voting opens soon — check back shortly. You can still{' '}
              <Link href={`/p/${poll.shareCode}/results`} className="underline underline-offset-4">
                view results
              </Link>
              .
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
