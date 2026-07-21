import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { publicRoutes } from './routes/public'

const app = new Hono()

// CORS must run before routes; the browser preflights the JSON POST /vote.
app.use('*', cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' }))

// Liveness check for the SSE service (SPEC §9).
app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'poll-creator-api',
    timestamp: new Date().toISOString(),
  }),
)

app.route('/', publicRoutes)

export default {
  port: Number(process.env.PORT ?? 8787),
  fetch: app.fetch,
}
