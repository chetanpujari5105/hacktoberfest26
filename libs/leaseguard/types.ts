/**
 * LeaseGuard frontend models (camelCase).
 * Backend JSON (snake_case) is converted into these in `adapters.ts` only.
 */

export const RUN_STATUSES = [
  "running",
  "suspicious",
  "checkpointing",
  "pausing",
  "paused",
  "resuming",
  "failed",
  "needs_attention",
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const VERDICT_KINDS = ["healthy", "suspicious", "completed", "unknown"] as const;
export type VerdictKind = (typeof VERDICT_KINDS)[number];

export const RUN_ACTIONS = ["pause", "keep", "extend", "resume", "resume_other_gpu"] as const;
export type RunAction = (typeof RUN_ACTIONS)[number];

export const TIMELINE_EVENT_TYPES = [
  "guard_started",
  "probe",
  "verdict",
  "telegram_sent",
  "user_decision",
  "checkpoint",
  "paused",
  "resumed",
  "extended",
  "savings",
  "error",
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export type NoResponseAction = "checkpoint_and_pause" | "notify_only";

export interface Verdict {
  kind: VerdictKind;
  reason: string;
  confidence?: number;
  observedAt: string;
  aiExplanation?: string;
  evidence?: string[];
}

export interface Probe {
  at: string;
  gpuUtilPct?: number;
  memUsedMb?: number;
  memTotalMb?: number;
  processName?: string;
  processStatus?: string;
  logExcerpt?: string;
}

export interface LeaseDecision {
  action: string;
  at: string;
  by: "user" | "policy";
}

export interface LeasePolicy {
  checkIntervalMin: number;
  idleThresholdPct: number;
  idleWindowMin: number;
  reminderTimeoutMin: number;
  onNoResponse: NoResponseAction;
  nextCheckAt?: string;
  deadlineAt?: string;
  lastDecision?: LeaseDecision;
}

export interface Savings {
  estimatedComputeSaved?: number;
  /** Only set when the backend sends an explicit actual figure. */
  actualComputeSaved?: number;
  currency: string;
  period?: string;
  storageCostPerHour?: number;
  isEstimate: true;
}

export interface TimelineEvent {
  id: string;
  at: string;
  type: TimelineEventType;
  title: string;
  detail?: string;
}

export interface Run {
  id: string;
  machineId: number;
  name: string;
  gpuType: string;
  gpuCount: number;
  createdAt: string;
  startedAt?: string;
  hourlyRate?: number;
  status: RunStatus;
  providerStatus?: string;
  latestProbe?: Probe;
  probeHistory?: Probe[];
  verdict?: Verdict;
  policy: LeasePolicy;
  savings?: Savings;
  timeline?: TimelineEvent[];
  allowedActions?: RunAction[];
}

export interface Wallet {
  balance: number;
  currency: string;
  burnRatePerHour?: number;
  asOf: string;
}

export interface EligibleInstance {
  machineId: number;
  name: string;
  gpuType: string;
  gpuCount: number;
  providerStatus?: string;
  hourlyRate?: number;
}

export interface PolicyPreset {
  id: string;
  name: string;
  description?: string;
  checkIntervalMin: number;
  idleThresholdPct: number;
  idleWindowMin: number;
  reminderTimeoutMin: number;
  onNoResponse: NoResponseAction;
}

export interface TelegramStatus {
  linked: boolean;
  username?: string;
  linkUrl?: string;
}

export const API_ERROR_CODES = [
  "UNAUTHORIZED",
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "NOT_IMPLEMENTED",
  "BACKEND_UNREACHABLE",
  "BACKEND_TIMEOUT",
  "BACKEND_MISCONFIGURED",
  "UPSTREAM_ERROR",
  "CONFLICT",
  "NETWORK_ERROR",
] as const;

export interface ApiError {
  code: string;
  message: string;
  status?: number;
}

export interface ApiMeta {
  demo: boolean;
  fetchedAt: string;
}

/** Envelope returned by every BFF route (and by FastAPI, minus `meta`). */
export type ApiEnvelope<T> =
  | { success: true; data: T; error: null; meta?: ApiMeta }
  | { success: false; data: null; error: ApiError; meta?: ApiMeta };

/* ------------------------------------------------------------------ */
/* Backend (FastAPI) wire shapes — snake_case, every field optional    */
/* except where the contract requires it. Adapters tolerate anything.  */
/* ------------------------------------------------------------------ */

export interface BackendProbe {
  at?: string;
  gpu_util_pct?: number | null;
  mem_used_mb?: number | null;
  mem_total_mb?: number | null;
  process_name?: string | null;
  process_status?: string | null;
  log_excerpt?: string | null;
}

export interface BackendVerdict {
  kind?: string;
  reason?: string;
  confidence?: number | null;
  observed_at?: string;
  ai_explanation?: string | null;
  evidence?: string[] | null;
}

export interface BackendPolicy {
  check_interval_min?: number;
  idle_threshold_pct?: number;
  idle_window_min?: number;
  reminder_timeout_min?: number;
  on_no_response?: string;
  next_check_at?: string | null;
  deadline_at?: string | null;
  last_decision?: { action?: string; at?: string; by?: string } | null;
}

export interface BackendSavings {
  estimated_compute_saved?: number | null;
  actual_compute_saved?: number | null;
  currency?: string;
  period?: string | null;
  storage_cost_per_hour?: number | null;
}

export interface BackendTimelineEvent {
  id?: string;
  at?: string;
  type?: string;
  title?: string;
  detail?: string | null;
}

export interface BackendRun {
  id?: string | number;
  machine_id?: number;
  name?: string | null;
  gpu_type?: string | null;
  gpu_count?: number | null;
  created_at?: string;
  started_at?: string | null;
  hourly_rate?: number | null;
  status?: string;
  provider_status?: string | null;
  latest_probe?: BackendProbe | null;
  probe_history?: BackendProbe[] | null;
  verdict?: BackendVerdict | null;
  policy?: BackendPolicy | null;
  savings?: BackendSavings | null;
  timeline?: BackendTimelineEvent[] | null;
  allowed_actions?: string[] | null;
}

export interface BackendWallet {
  balance?: number;
  currency?: string;
  burn_rate_per_hour?: number | null;
  as_of?: string;
}

export interface BackendEligibleInstance {
  machine_id?: number;
  name?: string | null;
  gpu_type?: string | null;
  gpu_count?: number | null;
  provider_status?: string | null;
  hourly_rate?: number | null;
}

export interface BackendPolicyPreset {
  id?: string;
  name?: string;
  description?: string | null;
  check_interval_min?: number;
  idle_threshold_pct?: number;
  idle_window_min?: number;
  reminder_timeout_min?: number;
  on_no_response?: string;
}

export interface BackendTelegramStatus {
  linked?: boolean;
  username?: string | null;
  link_url?: string | null;
}

/** Request bodies the BFF forwards to FastAPI. */
export interface StartGuardBody {
  machine_id: number;
  policy: {
    preset_id?: string;
    check_interval_min: number;
    idle_threshold_pct: number;
    idle_window_min: number;
    reminder_timeout_min: number;
    on_no_response: NoResponseAction;
  };
}
