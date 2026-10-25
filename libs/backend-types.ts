/**
 * Shared types for the LeaseGuard FastAPI backend contract.
 * Safe to import from both server and client code (types only).
 */

export type RunStatus =
  | "watching"
  | "awaiting_decision"
  | "checkpointing"
  | "paused"
  | "resuming"
  | "needs_triage"
  | "stopped";

export type VerdictAction = "pause_run" | "keep_running" | "escalate_to_kepler";

export interface Probe {
  at: string;
  gpu_util_pct: number;
  gpu_mem_mb: number;
  process_alive: boolean;
  losses: number[];
  log_tail: string;
  seconds_since_log: number;
  error_hint: string | null;
}

export interface ProbeSummary {
  at: string;
  gpu_util_pct: number;
  process_alive: boolean;
  last_loss: number | null;
}

export interface Verdict {
  action: VerdictAction;
  reason: string;
  symptom: string | null;
  recheck_minutes: number | null;
  source: "gemma" | "rules";
  at: string;
}

export interface RunEvent {
  at: string;
  kind: string;
  message: string;
}

export interface RunView {
  run_id: string;
  machine_id: number;
  name: string;
  status: RunStatus;
  gpu_type: string | null;
  hourly_cost_inr: number;
  savings_inr: number;
  live_savings_inr: number;
  paused_at: string | null;
  started_at: string;
  last_probe: Probe | null;
  last_verdict: Verdict | null;
  probes: ProbeSummary[];
  events: RunEvent[];
  /** True when the backend served cached state because the worker is down. */
  stale?: boolean;
}

export interface Wallet {
  balance: number;
  warn_threshold: number;
  critical_threshold: number;
}

export interface StartRunInput {
  machine_id: number;
  name: string;
  gpu_type?: string | null;
  hourly_cost_inr?: number;
}

export type RunAction = "decide" | "extend" | "resume" | "stop";

export interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}
