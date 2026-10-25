import {
  RUN_ACTIONS,
  RUN_STATUSES,
  TIMELINE_EVENT_TYPES,
  VERDICT_KINDS,
  type EligibleInstance,
  type LeasePolicy,
  type NoResponseAction,
  type PolicyPreset,
  type Probe,
  type Run,
  type RunAction,
  type RunStatus,
  type Savings,
  type TelegramStatus,
  type TimelineEvent,
  type TimelineEventType,
  type Verdict,
  type VerdictKind,
  type Wallet,
} from "@/libs/leaseguard/types";
import { normalizeBackendRun } from "@/libs/leaseguard/fromBackend";

/**
 * The ONLY place backend snake_case JSON becomes frontend camelCase.
 * Every adapter takes `unknown` (the Backend* wire types in types.ts document
 * the expected shape) and tolerates missing/null fields and unknown enums.
 */

type Loose = Record<string, unknown>;

const isObject = (v: unknown): v is Loose =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

const iso = (v: unknown): string | undefined => {
  const s = str(v);
  return s && !Number.isNaN(Date.parse(s)) ? s : undefined;
};

const oneOf = <T extends string>(list: readonly T[], v: unknown): T | undefined =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined;

const EPOCH = new Date(0).toISOString();

/** Unknown backend statuses map to `needs_attention`, never a crash. */
export function adaptStatus(v: unknown): RunStatus {
  return oneOf(RUN_STATUSES, v) ?? "needs_attention";
}

export function adaptVerdictKind(v: unknown): VerdictKind {
  return oneOf(VERDICT_KINDS, v) ?? "unknown";
}

function adaptNoResponse(v: unknown): NoResponseAction {
  return v === "checkpoint_and_pause" ? "checkpoint_and_pause" : "notify_only";
}

export function adaptProbe(raw: unknown): Probe | undefined {
  if (!isObject(raw)) return undefined;
  const at = iso(raw.at);
  if (!at) return undefined;
  return {
    at,
    gpuUtilPct: num(raw.gpu_util_pct),
    memUsedMb: num(raw.mem_used_mb),
    memTotalMb: num(raw.mem_total_mb),
    processName: str(raw.process_name),
    processStatus: str(raw.process_status),
    logExcerpt: str(raw.log_excerpt),
  };
}

export function adaptVerdict(raw: unknown): Verdict | undefined {
  if (!isObject(raw)) return undefined;
  const confidence = num(raw.confidence);
  return {
    kind: adaptVerdictKind(raw.kind),
    reason: str(raw.reason) ?? "No reason provided by the guard.",
    confidence: confidence !== undefined && confidence >= 0 && confidence <= 1 ? confidence : undefined,
    observedAt: iso(raw.observed_at) ?? EPOCH,
    aiExplanation: str(raw.ai_explanation),
    evidence: Array.isArray(raw.evidence)
      ? raw.evidence.filter((e): e is string => typeof e === "string" && e.length > 0)
      : undefined,
  };
}

export function adaptPolicy(raw: unknown): LeasePolicy {
  const p: Loose = isObject(raw) ? raw : {};
  const decision = isObject(p.last_decision) ? p.last_decision : undefined;
  const decisionAt = decision ? iso(decision.at) : undefined;
  return {
    checkIntervalMin: num(p.check_interval_min) ?? 0,
    idleThresholdPct: num(p.idle_threshold_pct) ?? 0,
    idleWindowMin: num(p.idle_window_min) ?? 0,
    reminderTimeoutMin: num(p.reminder_timeout_min) ?? 0,
    onNoResponse: adaptNoResponse(p.on_no_response),
    nextCheckAt: iso(p.next_check_at),
    deadlineAt: iso(p.deadline_at),
    lastDecision:
      decision && decisionAt
        ? {
            action: str(decision.action) ?? "unknown",
            at: decisionAt,
            by: decision.by === "user" ? "user" : "policy",
          }
        : undefined,
  };
}

export function adaptSavings(raw: unknown): Savings | undefined {
  if (!isObject(raw)) return undefined;
  return {
    estimatedComputeSaved: num(raw.estimated_compute_saved),
    actualComputeSaved: num(raw.actual_compute_saved),
    currency: str(raw.currency) ?? "USD",
    period: str(raw.period),
    storageCostPerHour: num(raw.storage_cost_per_hour),
    isEstimate: true,
  };
}

export function adaptTimelineEvent(
  raw: unknown,
  index: number
): TimelineEvent | undefined {
  if (!isObject(raw)) return undefined;
  const at = iso(raw.at);
  if (!at) return undefined;
  const type: TimelineEventType = oneOf(TIMELINE_EVENT_TYPES, raw.type) ?? "error";
  return {
    id: str(raw.id) ?? `${at}-${index}`,
    at,
    type,
    title: str(raw.title) ?? (oneOf(TIMELINE_EVENT_TYPES, raw.type) ? type.replace(/_/g, " ") : "Unrecognised event"),
    detail: str(raw.detail),
  };
}

