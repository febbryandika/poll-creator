import { Hono } from 'hono'

const app = new Hono()

// Liveness check for the SSE service (SPEC §9).
app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'poll-creator-api',
    timestamp: new Date().toISOString(),
  }),
)

export default {
  port: Number(process.env.PORT ?? 8787),
  fetch: app.fetch,
}
