'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useHydrated } from '@/lib/use-hydrated'

export type ResultDatum = { name: string; votes: number }

// Phase 6: `data` is the SSR-fetched snapshot (all zeros until Phase 7 votes exist).
// Phase 7 will pass live-updating counts (SSE) into the same prop.
export function LiveResultsChart({ data }: { data: ResultDatum[] }) {
  const hydrated = useHydrated()

  // ResponsiveContainer renders 0×0 on the server; hold a sized placeholder until hydrated.
  if (!hydrated) return <div className="h-72 w-full" aria-hidden />

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--popover-foreground)',
              fontSize: 12,
            }}
          />
          <Bar dataKey="votes" fill="var(--primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
