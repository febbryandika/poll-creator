# API Reference

The app has three API surfaces:

- **Hono real-time API** (Bun, `:8787`) — public, no auth: cast votes and stream live results.
- **Poll CRUD** — Next.js **Server Actions** (not REST endpoints), auth-gated.
- **Auth** — Better Auth, mounted at `/api/auth/*` on the web app.

Base URL for the Hono API is `NEXT_PUBLIC_API_URL` (default `http://localhost:8787`).

## Error format

Every Hono endpoint returns errors in one shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "A human-readable message" } }
```

| Code               | HTTP | Meaning                                     |
| ------------------ | ---- | ------------------------------------------- |
| `VALIDATION_ERROR` | 400  | Bad request body or query params            |
| `UNAUTHORIZED`     | 401  | Not signed in (Server Actions)              |
| `FORBIDDEN`        | 403  | Poll not active, or not owned by the caller |
| `NOT_FOUND`        | 404  | Poll or route not found                     |
| `POLL_EXPIRED`     | 410  | Voting on an expired poll                   |
| `INTERNAL_ERROR`   | 500  | Unhandled server error (Hono API only)      |

Unmatched routes return `404 NOT_FOUND`; any unhandled throw returns `500 INTERNAL_ERROR`. Both keep
the shape above.

---

## Hono real-time API

### `GET /health`

Liveness check. No auth.

**200**

```json
{ "status": "ok", "service": "poll-creator-api", "timestamp": "2026-07-21T00:00:00.000Z" }
```

### `POST /vote`

Cast a vote. No auth. Deduped by the database `UNIQUE(poll_id, session_key)` constraint — a repeat
`sessionKey` on the same poll is a no-op.

**Request body**

```json
{ "shareCode": "abc123XYZ0", "optionId": "opt_…", "sessionKey": "…" }
```

All three fields are required, non-empty strings. `sessionKey` is a client-generated `nanoid(16)`
persisted in `localStorage`.

**200**

```json
{ "counts": { "opt_a": 3, "opt_b": 1 }, "voted": true }
```

`counts` maps every option id to its tally (options with zero votes are included). `voted` is `true`
if a new vote was recorded, `false` if the session had already voted.

**Errors**

| Status | Code               | When                                       |
| ------ | ------------------ | ------------------------------------------ |
| 400    | `VALIDATION_ERROR` | Malformed body, or option not in this poll |
| 403    | `FORBIDDEN`        | Poll missing or not published              |
| 410    | `POLL_EXPIRED`     | Poll's `expiresAt` is in the past          |

Publishing counts to Redis is **best-effort** — a Redis failure is logged but never fails the vote.

### `GET /results?shareCode=…`

Current vote counts (used for the initial load / fallback). No auth.

**200**

```json
{ "counts": { "opt_a": 3, "opt_b": 1 } }
```

**Errors:** `400 VALIDATION_ERROR` (missing `shareCode`), `404 NOT_FOUND` (missing or unpublished poll).

### `GET /stream?shareCode=…` (SSE)

Server-Sent Events stream of live vote counts. No auth. Validation (`400` / `404`) happens **before**
streaming starts, because once a `200` stream is committed the status can't change.

**Event protocol**

| `event:` | `data:`                               | When                                          |
| -------- | ------------------------------------- | --------------------------------------------- |
| `counts` | `{"opt_a":3,"opt_b":1}` (JSON string) | Once on connect (snapshot), then on each vote |
| `ping`   | `` (empty)                            | Every 20 s — keepalive                        |

Consume it with `EventSource` and listen for the `counts` event:

```ts
const es = new EventSource(`${API_URL}/stream?shareCode=${shareCode}`)
es.addEventListener('counts', (e) => setCounts(JSON.parse(e.data)))
```

On the server, one shared Redis subscriber per process fans a published message out to every
connected `/stream` client in-process; the last client to leave a channel unsubscribes.

---

## Poll CRUD — Next.js Server Actions

Defined in `apps/web/app/(app)/polls/actions.ts`. Each action calls `getServerSession()` and returns
`{ ok: false, error: { code, message }, fieldErrors? }` when unauthenticated or invalid, and every
mutating query is scoped by the owner's `userId`.

```ts
createPollAction(input: { question, options: string[], expiresAt? }): Promise<ActionResult>
updatePollAction(pollId: string, input): Promise<ActionResult>   // blocked once the poll has votes → FORBIDDEN
deletePollAction(pollId: string): Promise<ActionResult>          // cascades to options + votes
setPublishedAction(pollId: string, isPublished: boolean): Promise<ActionResult>
```

`create` / `update` redirect to `/dashboard` on success; `delete` / `setPublished` return `{ ok: true }`.
Validation uses the shared Zod `pollInputSchema` (non-empty question ≤ 280 chars, 2–6 non-empty
options, a future `expiresAt` if set).

## Auth — Better Auth

Mounted at `/api/auth/[...all]` on the web app (`toNextJsHandler(auth)`), exposing the standard Better
Auth routes — e.g. `POST /api/auth/sign-up/email`, `POST /api/auth/sign-in/email`,
`POST /api/auth/sign-out`, and the Google callback `/api/auth/callback/google`. Email/password has
`autoSignIn` enabled, so sign-up returns an authenticated session. The session cookie is
`better-auth.session_token`.
