import "server-only";

import config from "@/config";
import { getAllowedActions } from "@/libs/leaseguard/actions";
import type { BackendResult } from "@/libs/leaseguard/backend";
import type {
  BackendEligibleInstance,
  BackendPolicy,
  BackendPolicyPreset,
  BackendProbe,
  BackendRun,
  BackendTelegramStatus,
  BackendTimelineEvent,
  BackendVerdict,
  BackendWallet,
  RunAction,
  RunStatus,
  StartGuardBody,
  TimelineEventType,
} from "@/libs/leaseguard/types";

/**
 * In-memory DEMO_MODE store. Everything here is clearly fake sample data.
 * It emits backend-shaped (snake_case) JSON so demo responses go through
 * the same adapters as live ones. State resets when the server restarts.
 */

const SEC = 1_000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;

// Demo transitions are compressed so a pause/resume plays out across a few polls.
const PAUSE_PHASE_MS = 4 * SEC;
const RESUME_MS = 6 * SEC;
const FIRST_VERDICT_MS = 15 * SEC;
const HISTORY_CAP = 48;

type UtilProfile = "busy" | "idle";

interface Transition {
  kind: "pause" | "resume";
  startedAt: number;
  by: "user" | "policy";
  phase: number;
  gpuType?: string;
}

interface DemoRun {
  id: string;
  machineId: number;
  name: string;
  gpuType: string;
  gpuCount: number;
  createdAt: number;
  startedAt: number;
  hourlyRate: number;
  storageCostPerHour: number;
  status: RunStatus;
  providerStatus: string;
  profile: UtilProfile;
  utilBase: number;
  memTotalMb: number;
  memUsedMb: number;
  processName: string;
  processStatus: string;
  log: (now: number) => string;
  probes: BackendProbe[];
  verdict?: BackendVerdict;
  policy: {
    check_interval_min: number;
    idle_threshold_pct: number;
    idle_window_min: number;
    reminder_timeout_min: number;
    on_no_response: "checkpoint_and_pause" | "notify_only";
    deadlineAt?: number;
    lastDecision?: { action: string; at: number; by: "user" | "policy" };
  };
  timeline: BackendTimelineEvent[];
  pausedAt?: number;
  savedComputeUsd: number;
  transition?: Transition;
  pendingVerdictAt?: number;
}

interface EligibleSeed {
  machineId: number;
  name: string;
  gpuType: string;
  gpuCount: number;
  hourlyRate: number;
  profile: UtilProfile;
  utilBase: number;
  memTotalMb: number;
  memUsedMb: number;
  processName: string;
  log: (now: number) => string;
}

interface DemoState {
  seededAt: number;
  runs: DemoRun[];
  eligible: EligibleSeed[];
  telegram: { linked: boolean; username?: string };
  walletStart: number;
  eventSeq: number;
}

const POLICY_PRESETS: Required<BackendPolicyPreset>[] = [
  {
    id: "balanced",
    name: "Balanced",
    description: "Good default for long fine-tunes. Gives a stalled run time to recover before asking.",
    check_interval_min: 5,
    idle_threshold_pct: 10,
    idle_window_min: 20,
    reminder_timeout_min: 15,
    on_no_response: "checkpoint_and_pause",
  },
  {
    id: "aggressive",
    name: "Aggressive",
    description: "For expensive GPUs and short experiments. Acts quickly when a run goes quiet.",
    check_interval_min: 2,
    idle_threshold_pct: 15,
    idle_window_min: 10,
    reminder_timeout_min: 5,
    on_no_response: "checkpoint_and_pause",
  },
  {
    id: "notify-only",
    name: "Notify only",
    description: "Never pauses anything. You just get a Telegram nudge when a run looks idle.",
    check_interval_min: 10,
    idle_threshold_pct: 5,
    idle_window_min: 30,
    reminder_timeout_min: 30,
    on_no_response: "notify_only",
  },
];

/* ------------------------------ helpers ------------------------------ */

const toIso = (t: number) => new Date(t).toISOString();
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const jitter = (spread: number) => (Math.random() * 2 - 1) * spread;
const round1 = (v: number) => Math.round(v * 10) / 10;

