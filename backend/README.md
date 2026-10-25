# LeaseGuard backend

FastAPI + Temporal worker + Telegram bot. Watches GPU training runs on Jarvislabs, asks
**Gemma 4** to judge them, **checkpoints and pauses** finished runs, and hands broken runs
to **Kepler** via `/triage`. See `../LEASEGUARD_PLAN.md` for the full design.

```
api/        FastAPI routes (/api/v1), MCP server (/mcp), API-key middleware, Telegram bot
guard/      models, rules, Temporal workflows + activities, RunService, notifications
llm/        Gemma 4 judge (loss-curve image + function calling), tool schemas, endpoint check
providers/  GpuProvider interface: jarvislabs (SDK + `jl exec`) and fake (scripted demo)
worker.py   Temporal worker (also starts the wallet-guard workflow)
```

## Quick start (fake GPUs, no credits)

```bash
cp .env.example .env
# set BACKEND_API_KEY=$(openssl rand -hex 32), LLM=off (or JL_API_KEY for Gemma),
# PROBE_INTERVAL_S=5 and DECISION_TIMEOUT_S=30 for a fast demo
docker compose up -d --build temporal api worker
```

Then guard the three scripted runs (`FAKE_SCENARIOS=101=converge,102=oom,103=stall`):

```bash
H="X-API-Key: $(grep ^BACKEND_API_KEY .env | cut -d= -f2)"
for id in 101 102 103; do
  curl -s -X POST localhost:8000/api/v1/runs -H "$H" -H 'content-type: application/json' \
       -d "{\"machine_id\": $id, \"name\": \"demo-$id\"}"; echo
done
curl -s localhost:8000/api/v1/runs -H "$H"
```

Within about a minute: 101 is `awaiting_decision` (converged), 102 and 103 are `needs_triage`.
The Temporal UI is at http://localhost:8233.

**Durability demo:** `docker compose kill worker`, approve with
`curl -X POST .../runs/run-101/decide -d '{"action":"pause"}'`, then `docker compose start worker`.
The pause still happens. While the worker is down, the API serves the last known state with
`"stale": true` and the dashboard shows "worker offline".

## Real Jarvislabs demo

1. `.env`: `PROVIDER=jarvislabs`, `JL_API_KEY=...`, `LLM=remote` (Gemma 4 via
   `https://models.jarvislabs.net/v1`, model `gemma-4-31b-it`, authenticated with `JL_API_KEY`).
2. Check Gemma once (makes **one** paid request; reports native tool call vs JSON fallback):
   `uv run python -m llm.check`
3. SSH is already set up: `secrets/ssh/id_ed25519` (mode 600, gitignored) is registered with
   Jarvislabs as `leaseguard-worker`, and the laptop's `~/.ssh/id_ed25519.pub` as `laptop`. The
   worker mounts `secrets/ssh` as `/root/.ssh` for `jl exec`. Check with `jl ssh-key list`.
4. Demo box: `leaseguard-demo`, machine id `546501` (1x A30, IN2, on-demand, 20 GB, ₹38.88/hr).
   It is kept **paused**; resume it, start the trainer, and pause it again when done:
   ```bash
   jl resume 546501 --yes                     # prints the machine id; it may change
   jl upload <machine_id> ../demo/train.py
   jl exec <machine_id> -- sh -lc 'nohup python ~/train.py --converge >/dev/null 2>&1 &'
   jl pause <machine_id> --yes
   ```
   Use `--oom` or `--stall` for the broken path, and `--resume` to continue from `~/ckpt.pt`.
   The box runs Python 3.10, so `demo/train.py` must stay 3.10-compatible.
5. Guard it: `POST /api/v1/runs {"machine_id": <id>, "name": "...", "hourly_cost_inr": 38.88}`.

`jl pause`, `jl resume`, `jl create` and `jl destroy` stop at a `[y/N]` prompt unless you pass
`--yes`, which hangs scripts and agents. `jl exec` never prompts. The backend pauses and resumes
through the SDK, so it is not affected.

All money is in **INR**, the Jarvislabs wallet currency (`jl gpus` lists ₹/hr). Savings use the
run's `hourly_cost_inr`, or `DEFAULT_HOURLY_COST_INR` (the A30 rate) when it is omitted. The
wallet guard warns below `WALLET_WARN_INR` (₹800) and pauses everything below
`WALLET_CRITICAL_INR` (₹250).

## Deploy on a DigitalOcean Droplet

Docker 1-Click Droplet (~2 GB). Cloud Firewall: inbound 22/80/443 only.

```bash
git clone <repo> && cd hacktoberfest26/backend
cp .env.example .env   # fill in; PUBLIC_HOST=<droplet-ip>.sslip.io
docker compose --profile public --profile telegram up -d --build
```

Caddy gets a Let's Encrypt certificate for `https://<droplet-ip>.sslip.io`. Set the Vercel env vars
`BACKEND_URL=https://<droplet-ip>.sslip.io` and `BACKEND_API_KEY`. Temporal UI:
`ssh -L 8233:localhost:8233 root@<droplet-ip>`. **Destroy the Droplet after the event**:
powered-off Droplets still bill.

## Telegram + Kepler

Create a bot with @BotFather, add it and Kepler's bot to one group, set `TELEGRAM_BOT_TOKEN` and
`TELEGRAM_GROUP_ID`, and start with `--profile telegram`. LeaseGuard posts decisions with buttons.
Broken runs end with `Kepler: /triage run-<id>`, which Kepler picks up with the plugin in
`../kepler-plugin` (MCP at `https://<host>/mcp/`, header `X-API-Key`).

## Development

```bash
uv sync
uv run pytest -q --cov          # 108 tests; workflow tests use Temporal's test server
uv run ruff check . && uv run ruff format --check .
uv run python worker.py         # needs Temporal on localhost:7233
uv run uvicorn api.main:build --factory --reload
```
