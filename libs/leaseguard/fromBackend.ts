/**
 * Bridges the LeaseGuard FastAPI run shape (backend/guard/service.py RunView) to
 * the wire shape documented in README.md, so `adapters.ts` stays the single
 * camelCase boundary. Payloads that already use the README shape pass through.
 */

type Loose = Record<string, unknown>;

const isObject = (v: unknown): v is Loose =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const STATUS: Record<string, string> = {
  watching: "running",
  awaiting_decision: "suspicious",
  checkpointing: "checkpointing",
  paused: "paused",
  resuming: "resuming",
  needs_triage: "needs_attention",
  stopped: "failed",
};

const VERDICT: Record<string, string> = {
  pause_run: "completed",
  keep_running: "healthy",
  escalate_to_kepler: "suspicious",
};

const EVENT: Record<string, string> = {
  started: "guard_started",
  verdict: "verdict",
  decision: "user_decision",
  resolved: "user_decision",
  checkpoint: "checkpoint",
  paused: "paused",
  resumed: "resumed",
  warning: "error",
  stopped: "error",
};

const ACTIONS: Record<string, string[]> = {
  watching: ["pause", "extend"],
  awaiting_decision: ["pause", "keep", "extend"],
  needs_triage: ["pause", "keep"],
  paused: ["resume", "resume_other_gpu"],
};

const LOG_EXCERPT_LINES = 20;

function convertProbe(p: unknown): Loose | undefined {
  if (!isObject(p)) return undefined;
  const log = typeof p.log_tail === "string" ? p.log_tail : "";
  return {
    at: p.at,
    gpu_util_pct: p.gpu_util_pct,
    mem_used_mb: p.gpu_mem_mb,
    process_name: "python train.py",
    process_status: p.process_alive === false ? "exited" : "running",
    log_excerpt: log.split("\n").slice(-LOG_EXCERPT_LINES).join("\n") || undefined,
  };
}

function convertVerdict(v: unknown): Loose | undefined {
  if (!isObject(v)) return undefined;
  const fromGemma = v.source === "gemma";
  const evidence = [
    typeof v.symptom === "string" ? `symptom: ${v.symptom}` : undefined,
    fromGemma ? "judged by Gemma 4 from the loss curve, GPU stats and logs" : "rules fallback",
  ].filter(Boolean);
  return {
    kind: VERDICT[String(v.action)] ?? "unknown",
    reason: v.reason,
    observed_at: v.at,
    ai_explanation: fromGemma ? v.reason : undefined,
    evidence,
  };
}

function convertEvents(events: unknown): Loose[] | undefined {
  if (!Array.isArray(events)) return undefined;
  return events.filter(isObject).map((e, i) => ({
    id: `ev_${i}`,
    at: e.at,
    type: EVENT[String(e.kind)] ?? "probe",
    title: e.message,
  }));
}

/** True for the FastAPI RunView shape (it identifies runs by `run_id`). */
function isBackendRun(raw: Loose): boolean {
  return typeof raw.run_id === "string" && raw.id === undefined;
}

export function normalizeBackendRun(raw: unknown): unknown {
  if (!isObject(raw) || !isBackendRun(raw)) return raw;
  const status = String(raw.status);
  const probes = Array.isArray(raw.probes) ? raw.probes : [];
  return {
    id: raw.run_id,
    machine_id: raw.machine_id,
    name: raw.name,
    gpu_type: raw.gpu_type ?? undefined,
    gpu_count: 1,
    created_at: raw.started_at,
    started_at: raw.started_at,
    hourly_rate: raw.hourly_cost_inr,
    status: STATUS[status] ?? "needs_attention",
    provider_status: raw.stale ? "Worker offline" : status === "paused" ? "Paused" : "Running",
    latest_probe: convertProbe(raw.last_probe),
    probe_history: probes.filter(isObject).map((p) => ({ at: p.at, gpu_util_pct: p.gpu_util_pct })),
    verdict: convertVerdict(raw.last_verdict),
    savings: {
      estimated_compute_saved: raw.live_savings_inr,
      currency: "INR",
      period: "since guard started",
    },
    timeline: convertEvents(raw.events),
    allowed_actions: ACTIONS[status] ?? [],
  };
}
