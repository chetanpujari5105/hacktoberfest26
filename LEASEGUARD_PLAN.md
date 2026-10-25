# LeaseGuard — Hackathon Plan

> **One-liner:** Idlefy and dstack stop your GPU on a timer. LeaseGuard uses Gemma 4 to work out whether your training is actually done, checkpoints it, pauses it, and hands the broken runs to Kepler to diagnose.
>
> **Pitch line:** "LeaseGuard saves money on runs that finished. Kepler fixes the ones that broke."

- **Timebox:** 2–3 hours
- **Sponsors / prizes:** Temporal · Jarvislabs · Gemma 4 · Kepler by RubixKube · DigitalOcean · Nudgebee (stretch)
- **Credits:** Jarvislabs **$40** · DigitalOcean **$5**
- **Base repo:** [chetanpujari5105/hacktoberfest26](https://github.com/chetanpujari5105/hacktoberfest26) (Next.js 16 scaffold)

---

## 1. Problem

Anyone who rents GPUs has left one running overnight and paid for hours of idle compute. Current fixes are blunt:

- Timers kill the machine whether or not the job is finished.
- Stopping a machine loses in-memory state, running processes and tmux sessions.
- A stalled or crashed run looks just like a finished one ("GPU at 0%"), so auto-stop tools hide bugs instead of surfacing them.
- On Jarvislabs, instances auto-pause when the wallet balance hits zero, and the FAQ warns that data can be permanently deleted at that point.

## 2. What already exists (and the gap)

| Tool | What it does | Gap |
|---|---|---|
| [Idlefy](https://idlefy.com/how-it-works/) (commercial) | Lease-based auto-stop, Slack/Telegram extend, MCP server | AWS/GCP only. Never infers that a job is done. Loses memory and processes when it stops a machine. |
| [dstack](https://dstack.ai/blog/inactivity-duration/) (OSS, [Jarvislabs-integrated](https://docs.jarvislabs.ai/dstack/)) | `inactivity_duration`, `max_duration`, `utilization_policy` | Config only. No chat approval, no reasoning, no checkpoint. |
| [SkyPilot autostop](https://docs.skypilot.co/en/stable/reference/auto-stop.html) | Stops a cluster after N idle minutes | Timer only. |
| [gpu-auto-shutdown](https://github.com/jordiferrero/gpu-auto-shutdown), [gpu_idle_alert](https://github.com/radaisystems/gpu_idle_alert) | Scripts that shut down or alert on an idle GPU | Each covers only part of the problem. |
| Jarvislabs built-in | `jl run` pauses the machine when its job finishes. Instances auto-pause at zero balance. | No idle detection. |

**Where LeaseGuard is different:**
1. **Gemma 4 looks at the loss curve.** A multimodal verdict (chart image + GPU stats + log tail) instead of a utilisation threshold.
2. **Finished runs get a different response from broken ones.** Finished → checkpoint and pause. Stalled or crashed → hand off to Kepler to find the cause.
3. **Checkpoints before it pauses.** No lost work.
4. **Resumes on a different (cheaper) GPU**, with one durable Temporal workflow covering the whole lifecycle.
5. **Wallet guard.** It checkpoints and pauses before the balance hits zero.

## 3. Sponsor mapping

| Sponsor | Role in LeaseGuard | Prize angle |
|---|---|---|
| **Temporal** | The core engine: crash-proof timers, retries for flaky SSH, waiting for a human decision through signals, and holding run state. The demo moment is killing the worker mid-run and showing it carry on. | "Make your agent durable" |
| **Jarvislabs** | The GPUs being managed (SDK pause/resume/balance, `jl exec`) **and** the host for the Gemma 4 endpoint. | Platform used two ways |
| **Gemma 4** | The decision-maker. It reads the loss-curve **image**, GPU stats and logs, and returns its decision as a **native function call** (`pause_run` / `keep_running` / `escalate_to_kepler`). | Image input + function calling + agentic role |
| **Kepler (RubixKube)** | The SRE that diagnoses **stalled or crashed** runs. You trigger it with `/triage <run>` in a shared Telegram group, and it investigates using our MCP tools plus `jl exec`. A hook also guards `jl create`. | Kepler doing actual SRE work, not just acting as a chat UI |
| **DigitalOcean** | Hosts the backend: a Droplet running FastAPI, the Temporal dev server, the worker, the Telegram bot and Caddy. | "Host your app or agent" |
| **Nudgebee** | Stretch goal: the FinOps angle (savings data feeds cost recommendations). Its runbooks also run on Temporal. | Pitch slide unless installed the night before |

---

## 4. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19, NextAuth (Google), daisyUI 5, Tailwind 4, zustand | Already in the scaffold. Hosted on Vercel (free). |
| Backend API | FastAPI + Pydantic v2, managed with `uv` | API, Telegram bot, MCP server |
| Workflow engine | Temporal + `temporalio` Python SDK | Dev server in Docker on the Droplet |
| Worker | Python + `jarvislabs` SDK + `jl` CLI + `matplotlib` | Activities run here. `matplotlib` renders the loss curve. |
| LLM | **Gemma 4** on a Jarvislabs **Serverless** endpoint (scale-to-zero), called with the `openai` client and a custom `base_url` | 31B, or the cheaper 26B A4B. Local fallback: Gemma 4 E4B on Ollama. |
| Chat | Telegram bot (`python-telegram-bot`) using long polling, in a **group shared with Kepler's bot** | Separate bot account from Kepler's |
| MCP | FastMCP mounted inside FastAPI at `/mcp` | Used by the Kepler plugin |
| Database | Temporal holds run state; MongoDB (Prisma, already in the scaffold) holds users and savings history | No separate run-state database |
| Hosting | **DigitalOcean Droplet** (Docker 1-Click, ~2 GB) + **Caddy** with `<ip>.sslip.io` for automatic HTTPS | See §8 |
| Demo payload | `demo/train.py`: a tiny trainer on the cheapest GPU. It logs loss, checkpoints when `ckpt.flag` appears, and can deliberately stall or OOM. | Reliable on-stage demo of both paths |

### Jarvislabs APIs used

```python
from jarvislabs import Client          # auth: JL_API_KEY env var
client = Client()
client.instances.get(machine_id)
client.instances.pause(machine_id)                      # async; status flips to Paused
inst = client.instances.resume(machine_id, gpu_type="A5000")  # may return a NEW machine_id
client.account.balance()                                # .balance, .grants
```

```bash
jl exec <machine_id> --json -- sh -lc 'nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader'
jl exec <machine_id> --json -- sh -lc 'tail -n 200 ~/train.log'
jl exec <machine_id> --json -- sh -lc 'touch ~/ckpt.flag'
```

### Gemma 4 judging call

- **Input:** loss-curve PNG (base64 image) + `nvidia-smi` output + process status + last 50 log lines.
- **Tools offered to Gemma:**
  - `pause_run(reason)`: training has converged or finished.
  - `keep_running(reason, recheck_minutes)`: still making progress.
  - `escalate_to_kepler(reason, symptom)`: stalled, NaN loss, OOM, or the process died.
- **Validation:** check the tool-call arguments with Pydantic. If the call is malformed, or rules and Gemma disagree, default to `keep_running` and notify a human.

---

## 5. Architecture

```
 Browser ──► Next.js on Vercel (NextAuth)
               │ HTTPS, with a shared API key header
               ▼
 ┌──────────── DigitalOcean Droplet (Docker Compose) ─────────────┐
 │  Caddy (TLS, <ip>.sslip.io)                                     │
 │     ▼                                                           │
 │  FastAPI  ◄── /mcp ──────────── Kepler plugin (on your laptop)  │
 │     │ start · signal · query                                    │
 │     ▼                                                           │
 │  Temporal dev server        Telegram bot (long poll) ◄──┐       │
 │     │ tasks                                             │       │
 │     ▼                                                   │       │
 │  Python Worker ── activities (each retried) ───────┐    │       │
 └────────────────────────────────────────────────────┼────┼───────┘
     probe:      jl exec → nvidia-smi + tail log      │    │
     judge:      render loss PNG → Gemma 4 ───────────┼──► Jarvislabs Serverless (Gemma 4)
     checkpoint: jl exec → touch ckpt.flag            │    │
     pause / resume / balance (jarvislabs SDK) ───────┼──► Jarvislabs GPU box (train.py)
     notify ──────────────────────────────────────────┘    │
                                                           ▼
                        Telegram group: LeaseGuard bot + Kepler bot + you
```

**Request flow:** the browser never calls FastAPI directly. Next.js route handlers check the NextAuth session, then forward to FastAPI over HTTPS with a `BACKEND_API_KEY` header.

### 5.1 `RunGuardWorkflow(machine_id, policy)`: one per training run

```
loop:
  probe = activity(probe)                       # retries automatically when SSH is flaky
  if rules(probe) say suspicious:               # e.g. GPU <5% for 10 min, loss flat, or process gone
      decision = activity(gemma_judge, probe)   # loss PNG + stats → a function call
      match decision:
        keep_running       → sleep(recheck_minutes); continue
        pause_run          → notify([Pause] [Keep 30m]); wait for "decide" signal (10 min timeout)
                             if Pause or timed out: checkpoint → pause → record savings
                                                    wait for "resume" signal (can be days)
                                                    machine_id = resume(gpu_type)   # may be a NEW id
        escalate_to_kepler → notify group "Run X looks <symptom>, /triage X"
                             state = NEEDS_TRIAGE   # DO NOT pause; keep the evidence alive
                             wait for "decide" signal (Kepler or a human closes it)
  sleep(probe_interval)
  start a fresh workflow history every N loops  # Temporal's continue_as_new
```

| Type | Name | Purpose |
|---|---|---|
| Signal | `decide(action)` | `pause` / `keep` / `resolved`, from Telegram, the dashboard or Kepler |
| Signal | `extend(minutes)` | Snooze the guard |
| Signal | `resume(gpu_type)` | Resume, optionally on a different GPU |
| Query | `get_state()` | What the dashboard reads: status, last probe, Gemma's verdict and reason, savings |

### 5.2 `WalletGuardWorkflow`: Temporal Schedule, every 10 min

- Read `account.balance()`.
- Below the warning threshold → send a Telegram alert.
- Below the critical threshold → signal every active `RunGuardWorkflow` to checkpoint and pause.

### 5.3 Kepler's investigation flow

1. LeaseGuard posts in the shared Telegram group: "Run 123 looks stalled (GPU 0%, process alive, no log output for 12 min). `/triage 123`"
2. You type `/triage 123`, which fires a **Kepler chat-trigger automation**.
3. Kepler calls our MCP tools (`get_run`, `get_logs`, `get_probe_history`), then proposes `jl exec` commands (`dmesg`, `py-spy dump`, `nvidia-smi`). You approve each one.
4. Kepler posts its diagnosis, e.g. "CUDA OOM at batch 64. Cut it to 32 and resume from ckpt-4000", and offers to call `decide(resolved)` or `resume`.

**MCP tools exposed to Kepler:** `list_runs`, `get_run`, `get_logs`, `get_probe_history`, `extend`, `pause_now`, `resume`, `resolve`.

**Kepler hook:** a hook on the `jl create` command warns, or auto-registers a guard, before any unguarded GPU is created.

> The chat triggers, hooks and Claude Code–format plugins all come from Kepler's release notes and haven't been tested. Try them in the first 20 minutes. **Fallback:** demo Kepler investigating on the laptop through the MCP server.

### 5.4 Rules to follow

- Do **all I/O inside activities** (SSH, API calls, Gemma calls, clock reads). Workflows use only `workflow.now()` and `workflow.sleep()`, because Temporal must be able to replay them identically.
- **Rules first, Gemma second.** Deterministic thresholds decide whether to call Gemma at all, which keeps endpoint costs down. Gemma decides *what kind* of idle it is.
- Never auto-pause an `escalate_to_kepler` run. You need the process alive to diagnose it.
- Always store the `machine_id` returned by `resume()`.
- Give long activities (checkpoint polling) heartbeats.

### 5.5 Provider interface (so the demo can't fail)

```
providers/base.py        → Protocol: probe, checkpoint, pause, resume, balance
providers/jarvislabs.py  → real SDK + jl exec
providers/fake.py        → scripted scenarios: converge | stall | oom
llm/gemma_remote.py      → Jarvislabs Serverless endpoint
llm/gemma_local.py       → Ollama gemma4:e4b
```

Switch with `PROVIDER=jarvislabs|fake` and `LLM=remote|local`. Build everything against `fake` + `local`, and spend credits only on integration tests and the rehearsal.

---

## 6. Repo layout

```
hacktoberfest26/
├── app/dashboard/page.tsx              # list of runs
├── app/dashboard/runs/[id]/page.tsx    # timeline, loss chart, Gemma verdict, actions
├── app/api/runs/route.ts               # forwards to FastAPI (adds the API key)
├── app/api/runs/[id]/[action]/route.ts
├── libs/backend.ts                     # typed fetch wrapper
├── backend/
│   ├── pyproject.toml  Dockerfile  docker-compose.yml  Caddyfile
│   ├── api/main.py  api/routes_runs.py  api/mcp.py  api/telegram_bot.py
│   ├── guard/workflows.py  guard/activities.py  guard/rules.py  guard/models.py  guard/chart.py
│   ├── llm/judge.py  llm/gemma_remote.py  llm/gemma_local.py  llm/tools.py
│   ├── providers/base.py  providers/jarvislabs.py  providers/fake.py
│   └── worker.py
├── kepler-plugin/
│   ├── .claude-plugin/plugin.json  .mcp.json
│   ├── commands/run-status.md  commands/triage.md
│   └── hooks/hooks.json                # guards the `jl create` command
└── demo/train.py                       # modes: --converge | --stall | --oom
```

> The repo's `.claude/rules/file-placement.md` forbids new top-level folders without approval. `backend/`, `kepler-plugin/` and `demo/` need to be signed off by the team.

### Backend API (FastAPI)

| Method | Path | Action |
|---|---|---|
| `GET` | `/api/v1/runs` | List guarded runs (queries Temporal) |
| `POST` | `/api/v1/runs` | Start `RunGuardWorkflow` for a `machine_id` |
| `GET` | `/api/v1/runs/{id}` | `get_state()` query |
| `GET` | `/api/v1/runs/{id}/logs` | Latest log tail + probe history |
| `POST` | `/api/v1/runs/{id}/decide` | Signal: pause / keep / resolved |
| `POST` | `/api/v1/runs/{id}/extend` | Signal: extend N minutes |
| `POST` | `/api/v1/runs/{id}/resume` | Signal: resume with optional `gpu_type` |
| `GET` | `/api/v1/wallet` | Current balance and thresholds |
| — | `/mcp` | FastMCP tools for Kepler |

All responses use one envelope: `{ success, data, error }`.

---

## 7. Environment variables

**Backend (`backend/.env` on the Droplet)**

```
JL_API_KEY=                 # Jarvislabs API token
LLM=remote                  # remote | local
LLM_BASE_URL=               # Jarvislabs Serverless endpoint URL (from the dashboard)
LLM_API_KEY=
LLM_MODEL=                  # Gemma 4 31B or 26B A4B
OLLAMA_URL=                 # local fallback, e.g. http://host.docker.internal:11434
TEMPORAL_ADDRESS=temporal:7233
TEMPORAL_NAMESPACE=default
TELEGRAM_BOT_TOKEN=         # separate bot from Kepler's channel
TELEGRAM_GROUP_ID=          # group shared with Kepler's bot
BACKEND_API_KEY=            # shared secret with Next.js
PUBLIC_HOST=                # <droplet-ip>.sslip.io
PROVIDER=jarvislabs         # or fake
```

**Frontend (`.env.local` + Vercel):** add `BACKEND_URL=https://<droplet-ip>.sslip.io` and `BACKEND_API_KEY`, and mirror both in `.env.example`.

---

## 8. Deployment on DigitalOcean

**Droplet:** Ubuntu with the **Docker 1-Click** image, basic plan, ~2 GB RAM (Temporal plus Python needs more than the smallest size). Billed hourly at a few cents, so the event is well within the **$5** credit.

**`docker-compose.yml` services:**

| Service | Image / command | Exposed |
|---|---|---|
| `caddy` | `caddy:2`, reverse proxy to `api:8000`, automatic TLS for `<ip>.sslip.io` | 80, 443 |
| `api` | `uvicorn api.main:app` | internal |
| `worker` | `python worker.py` | internal |
| `bot` | `python -m api.telegram_bot` (long poll) | none |
| `temporal` | `temporalio/temporal` → `temporal server start-dev --ip 0.0.0.0` | internal (UI through an SSH tunnel) |

**Steps:**
1. Create the Droplet and add a **Cloud Firewall** allowing only 22/80/443 inbound.
2. `git clone` the repo, copy `backend/.env`, then run `docker compose up -d --build`.
3. Install `jl` in the worker image. Register the Droplet's SSH public key with `jl ssh-key add` so `jl exec` works.
4. Check that `https://<ip>.sslip.io/api/v1/runs` responds, then set `BACKEND_URL` on Vercel.
5. Temporal UI for the demo: `ssh -L 8233:localhost:8233 root@<ip>`, then open `localhost:8233`.

**After the event:** destroy the Droplet. Droplets keep billing even when powered off.

---

## 9. Credit budget

| Credit | Spend on | Guardrails |
|---|---|---|
| **DigitalOcean $5** | One ~2 GB Droplet for the event | Destroy it afterwards |
| **Jarvislabs $40** | 1) The cheapest GPU for `demo/train.py`. 2) The Gemma 4 Serverless endpoint. | Pause the GPU box when you're not testing. Run Gemma **serverless with min workers = 0** and a short idle timeout, or use 26B A4B. Check the hourly price in the dashboard before deploying. Tear the endpoint down after each test session. Build against `fake` + local Ollama. |

> A forgotten Gemma endpoint can eat the $40 overnight, which is exactly the problem LeaseGuard exists to solve. Point WalletGuard at your own account while you build.

---

## 10. Scaffold fixes (do first, ~10 min)

- [ ] Remove the `console.log` lines in `auth.ts`. They print the full OAuth `Account`, including access and refresh tokens.
- [ ] Reconcile the database docs: `CLAUDE.md` says Postgres/SQLite, but `prisma/schema.prisma` uses MongoDB (`MONGODB_URI`).
- [ ] Remove the unrelated `VectorShip MVP — PRD.pdf`.
- [ ] Update `content.ts` and `config.ts` with LeaseGuard branding. Remove the Stripe plans if unused.

---

## 11. Build timeline (3 hours, 2 people)

| Time | Person A (backend) | Person B (frontend + Kepler + infra) |
|---|---|---|
| 0:00–0:45 | Temporal + worker + `FakeProvider` (converge/stall/oom) + `RunGuardWorkflow` | Scaffold fixes, create the Droplet, Compose + Caddy running, dashboard pages, `libs/backend.ts` |
| 0:45–1:30 | Gemma judging (loss PNG + function calling) with local Ollama, then switch to the Jarvislabs endpoint | Telegram bot + shared group wired to the signals. Test Kepler's plugin install and `/triage` chat trigger. |
| 1:30–2:15 | `JarvislabsProvider` (exec, checkpoint, pause, resume) + `demo/train.py` + `WalletGuardWorkflow` | Kepler plugin: FastMCP tools, `/triage` + `/run-status` commands, `jl create` hook |
| 2:15–3:00 | Deploy to the Droplet and rehearse both paths | Pitch slides (comparison table, sponsor map, Nudgebee FinOps slide) |

**Cut list if behind:** Wallet guard → resume on a different GPU → Kepler hook (keep the MCP tools + `/triage`) → Vercel (show the dashboard locally against the Droplet API).

---

## 12. Demo script (3 min)

1. **Hook (20s):** "Who here has left a GPU running overnight?" Show a bill screenshot.
2. **Start (20s):** Two runs on Jarvislabs: `train.py --converge` and `train.py --oom`. Both are registered with LeaseGuard.
3. **Durability (25s):** Kill the Temporal worker. Restart it. The Temporal UI shows both workflows carrying on.
4. **Gemma decides (35s):** Show the loss-curve image Gemma saw and its function call: `pause_run("plateaued at step 4k")` for run 1, `escalate_to_kepler("CUDA OOM")` for run 2.
5. **Finished path (30s):** Tap Pause in Telegram → checkpoint appears → instance shows `Paused` → savings counter goes up.
6. **Broken path (40s):** In the same Telegram group, type `/triage 2` → Kepler pulls the logs through MCP, proposes `dmesg`, and diagnoses "OOM at batch 64, cut it to 32 and resume from checkpoint".
7. **Close (10s):** "LeaseGuard saves money on runs that finished. Kepler fixes the ones that broke." Then the sponsor map and the DigitalOcean deployment.

---

## 13. Before the event

- [ ] Request **Kepler beta access** on RubixKube's Discord (gated).
- [ ] Find the **Jarvislabs Serverless** endpoint URL and check Gemma 4's hourly price. Confirm the $40 credit is in the wallet.
- [ ] Claim the **DigitalOcean $5** credit and check that you can create a Droplet. Create the SSH key.
- [ ] Create the **RubixKube console account** (needed for its MCP server).
- [ ] Create the **Telegram bot** with @BotFather, plus a group with both bots added.
- [ ] Run `ollama pull gemma4:e4b` on the dev laptops for the local fallback.
- [ ] Optional: run the **Nudgebee** Docker Compose quickstart the night before.
- [ ] Check early that a Claude Code–format plugin installs in Kepler and that chat triggers work. Fallback: Kepler on the laptop through the MCP server.

---

## 14. Sources

- Kepler: [v0.1.9-beta release notes](https://github.com/rubixkube-io/kepler-releases/releases/tag/v0.1.9-beta) · [RubixKube](https://rubixkube.ai/) · [rubixkube-for-ai (MCP)](https://github.com/rubixkube-io/rubixkube-for-ai)
- Jarvislabs: [SDK](https://docs.jarvislabs.ai/sdk) · [CLI](https://docs.jarvislabs.ai/cli/) · [FAQ](https://docs.jarvislabs.ai/faqs/) · [Beyond GPU rental](https://jarvislabs.ai/blog/jarvislabs-beyond-gpu-rental)
- Gemma 4: [Overview](https://www.mindstudio.ai/blog/what-is-gemma-4-google-open-weight-model) · [Ollama](https://registry.ollama.ai/library/gemma4) · [Gemini API guide](https://www.philschmid.de/gemma-4-gemini-api)
- DigitalOcean: [Serverless inference docs](https://docs.digitalocean.com/products/inference-hub/how-to/use-serverless-inference-hub/)
- Temporal: [Durable AI](https://docs.temporal.io/ai.md) · [MCP & A2A hackathon](https://learn.temporal.io/community_programs/hackathons/ai_mcp_hackathon)
- Nudgebee: [GitHub](https://github.com/nudgebee/nudgebee) · [Hands-on (Kubesimplify)](https://blog.kubesimplify.com/nudgebee-ai-sre-copilot-hands-on)
- Prize criteria (similar categories): [Hacktoberfest DEV challenge](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)
- Prior art: [Idlefy](https://idlefy.com/how-it-works/) · [dstack inactivity](https://dstack.ai/blog/inactivity-duration/) · [SkyPilot autostop](https://docs.skypilot.co/en/stable/reference/auto-stop.html)
- Winning patterns: [Hacktoberfest weekend winners (PaidYet, Temporal)](https://dev.to/devteam/congrats-to-the-hacktoberfest-weekend-challenge-build-for-a-friend-winners-pgc) · [Ideas that won in 2026](https://blogs.reskilll.com/hackathon-ideas-that-won-2026-judges-actually-pick-examples/)