function sampleUtil(profile: UtilProfile, base: number): number {
  return profile === "busy" ? round1(clamp(base + jitter(4), 60, 99)) : round1(clamp(base + jitter(1.5), 0, 6));
}

function nextEventId(state: DemoState): string {
  state.eventSeq += 1;
  return `evt_${state.eventSeq.toString(36).padStart(4, "0")}`;
}

function addEvent(state: DemoState, run: DemoRun, at: number, type: TimelineEventType, title: string, detail?: string) {
  run.timeline.push({ id: nextEventId(state), at: toIso(at), type, title, detail });
}

function makeHistory(
  from: number,
  to: number,
  stepMin: number,
  sample: (t: number) => Omit<BackendProbe, "at">
): BackendProbe[] {
  const out: BackendProbe[] = [];
  for (let t = from; t <= to; t += stepMin * MIN) out.push({ at: toIso(t), ...sample(t) });
  return out.slice(-HISTORY_CAP);
}

/* ------------------------------- seed -------------------------------- */

function seed(now: number): DemoState {
  const state: DemoState = {
    seededAt: now,
    runs: [],
    eligible: [],
    telegram: { linked: false },
    walletStart: 42.18,
    eventSeq: 0,
  };

  // 1. Healthy LoRA fine-tune
  const llamaStart = now - (3 * HOUR + 10 * MIN);
  const llamaStep = (t: number) => 2400 + Math.floor((t - llamaStart) / 1000 / 6.3);
  const llamaLoss = (t: number) => 1.62 * Math.exp(-(t - llamaStart) / (9 * HOUR)) + 0.52;
  const llama: DemoRun = {
    id: "run_7f3a2c",
    machineId: 40112,
    name: "llama3-8b-lora-finetune",
    gpuType: "A100-80GB",
    gpuCount: 1,
    createdAt: llamaStart - 4 * MIN,
    startedAt: llamaStart,
    hourlyRate: 1.29,
    storageCostPerHour: 0.06,
    status: "running",
    providerStatus: "Running",
    profile: "busy",
    utilBase: 92,
    memTotalMb: 81_920,
    memUsedMb: 62_771,
    processName: "python train_lora.py --config llama3-8b.yaml",
    processStatus: "running (R)",
    log: (t) => {
      const s = llamaStep(t);
      const lines = [0, 10, 20].map(
        (d) =>
          `step ${s - 20 + d} | loss ${(llamaLoss(t) + (20 - d) * 0.00021).toFixed(4)} | lr 1.8e-4 | ${(2.28 + jitter(0.04)).toFixed(2)} it/s`
      );
      return [...lines, `[eval] step ${s - (s % 200)} | val_loss ${(llamaLoss(t) + 0.051).toFixed(4)}`].join("\n");
    },
    probes: [],
    verdict: undefined,
    policy: { ...pickPolicy("balanced") },
    timeline: [],
    savedComputeUsd: 0,
  };
  llama.probes = makeHistory(now - 2 * HOUR, now - 2 * MIN, 5, () => ({
    gpu_util_pct: sampleUtil("busy", 92),
    mem_used_mb: 62_771,
    mem_total_mb: 81_920,
    process_name: llama.processName,
    process_status: "running (R)",
  }));
  llama.verdict = {
    kind: "healthy",
    reason: "GPU busy (avg 92% over the last 20 min) and training loss is still falling.",
    confidence: 0.93,
    observed_at: toIso(now - 2 * MIN),
    evidence: [
      "Average GPU utilization 92% over the last 20 min (idle threshold 10%)",
      "Step counter advancing ~0.16 steps/s",
      "Training loss down from 1.31 to 1.20 over the last 40 min",
      "Process state: running (R)",
    ],
    ai_explanation:
      "Utilization has stayed well above the idle threshold for the whole window and the training log shows steady progress with a decreasing loss. Nothing in the evidence suggests the run is stuck or finished.",
  };
  addEvent(state, llama, llamaStart + 1 * MIN, "guard_started", "Guard started", "Policy: Balanced");
  addEvent(state, llama, llamaStart + 6 * MIN, "verdict", "Verdict: healthy", "GPU busy, loss decreasing");
  addEvent(state, llama, now - 2 * MIN, "probe", "Probe completed", "GPU 92% · 61.3 GB / 80 GB");

  // 2. Stalled DreamBooth run awaiting a decision
  const sdxlStart = now - 2 * HOUR;
  const stallAt = now - 25 * MIN;
  const sdxl: DemoRun = {
    id: "run_b41e90",
    machineId: 40587,
    name: "sdxl-dreambooth-v3",
    gpuType: "RTX6000-Ada",
    gpuCount: 1,
    createdAt: sdxlStart - 3 * MIN,
    startedAt: sdxlStart,
    hourlyRate: 0.99,
    storageCostPerHour: 0.04,
    status: "suspicious",
    providerStatus: "Running",
    profile: "idle",
    utilBase: 3,
    memTotalMb: 49_140,
    memUsedMb: 22_938,
    processName: "accelerate launch train_dreambooth_sdxl.py",
    processStatus: "sleeping (S)",
    log: () =>
      [
        "step 1600/2000 | loss 0.0912 | 1.94 it/s",
        "[W dataloader] worker 3 timed out after 600s, retrying",
        "[W dataloader] worker 3 timed out after 600s, retrying",
        "[W dataloader] worker 3 timed out after 600s, retrying",
      ].join("\n"),
    probes: [],
    policy: { ...pickPolicy("balanced") },
    timeline: [],
    savedComputeUsd: 0,
  };
  sdxl.probes = makeHistory(now - 2 * HOUR + 5 * MIN, now - 1 * MIN, 5, (t) => {
    const idle = t >= stallAt;
    return {
      gpu_util_pct: sampleUtil(idle ? "idle" : "busy", idle ? 3 : 95),
      mem_used_mb: 22_938,
      mem_total_mb: 49_140,
      process_name: sdxl.processName,
      process_status: idle ? "sleeping (S)" : "running (R)",
    };
  });
  const sdxlAlertAt = now - 3 * MIN;
  sdxl.policy.deadlineAt = sdxlAlertAt + 15 * MIN;
  sdxl.verdict = {
    kind: "suspicious",
    reason:
      "GPU utilization ~3% for 25 min (threshold 10% over 20 min) and no new training step has been logged since the stall began.",
    confidence: 0.81,
    observed_at: toIso(sdxlAlertAt),
    evidence: [
      "Average GPU utilization 3% over the last 25 min (idle threshold 10%)",
      "Step counter stuck at 1600/2000 for 25 min",
      "Dataloader worker timeout repeated 3× in the log",
      "Process sleeping (S) while holding 22.4 GB of VRAM",
    ],
    ai_explanation:
      "The training process is alive and still holds GPU memory, but it isn't computing. Repeated dataloader worker timeouts suggest the input pipeline is blocked (for example a stalled dataset mount), so the run is waiting on data rather than finished. A checkpoint now would preserve progress at step 1600.",
  };
  addEvent(state, sdxl, sdxlStart + 1 * MIN, "guard_started", "Guard started", "Policy: Balanced");
  addEvent(state, sdxl, sdxlStart + 6 * MIN, "verdict", "Verdict: healthy", "GPU busy, loss decreasing");
  addEvent(state, sdxl, stallAt + 5 * MIN, "probe", "Low utilization detected", "GPU 3% · watching for 20 min before acting");
  addEvent(state, sdxl, sdxlAlertAt, "verdict", "Verdict: suspicious", "Idle for 25 min, dataloader stalled");
  addEvent(
    state,
    sdxl,
    sdxlAlertAt,
    "telegram_sent",
    "Telegram reminder sent",
    "Auto-pause in 15 min unless you choose Pause, Keep 30 min, or Extend"
  );

  // 3. Paused evaluation run
  const whisperStart = now - 5 * HOUR;
  const whisperPausedAt = now - 47 * MIN;
  const whisper: DemoRun = {
    id: "run_c0d215",
    machineId: 39874,
    name: "whisper-medium-eval",
    gpuType: "A6000",
    gpuCount: 1,
    createdAt: whisperStart - 2 * MIN,
    startedAt: whisperStart,
    hourlyRate: 0.79,
    storageCostPerHour: 0.03,
    status: "paused",
    providerStatus: "Paused",
    profile: "idle",
    utilBase: 0,
    memTotalMb: 49_140,
    memUsedMb: 0,
    processName: "python eval_whisper.py --split test-clean",
    processStatus: "exited (0)",
    log: () =>
      [
        "[eval] batch 655/655 | elapsed 3h41m",
        "[eval] test-clean WER 4.21% | CER 1.37%",
        "wrote results/whisper-medium/test-clean.json",
        "process exited with code 0",
      ].join("\n"),
    probes: [],
    policy: { ...pickPolicy("balanced") },
    timeline: [],
    pausedAt: whisperPausedAt,
    savedComputeUsd: 0,
  };
  const evalDoneAt = whisperPausedAt - 28 * MIN;
  whisper.probes = makeHistory(whisperPausedAt - 2 * HOUR, whisperPausedAt - 4 * MIN, 5, (t) => {
    const done = t >= evalDoneAt;
    return {
      gpu_util_pct: sampleUtil(done ? "idle" : "busy", done ? 0.5 : 74),
      mem_used_mb: done ? 512 : 31_480,
      mem_total_mb: 49_140,
      process_name: whisper.processName,
      process_status: done ? "exited (0)" : "running (R)",
    };
  });
  whisper.verdict = {
    kind: "completed",
    reason: "Evaluation finished: final WER was written and the process exited cleanly.",
    observed_at: toIso(whisperPausedAt - 9 * MIN),
    evidence: [
      "Log line: \"test-clean WER 4.21% | CER 1.37%\"",
      "Process exited with code 0",
      "GPU utilization under 1% since the eval finished",
    ],
    ai_explanation:
      "The log shows the final metrics being written followed by a clean exit, and the GPU has been idle since. This looks like a finished job rather than a stall.",
  };
  whisper.policy.lastDecision = { action: "pause", at: whisperPausedAt - 3 * MIN, by: "user" };
  addEvent(state, whisper, whisperStart + 1 * MIN, "guard_started", "Guard started", "Policy: Balanced");
  addEvent(state, whisper, whisperPausedAt - 9 * MIN, "verdict", "Verdict: completed", "Eval finished, process exited");
  addEvent(state, whisper, whisperPausedAt - 9 * MIN, "telegram_sent", "Telegram reminder sent");
  addEvent(state, whisper, whisperPausedAt - 3 * MIN, "user_decision", "You chose Pause", "Decided via Telegram");
  addEvent(state, whisper, whisperPausedAt - 2 * MIN, "checkpoint", "Checkpoint saved", "/home/checkpoints/whisper-medium-eval");
  addEvent(state, whisper, whisperPausedAt, "paused", "Instance paused", "Compute billing stopped · storage still billed");

  state.runs = [llama, sdxl, whisper];

  state.eligible = [
    {
      machineId: 41207,
      name: "mistral-7b-dpo",
      gpuType: "A100-40GB",
      gpuCount: 1,
      hourlyRate: 1.1,
      profile: "busy",
      utilBase: 78,
      memTotalMb: 40_960,
      memUsedMb: 33_116,
      processName: "python dpo_train.py",
      log: () => "step 880 | loss 0.6421 | rewards/margin 0.214\nstep 890 | loss 0.6398 | rewards/margin 0.219",
    },
    {
      machineId: 41388,
      name: "yolov9-sweep-03",
      gpuType: "L4",
      gpuCount: 1,
      hourlyRate: 0.44,
      profile: "idle",
      utilBase: 1,
      memTotalMb: 23_034,
      memUsedMb: 1_204,
      processName: "jupyter-lab",
      log: () => "[I 13:02:11 ServerApp] Saving file at /sweep/analysis.ipynb\n[I 13:32:11 ServerApp] Kernel idle",
    },
  ];

  return state;
}

