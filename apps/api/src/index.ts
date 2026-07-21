import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { publicRoutes } from './routes/public'
import { fail } from './lib/errors'
import { logger, serializeError } from './lib/logger'

const app = new Hono()

// Correlate each request: sets c.get('requestId') + an X-Request-Id header, so a
// `request` log line and any `unhandled_error` line for the same request share an id.
app.use('*', requestId())

// Structured access log (SPEC §9): one JSON line per request. Runs before CORS so
// preflights are logged too; `await next()` lets it read the final status + duration.
app.use('*', async (c, next) => {
  const start = performance.now()
  await next()
  logger.info('request', {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Math.round(performance.now() - start),
    requestId: c.get('requestId'),
  })
})

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

// Every response carries the SPEC §10 shape { error: { code, message } } — including
// unmatched routes and unexpected throws (which would otherwise be Hono's bare 500).
app.notFound((c) => fail(c, 'NOT_FOUND', 'Not found'))

app.onError((err, c) => {
  logger.error('unhandled_error', {
    err: serializeError(err),
    method: c.req.method,
    path: c.req.path,
    requestId: c.get('requestId'),
  })
  return fail(c, 'INTERNAL_ERROR', 'Something went wrong')
})

export default {
  port: Number(process.env.PORT ?? 8787),
  fetch: app.fetch,
}
