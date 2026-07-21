'use client'

import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { useHydrated } from '@/lib/use-hydrated'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ShareBox({ shareCode }: { shareCode: string }) {
  const hydrated = useHydrated()
  const url = hydrated ? `${window.location.origin}/p/${shareCode}` : ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Could not copy — copy the link manually')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share this poll</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {url ? (
          <div className="rounded-lg bg-white p-3">
            <QRCodeSVG value={url} size={128} marginSize={0} title="Poll QR code" />
          </div>
        ) : (
          <div className="bg-muted size-[152px] rounded-lg" aria-hidden />
        )}
        <div className="flex w-full flex-col gap-2">
          <code className="bg-muted block w-full truncate rounded-md px-3 py-2 text-xs">
            {url || `/p/${shareCode}`}
          </code>
          <Button
            type="button"
            variant="outline"
            onClick={copy}
            disabled={!url}
            className="w-full sm:w-auto"
          >
            Copy link
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
