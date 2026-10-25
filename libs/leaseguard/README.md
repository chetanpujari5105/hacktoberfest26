# LeaseGuard frontend + BFF

Next.js owns the UI and a thin BFF (`app/api/**`). The browser only ever calls these BFF routes;
the BFF calls FastAPI with `X-API-Key`. FastAPI, Temporal, JarvisLabs, the Telegram bot and MCP
live in the backend repo and are not touched here.

## Run it

```bash
cp .env.example .env.local   # fill in values; names only are committed
npm install
DEMO_MODE=true npm run dev   # http://localhost:3000/dashboard (PORT=3100 if 3000 is taken)
```

| Variable | Notes |
|---|---|
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_ID`, `GOOGLE_SECRET`, `MONGODB_URI` | NextAuth (Google + Prisma/MongoDB sessions) |
| `BACKEND_URL` | FastAPI base URL. Server-only — never `NEXT_PUBLIC_` |
| `BACKEND_API_KEY` | Sent as `X-API-Key`. Server-only |
| `DEMO_MODE` | `true` serves an in-memory demo store (`demo-store.ts`). Anything else = live; live mode never falls back to demo data |

`/dashboard` requires a signed-in session. Every BFF route also calls `auth()` itself
(`proxy.ts` treats `/api/*` as public).

## Layout

| Path | What |
|---|---|
| `libs/leaseguard/types.ts` | Frontend (camelCase) types + backend wire (snake_case) types |
| `libs/leaseguard/adapters.ts` | The only place snake_case → camelCase happens; tolerant of missing fields |
| `libs/leaseguard/backend.ts` | Server-only FastAPI client: timeout, error-code mapping, safe messages |
| `libs/leaseguard/bff.ts` | Session check, body validators, envelope helpers, `{route, code, status}` logging |
| `libs/leaseguard/demo-store.ts` | Demo data + time-based state machine (per server process) |
| `libs/leaseguard/actions.ts` | `getAllowedActions(run)` — uses `allowed_actions` when sent, else derives from status |
| `libs/leaseguard/format.ts`, `client.ts` | Formatters; browser fetch wrapper for BFF routes |
| `app/api/runs/**`, `app/api/wallet`, `app/api/instances/eligible`, `app/api/policies`, `app/api/telegram/status` | BFF routes |
| `app/dashboard/**` | Dashboard + run detail pages |
| `components/leaseguard/**`, `hooks/**` | Shared UI primitives, polling/toast hooks |

## Contract note for the backend (FastAPI)

Every FastAPI response must use the envelope below. The BFF re-wraps it for the browser as
`{success, data, error, meta: {demo, fetchedAt}}`.

```json
{ "success": true, "data": { }, "error": null }
{ "success": false, "data": null, "error": { "code": "CONFLICT", "message": "Run is already paused" } }
```

### Endpoints

| BFF route | FastAPI route | Body | Status |
|---|---|---|---|
| `GET /api/runs` | `GET /api/v1/runs` | — | AGREED |
| `POST /api/runs` | `POST /api/v1/runs` | `StartGuard` (below) | AGREED |
| `GET /api/runs/:id` | `GET /api/v1/runs/{id}` | — | AGREED |
| `POST /api/runs/:id/decide` | `POST /api/v1/runs/{id}/decide` | `{"action": "pause" \| "keep"}` | AGREED |
| `POST /api/runs/:id/extend` | `POST /api/v1/runs/{id}/extend` | `{"minutes": 5–240}` (integer) | AGREED |
| `POST /api/runs/:id/resume` | `POST /api/v1/runs/{id}/resume` | `{}` or `{"gpu_type": "A100-80GB"}` | AGREED |
| `GET /api/wallet` | `GET /api/v1/wallet` | — | AGREED |
| `GET /api/instances/eligible` | `GET /api/v1/instances/eligible` | — | PROPOSED |
| `GET /api/policies` | `GET /api/v1/policies` | — | PROPOSED |
| `GET /api/telegram/status` | `GET /api/v1/telegram/status` | — | PROPOSED |
| `POST /api/telegram/status` | — | — | Demo-only simulated link; 501 in live mode |

A 404 from a PROPOSED route is shown in the UI as "Not available yet" (`NOT_IMPLEMENTED`), not as an error.
`id` must match `^[A-Za-z0-9_-]{1,64}$`. `gpu_type` must be one of `config.leaseguard.gpuTypes`.

**StartGuard** (unknown keys are rejected by the BFF):

```json
{
  "machine_id": 41388,
  "policy": {
    "preset_id": "balanced",
    "check_interval_min": 5,
    "idle_threshold_pct": 10,
    "idle_window_min": 20,
    "reminder_timeout_min": 15,
    "on_no_response": "checkpoint_and_pause"
  }
}
```

Bounds: check 1–60, threshold 1–50, window 5–240, reminder 1–240, `on_no_response` ∈
`checkpoint_and_pause | notify_only`, `preset_id` optional.

### Run (returned by list, get, start, decide, extend, resume)

`GET /api/v1/runs` may return an array or `{"runs": [...]}`. Every field is optional; missing data
is shown as "Unavailable", never invented.

```json
{
  "id": "run_b41e90",
  "machine_id": 41102,
  "name": "sdxl-dreambooth-v3",
  "gpu_type": "RTX6000-Ada",
  "gpu_count": 1,
  "created_at": "2026-10-25T06:10:00Z",
  "started_at": "2026-10-25T06:12:00Z",
  "hourly_rate": 1.29,
  "status": "suspicious",
  "provider_status": "Running",
  "latest_probe": {
    "at": "2026-10-25T07:50:00Z",
    "gpu_util_pct": 3,
    "mem_used_mb": 20480,
    "mem_total_mb": 49152,
    "process_name": "python train.py",
    "process_status": "sleeping",
    "log_excerpt": "Epoch 4: waiting for dataloader..."
  },
  "probe_history": [{ "at": "2026-10-25T07:45:00Z", "gpu_util_pct": 4 }],
  "verdict": {
    "kind": "suspicious",
    "reason": "GPU under 10% for 25 min while the process is alive",
    "confidence": 0.82,
    "observed_at": "2026-10-25T07:50:00Z",
    "ai_explanation": "Looks like a dataloader stall.",
    "evidence": ["util < 10% for 25 min", "log stuck on dataloader"]
  },
  "policy": {
    "check_interval_min": 5,
    "idle_threshold_pct": 10,
    "idle_window_min": 20,
    "reminder_timeout_min": 15,
    "on_no_response": "checkpoint_and_pause",
    "next_check_at": "2026-10-25T07:55:00Z",
    "deadline_at": "2026-10-25T08:02:00Z",
    "last_decision": { "action": "extend", "at": "2026-10-25T07:00:00Z", "by": "user" }
  },
  "savings": {
    "estimated_compute_saved": 3.87,
    "actual_compute_saved": null,
    "currency": "USD",
    "period": "since guard started",
    "storage_cost_per_hour": 0.02
  },
  "timeline": [
    { "id": "ev_1", "at": "2026-10-25T07:47:00Z", "type": "telegram_sent", "title": "Reminder sent on Telegram", "detail": null }
  ],
  "allowed_actions": ["pause", "keep", "extend"]
}
```

- `status`: `running | suspicious | checkpointing | pausing | paused | resuming | failed | needs_attention` (unknown → `needs_attention`)
- `verdict.kind`: `healthy | suspicious | completed | unknown`
- `timeline[].type`: `guard_started | probe | verdict | telegram_sent | user_decision | checkpoint | paused | resumed | extended | savings | error`
- `allowed_actions` (PROPOSED): subset of `pause | keep | extend | resume | resume_other_gpu`. If omitted the
  UI derives them from `status` (`actions.ts`).
- Savings are always labelled *estimated*; the UI shows an actual figure only when `actual_compute_saved` is a number.

### Other responses

```json
// GET /api/v1/wallet
{ "balance": 42.18, "currency": "USD", "burn_rate_per_hour": 2.58, "as_of": "2026-10-25T07:50:00Z" }

// GET /api/v1/instances/eligible  (PROPOSED)
[{ "machine_id": 41388, "name": "yolov9-sweep-03", "gpu_type": "L4", "gpu_count": 1, "provider_status": "Running", "hourly_rate": 0.44 }]

// GET /api/v1/policies  (PROPOSED)
[{ "id": "balanced", "name": "Balanced", "description": "…", "check_interval_min": 5, "idle_threshold_pct": 10,
   "idle_window_min": 20, "reminder_timeout_min": 15, "on_no_response": "checkpoint_and_pause" }]

// GET /api/v1/telegram/status  (PROPOSED; link_url must be https)
{ "linked": false, "username": null, "link_url": "https://t.me/LeaseGuardBot?start=abc123" }
```

### Error codes

| HTTP from FastAPI | Code shown to the browser |
|---|---|
| 400 / 422 | `VALIDATION_ERROR` (upstream message passed through, ≤200 printable chars) |
| 401 / 403 | `UNAUTHORIZED` |
| 404 | `NOT_FOUND` (`NOT_IMPLEMENTED` for PROPOSED routes) |
| 409 | `CONFLICT` (upstream message passed through) — e.g. action not allowed in current state |
| 501 | `NOT_IMPLEMENTED` |
| 504 / timeout (8s) | `BACKEND_TIMEOUT` |
| other 5xx / bad JSON / wrong shape | `UPSTREAM_ERROR` (502) |
| connection refused | `BACKEND_UNREACHABLE` (502) |
| missing env | `BACKEND_MISCONFIGURED` (500) |

BFF-only codes: `UNAUTHORIZED` (no session, 401), `VALIDATION_ERROR` (bad body/id, 400), `NETWORK_ERROR` (browser offline).
All other upstream messages are replaced with fixed safe text; the API key and raw upstream bodies never reach the client or the logs.

## Open items

- **Security:** `auth.ts` logs the full OAuth `Account` object (access/refresh/id tokens) on sign-in. Remove those `console.log` lines before any shared deploy.
- `app/layout.tsx` default title, `README.md` and `package.json` name still say ShipNext.
- `next.config.ts` allows remote images from `hostname: "*"`; tighten it.
- Demo store is in-memory per server process (resets on restart; not shared across instances).
- Telegram linking in live mode depends on `link_url` from the PROPOSED status endpoint.
- Remaining UI polish: chart sizing via callback ref and x-tick dedupe, focus target after a run action, "Unavailable" wording in Policy/Savings cards, `callbackUrl` on the sign-in error state.
