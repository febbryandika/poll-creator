import { PollForm } from '@/components/poll-form'

export default function NewPollPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">New poll</h1>
      <PollForm mode="create" />
    </div>
  )
}