function pickPolicy(id: string) {
  const p = POLICY_PRESETS.find((x) => x.id === id) ?? POLICY_PRESETS[0];
  return {
    check_interval_min: p.check_interval_min,
    idle_threshold_pct: p.idle_threshold_pct,
    idle_window_min: p.idle_window_min,
    reminder_timeout_min: p.reminder_timeout_min,
    on_no_response: p.on_no_response === "notify_only" ? ("notify_only" as const) : ("checkpoint_and_pause" as const),
  };
}

/* --------------------------- state & ticking -------------------------- */

const globalForDemo = globalThis as unknown as { __leaseguardDemo?: DemoState };

function getState(): DemoState {
  globalForDemo.__leaseguardDemo ??= seed(Date.now());
  return globalForDemo.__leaseguardDemo;
}

function lastProbeAt(run: DemoRun): number {
  const last = run.probes.at(-1);
  return last?.at ? Date.parse(last.at) : run.startedAt;
}

function startPause(state: DemoState, run: DemoRun, now: number, by: "user" | "policy") {
  run.transition = { kind: "pause", startedAt: now, by, phase: 0 };
  run.status = "checkpointing";
  run.policy.deadlineAt = undefined;
  run.policy.lastDecision = { action: "pause", at: now, by };
  addEvent(state, run, now, "checkpoint", "Checkpoint started", "Saving model and optimizer state");
}