function adaptAllowedActions(v: unknown): RunAction[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.filter((a): a is RunAction => oneOf(RUN_ACTIONS, a) !== undefined);
}

const compact = <T>(list: (T | undefined)[]): T[] => list.filter((x): x is T => x !== undefined);

export function adaptRun(input: unknown): Run | undefined {
  const raw = normalizeBackendRun(input);
  if (!isObject(raw)) return undefined;
  const id = typeof raw.id === "number" ? String(raw.id) : str(raw.id);
  if (!id) return undefined;
  const machineId = num(raw.machine_id) ?? 0;
  const history = Array.isArray(raw.probe_history)
    ? compact(raw.probe_history.map(adaptProbe)).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    : undefined;
  const timeline = Array.isArray(raw.timeline)
    ? compact(raw.timeline.map(adaptTimelineEvent))
    : undefined;
  return {
    id,
    machineId,
    name: str(raw.name) ?? `machine-${machineId || id}`,
    gpuType: str(raw.gpu_type) ?? "Unknown GPU",
    gpuCount: num(raw.gpu_count) ?? 1,
    createdAt: iso(raw.created_at) ?? EPOCH,
    startedAt: iso(raw.started_at),
    hourlyRate: num(raw.hourly_rate),
    status: adaptStatus(raw.status),
    providerStatus: str(raw.provider_status),
    latestProbe: adaptProbe(raw.latest_probe) ?? history?.at(-1),
    probeHistory: history,
    verdict: adaptVerdict(raw.verdict),
    policy: adaptPolicy(raw.policy),
    savings: adaptSavings(raw.savings),
    timeline,
    allowedActions: adaptAllowedActions(raw.allowed_actions),
  };
}

/** Accepts either a bare array or `{ runs: [...] }`. */
export function adaptRunList(raw: unknown): Run[] {
  const list = Array.isArray(raw) ? raw : isObject(raw) && Array.isArray(raw.runs) ? raw.runs : [];
  return compact(list.map((r) => adaptRun(r)));
}

export function adaptWallet(raw: unknown): Wallet | undefined {
  if (!isObject(raw)) return undefined;
  const balance = num(raw.balance);
  if (balance === undefined) return undefined;
  return {
    balance,
    currency: str(raw.currency) ?? "USD",
    burnRatePerHour: num(raw.burn_rate_per_hour),
    asOf: iso(raw.as_of) ?? new Date().toISOString(),
  };
}

export function adaptEligibleInstances(raw: unknown): EligibleInstance[] {
  const list = Array.isArray(raw) ? raw : isObject(raw) && Array.isArray(raw.instances) ? raw.instances : [];
  return compact(
    list.map((item: unknown) => {
      if (!isObject(item)) return undefined;
      const machineId = num(item.machine_id);
      if (machineId === undefined) return undefined;
      return {
        machineId,
        name: str(item.name) ?? `machine-${machineId}`,
        gpuType: str(item.gpu_type) ?? "Unknown GPU",
        gpuCount: num(item.gpu_count) ?? 1,
        providerStatus: str(item.provider_status),
        hourlyRate: num(item.hourly_rate),
      };
    })
  );
}

export function adaptPolicyPresets(raw: unknown): PolicyPreset[] {
  const list = Array.isArray(raw) ? raw : isObject(raw) && Array.isArray(raw.policies) ? raw.policies : [];
  return compact(
    list.map((item: unknown) => {
      if (!isObject(item)) return undefined;
      const id = str(item.id);
      const checkIntervalMin = num(item.check_interval_min);
      const idleThresholdPct = num(item.idle_threshold_pct);
      const idleWindowMin = num(item.idle_window_min);
      const reminderTimeoutMin = num(item.reminder_timeout_min);
      if (
        !id ||
        checkIntervalMin === undefined ||
        idleThresholdPct === undefined ||
        idleWindowMin === undefined ||
        reminderTimeoutMin === undefined
      ) {
        return undefined;
      }
      return {
        id,
        name: str(item.name) ?? id,
        description: str(item.description),
        checkIntervalMin,
        idleThresholdPct,
        idleWindowMin,
        reminderTimeoutMin,
        onNoResponse: adaptNoResponse(item.on_no_response),
      };
    })
  );
}

export function adaptTelegramStatus(raw: unknown): TelegramStatus {
  if (!isObject(raw)) return { linked: false };
  const linkUrl = str(raw.link_url);
  return {
    linked: raw.linked === true,
    username: str(raw.username)?.replace(/^@/, ""),
    linkUrl: linkUrl && /^https:\/\//.test(linkUrl) ? linkUrl : undefined,
  };
}
