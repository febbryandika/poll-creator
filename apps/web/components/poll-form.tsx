'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createPollAction, updatePollAction } from '@/app/(app)/polls/actions'
import { fieldErrorsFromZod } from '@/lib/errors'
import { MAX_OPTIONS, MIN_OPTIONS, pollInputSchema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  mode: 'create' | 'edit'
  pollId?: string
  defaultValues?: { question: string; options: string[]; expiresAt: string }
}

export function PollForm({ mode, pollId, defaultValues }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [question, setQuestion] = useState(defaultValues?.question ?? '')
  const [options, setOptions] = useState<string[]>(defaultValues?.options ?? ['', ''])
  const [expiresAt, setExpiresAt] = useState(defaultValues?.expiresAt ?? '')
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const setOption = (i: number, v: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)))
  const addOption = () => setOptions((prev) => (prev.length < MAX_OPTIONS ? [...prev, ''] : prev))
  const removeOption = (i: number) =>
    setOptions((prev) => (prev.length > MIN_OPTIONS ? prev.filter((_, idx) => idx !== i) : prev))

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const payload = { question, options, expiresAt: expiresAt || undefined }
    const parsed = pollInputSchema.safeParse(payload)
    if (!parsed.success) {
      setErrors(fieldErrorsFromZod(parsed.error))
      return
    }
    setErrors({})
    startTransition(async () => {
      const res =
        mode === 'create'
          ? await createPollAction(payload)
          : await updatePollAction(pollId!, payload)
      // On success the action redirects; a value only comes back on failure.
      if (res && !res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors)
        toast.error(res.error.message)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="question">Question</Label>
        <Input
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          aria-invalid={!!errors.question}
        />
        {errors.question?.map((m) => (
          <p key={m} className="text-destructive text-sm">
            {m}
          </p>
        ))}
      </div>

      <div className="space-y-3">
        <Label>Options</Label>
        {options.map((opt, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <Input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                aria-invalid={!!errors[`options.${i}`]}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove option ${i + 1}`}
                onClick={() => removeOption(i)}
                disabled={options.length <= MIN_OPTIONS}
              >
                ×
              </Button>
            </div>
            {errors[`options.${i}`]?.map((m) => (
              <p key={m} className="text-destructive text-sm">
                {m}
              </p>
            ))}
          </div>
        ))}
        {errors.options?.map((m) => (
          <p key={m} className="text-destructive text-sm">
            {m}
          </p>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOption}
          disabled={options.length >= MAX_OPTIONS}
        >
          Add option
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiresAt">Expires (optional)</Label>
        <Input
          id="expiresAt"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          aria-invalid={!!errors.expiresAt}
        />
        {errors.expiresAt?.map((m) => (
          <p key={m} className="text-destructive text-sm">
            {m}
          </p>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : mode === 'create' ? 'Create poll' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/dashboard')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