function evaluateVerdict(state: DemoState, run: DemoRun, now: number) {
  const window = run.probes.slice(-3);
  const avg = window.reduce((s, p) => s + (p.gpu_util_pct ?? 0), 0) / Math.max(1, window.length);
  const threshold = run.policy.idle_threshold_pct;
  run.pendingVerdictAt = undefined;
  if (avg >= threshold) {
    run.verdict = {
      kind: "healthy",
      reason: `GPU busy (avg ${Math.round(avg)}% across recent probes, threshold ${threshold}%).`,
      observed_at: toIso(now),
      evidence: [`Average GPU utilization ${Math.round(avg)}% across the last ${window.length} probes`, "Process running"],
    };
    if (run.status === "suspicious") run.status = "running";
    addEvent(state, run, now, "verdict", "Verdict: healthy", `Average GPU ${Math.round(avg)}%`);
    return;
  }
  run.verdict = {
    kind: "suspicious",
    reason: `GPU utilization ~${Math.round(avg)}% across recent probes, below the ${threshold}% idle threshold.`,
    observed_at: toIso(now),
    evidence: [
      `Average GPU utilization ${Math.round(avg)}% across the last ${window.length} probes (threshold ${threshold}%)`,
      `Process: ${run.processName} (${run.processStatus})`,
      "No training progress lines in the recent log",
    ],
  };
  run.status = "suspicious";
  run.policy.deadlineAt = now + run.policy.reminder_timeout_min * MIN;
  addEvent(state, run, now, "verdict", "Verdict: suspicious", `Average GPU ${Math.round(avg)}%`);
  addEvent(
    state,
    run,
    now,
    "telegram_sent",
    "Telegram reminder sent",
    run.policy.on_no_response === "checkpoint_and_pause"
      ? `Auto-pause in ${run.policy.reminder_timeout_min} min unless you respond`
      : "Notify-only policy: the run will keep going"
  );
}

