import type { Run, RunAction, RunStatus } from "@/libs/leaseguard/types";

/**
 * Fallback action availability, used only when the backend omits
 * `allowed_actions`. When the backend sends it, it always wins.
 */
const ACTIONS_BY_STATUS: Record<RunStatus, RunAction[]> = {
  running: ["pause", "extend"],
  suspicious: ["pause", "keep", "extend"],
  needs_attention: ["pause", "keep", "extend"],
  checkpointing: [],
  pausing: [],
  resuming: [],
  paused: ["resume", "resume_other_gpu"],
  failed: [],
};

export function getAllowedActions(run: Pick<Run, "status" | "allowedActions">): RunAction[] {
  return run.allowedActions ?? ACTIONS_BY_STATUS[run.status];
}

const DECISION_STATUSES: ReadonlySet<RunStatus> = new Set(["suspicious", "needs_attention"]);
const TRANSITION_STATUSES: ReadonlySet<RunStatus> = new Set(["checkpointing", "pausing", "resuming"]);
const COMPUTE_BILLING_STATUSES: ReadonlySet<RunStatus> = new Set([
  "running",
  "suspicious",
  "needs_attention",
  "checkpointing",
  "pausing",
  "resuming",
]);

export const needsDecision = (run: Pick<Run, "status">) => DECISION_STATUSES.has(run.status);
export const isTransitioning = (run: Pick<Run, "status">) => TRANSITION_STATUSES.has(run.status);
export const isBillingCompute = (run: Pick<Run, "status">) => COMPUTE_BILLING_STATUSES.has(run.status);

/** True when an unanswered reminder will lead to checkpoint + pause. */
export function hasAutoPauseDeadline(run: Pick<Run, "status" | "policy">): boolean {
  return needsDecision(run) && run.policy.onNoResponse === "checkpoint_and_pause" && !!run.policy.deadlineAt;
}