function tickRun(state: DemoState, run: DemoRun, now: number) {
  const t = run.transition;
  if (t?.kind === "pause") {
    const elapsed = now - t.startedAt;
    if (t.phase === 0 && elapsed >= PAUSE_PHASE_MS) {
      t.phase = 1;
      run.status = "pausing";
      addEvent(state, run, t.startedAt + PAUSE_PHASE_MS, "checkpoint", "Checkpoint saved", `/home/checkpoints/${run.name}`);
    }
    if (t.phase === 1 && elapsed >= 2 * PAUSE_PHASE_MS) {
      const at = t.startedAt + 2 * PAUSE_PHASE_MS;
      run.transition = undefined;
      run.status = "paused";
      run.providerStatus = "Paused";
      run.pausedAt = at;
      run.memUsedMb = 0;
      run.processStatus = "stopped";
      addEvent(state, run, at, "paused", "Instance paused", "Compute billing stopped · storage still billed");
    }
    return;
  }
  if (t?.kind === "resume") {
    if (now - t.startedAt >= RESUME_MS) {
      const at = t.startedAt + RESUME_MS;
      run.transition = undefined;
      run.status = "running";
      run.providerStatus = "Running";
      run.profile = "busy";
      run.utilBase = run.utilBase > 20 ? run.utilBase : 88;
      run.memUsedMb = Math.round(run.memTotalMb * 0.7);
      run.processStatus = "running (R)";
      run.pendingVerdictAt = at + FIRST_VERDICT_MS;
      run.verdict = {
        kind: "unknown",
        reason: "Collecting fresh evidence after resume.",
        observed_at: toIso(at),
      };
      addEvent(state, run, at, "resumed", "Instance running again", t.gpuType ? `Now on ${t.gpuType}` : undefined);
    }
    return;
  }

  if (run.status === "paused") return;

  // Unanswered reminder: the policy decides.
  if (
    run.status === "suspicious" &&
    run.policy.on_no_response === "checkpoint_and_pause" &&
    run.policy.deadlineAt !== undefined &&
    now >= run.policy.deadlineAt
  ) {
    addEvent(state, run, run.policy.deadlineAt, "user_decision", "No reply in time — policy chose Pause", "Decided by policy");
    startPause(state, run, now, "policy");
    return;
  }

  // Record a new probe once per check interval.
  const intervalMs = run.policy.check_interval_min * MIN;
  if (now - lastProbeAt(run) >= intervalMs) {
    run.probes.push({
      at: toIso(now),
      gpu_util_pct: sampleUtil(run.profile, run.utilBase),
      mem_used_mb: run.memUsedMb,
      mem_total_mb: run.memTotalMb,
      process_name: run.processName,
      process_status: run.processStatus,
    });
    run.probes = run.probes.slice(-HISTORY_CAP);
  }

  if (run.pendingVerdictAt !== undefined && now >= run.pendingVerdictAt) evaluateVerdict(state, run, now);
}

function tick(now: number): DemoState {
  const state = getState();
  for (const run of state.runs) tickRun(state, run, now);
  return state;
}

/* ----------------------------- serialise ----------------------------- */

function serialiseRun(run: DemoRun, now: number, detail: boolean): BackendRun {
  const last = run.probes.at(-1);
  const live = run.status !== "paused" && !run.transition;
  // Small jitter on the live reading so polling looks alive; verdicts stay stable.
  const latest: BackendProbe | undefined = last
    ? {
        ...last,
        gpu_util_pct: live ? sampleUtil(run.profile, run.utilBase) : last.gpu_util_pct,
        log_excerpt: run.log(now),
      }
    : undefined;
  const pausedMs = run.pausedAt ? now - run.pausedAt : 0;
  const policy: BackendPolicy = {
    check_interval_min: run.policy.check_interval_min,
    idle_threshold_pct: run.policy.idle_threshold_pct,
    idle_window_min: run.policy.idle_window_min,
    reminder_timeout_min: run.policy.reminder_timeout_min,
    on_no_response: run.policy.on_no_response,
    next_check_at: live ? toIso(lastProbeAt(run) + run.policy.check_interval_min * MIN) : null,
    deadline_at: run.policy.deadlineAt ? toIso(run.policy.deadlineAt) : null,
    last_decision: run.policy.lastDecision
      ? { ...run.policy.lastDecision, at: toIso(run.policy.lastDecision.at) }
      : null,
  };
  return {
    id: run.id,
    machine_id: run.machineId,
    name: run.name,
    gpu_type: run.gpuType,
    gpu_count: run.gpuCount,
    created_at: toIso(run.createdAt),
    started_at: toIso(run.startedAt),
    hourly_rate: run.hourlyRate,
    status: run.status,
    provider_status: run.providerStatus,
    latest_probe: latest,
    probe_history: detail ? run.probes : undefined,
    verdict: run.verdict,
    policy,
    savings: {
      estimated_compute_saved: Math.round((run.savedComputeUsd + (pausedMs / HOUR) * run.hourlyRate) * 100) / 100,
      currency: "USD",
      period: "since guard started",
      storage_cost_per_hour: run.storageCostPerHour,
    },
    timeline: detail ? run.timeline : undefined,
    // allowed_actions intentionally omitted so the frontend derives them.
  };
}

/* ------------------------------ public API ---------------------------- */

const ok = <T>(data: T): BackendResult<T> => ({ ok: true, data });
const err = (code: string, status: number, message: string): BackendResult<never> => ({
  ok: false,
  error: { code, status, message },
});

function findRun(state: DemoState, id: string): DemoRun | undefined {
  return state.runs.find((r) => r.id === id || String(r.machineId) === id);
}

function guardAction(run: DemoRun, action: RunAction): BackendResult<never> | undefined {
  const allowed = getAllowedActions({ status: run.status });
  return allowed.includes(action)
    ? undefined
    : err("CONFLICT", 409, `Can't ${action.replace(/_/g, " ")} while the run is ${run.status.replace(/_/g, " ")}.`);
}

export const demoStore = {
  listRuns(): BackendResult<BackendRun[]> {
    const now = Date.now();
    const state = tick(now);
    return ok(state.runs.map((r) => serialiseRun(r, now, false)));
  },

  getRun(id: string): BackendResult<BackendRun> {
    const now = Date.now();
    const run = findRun(tick(now), id);
    return run ? ok(serialiseRun(run, now, true)) : err("NOT_FOUND", 404, "No guarded run with that id.");
  },

  startGuard(body: StartGuardBody): BackendResult<BackendRun> {
    const now = Date.now();
    const state = tick(now);
    const idx = state.eligible.findIndex((e) => e.machineId === body.machine_id);
    if (idx === -1) {
      return state.runs.some((r) => r.machineId === body.machine_id)
        ? err("CONFLICT", 409, "That instance is already guarded.")
        : err("NOT_FOUND", 404, "That instance isn't available to guard.");
    }
    const inst = state.eligible[idx];
    state.eligible.splice(idx, 1);
    const preset = POLICY_PRESETS.find((p) => p.id === body.policy.preset_id);
    const run: DemoRun = {
      id: `run_${inst.machineId.toString(16)}`,
      machineId: inst.machineId,
      name: inst.name,
      gpuType: inst.gpuType,
      gpuCount: inst.gpuCount,
      createdAt: now,
      startedAt: now - 95 * MIN,
      hourlyRate: inst.hourlyRate,
      storageCostPerHour: 0.03,
      status: "running",
      providerStatus: "Running",
      profile: inst.profile,
      utilBase: inst.utilBase,
      memTotalMb: inst.memTotalMb,
      memUsedMb: inst.memUsedMb,
      processName: inst.processName,
      processStatus: inst.profile === "busy" ? "running (R)" : "sleeping (S)",
      log: inst.log,
      // Recent provider metrics give the guard something to judge right away.
      probes: makeHistory(now - 30 * MIN, now, body.policy.check_interval_min, () => ({
        gpu_util_pct: sampleUtil(inst.profile, inst.utilBase),
        mem_used_mb: inst.memUsedMb,
        mem_total_mb: inst.memTotalMb,
        process_name: inst.processName,
        process_status: inst.profile === "busy" ? "running (R)" : "sleeping (S)",
      })),
      verdict: { kind: "unknown", reason: "Guard just started — reviewing recent metrics.", observed_at: toIso(now) },
      policy: {
        check_interval_min: body.policy.check_interval_min,
        idle_threshold_pct: body.policy.idle_threshold_pct,
        idle_window_min: body.policy.idle_window_min,
        reminder_timeout_min: body.policy.reminder_timeout_min,
        on_no_response: body.policy.on_no_response,
      },
      timeline: [],
      savedComputeUsd: 0,
      pendingVerdictAt: now + FIRST_VERDICT_MS,
    };
    addEvent(state, run, now, "guard_started", "Guard started", preset ? `Policy: ${preset.name}` : "Custom policy");
    addEvent(state, run, now, "probe", "First probe completed", `GPU ${Math.round(run.probes.at(-1)?.gpu_util_pct ?? 0)}%`);
    state.runs.push(run);
    return ok(serialiseRun(run, now, true));
  },

  decide(id: string, action: "pause" | "keep"): BackendResult<BackendRun> {
    const now = Date.now();
    const state = tick(now);
    const run = findRun(state, id);
    if (!run) return err("NOT_FOUND", 404, "No guarded run with that id.");
    const blocked = guardAction(run, action);
    if (blocked) return blocked;
    if (action === "pause") {
      addEvent(state, run, now, "user_decision", "You chose Pause", "Decided from the dashboard");
      startPause(state, run, now, "user");
    } else {
      const keep = config.leaseguard.keepMinutes;
      run.policy.deadlineAt = undefined;
      run.policy.lastDecision = { action: "keep", at: now, by: "user" };
      run.status = "running";
      // Snooze: next reminder no sooner than the keep window.
      run.pendingVerdictAt = now + keep * MIN;
      addEvent(state, run, now, "user_decision", `You chose Keep ${keep} min`, `We'll look again after ${keep} min`);
    }
    return ok(serialiseRun(run, now, true));
  },

  extend(id: string, minutes: number): BackendResult<BackendRun> {
    const now = Date.now();
    const state = tick(now);
    const run = findRun(state, id);
    if (!run) return err("NOT_FOUND", 404, "No guarded run with that id.");
    const blocked = guardAction(run, "extend");
    if (blocked) return blocked;
    run.policy.lastDecision = { action: `extend ${minutes} min`, at: now, by: "user" };
    if (run.status === "suspicious" || run.status === "needs_attention") {
      run.status = "running";
      run.policy.deadlineAt = undefined;
      run.pendingVerdictAt = now + minutes * MIN;
    } else {
      run.pendingVerdictAt = Math.max(run.pendingVerdictAt ?? now, now) + minutes * MIN;
    }
    addEvent(state, run, now, "extended", `Lease extended by ${minutes} min`, "No reminders until the extension ends");
    return ok(serialiseRun(run, now, true));
  },

  resume(id: string, gpuType?: string): BackendResult<BackendRun> {
    const now = Date.now();
    const state = tick(now);
    const run = findRun(state, id);
    if (!run) return err("NOT_FOUND", 404, "No guarded run with that id.");
    const blocked = guardAction(run, gpuType ? "resume_other_gpu" : "resume");
    if (blocked) return blocked;
    if (run.pausedAt) run.savedComputeUsd += ((now - run.pausedAt) / HOUR) * run.hourlyRate;
    run.pausedAt = undefined;
    if (gpuType) run.gpuType = gpuType;
    run.transition = { kind: "resume", startedAt: now, by: "user", phase: 0, gpuType };
    run.status = "resuming";
    run.providerStatus = "Starting";
    run.policy.lastDecision = { action: gpuType ? `resume on ${gpuType}` : "resume", at: now, by: "user" };
    addEvent(state, run, now, "user_decision", gpuType ? `You chose Resume on ${gpuType}` : "You chose Resume");
    return ok(serialiseRun(run, now, true));
  },

  wallet(): BackendResult<BackendWallet> {
    const now = Date.now();
    const state = tick(now);
    const burn = state.runs.reduce(
      (sum, r) => sum + (r.status === "paused" ? r.storageCostPerHour : r.hourlyRate),
      0
    );
    const spent = ((now - state.seededAt) / HOUR) * burn;
    return ok({
      balance: Math.round((state.walletStart - spent) * 100) / 100,
      currency: "USD",
      burn_rate_per_hour: Math.round(burn * 100) / 100,
      as_of: toIso(now),
    });
  },

  eligibleInstances(): BackendResult<BackendEligibleInstance[]> {
    return ok(
      getState().eligible.map((e) => ({
        machine_id: e.machineId,
        name: e.name,
        gpu_type: e.gpuType,
        gpu_count: e.gpuCount,
        provider_status: "Running",
        hourly_rate: e.hourlyRate,
      }))
    );
  },

  policies(): BackendResult<BackendPolicyPreset[]> {
    return ok(POLICY_PRESETS);
  },

  telegramStatus(): BackendResult<BackendTelegramStatus> {
    const { linked, username } = getState().telegram;
    return ok({ linked, username: username ?? null, link_url: null });
  },

  /** Simulated link flow — demo only. */
  telegramConnect(): BackendResult<BackendTelegramStatus> {
    const state = getState();
    state.telegram = { linked: true, username: "demo_user" };
    return ok({ linked: true, username: "demo_user", link_url: null });
  },
};
