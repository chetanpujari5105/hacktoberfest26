import type { RunView } from "@/libs/backend-types";

/**
 * Pure helpers for LeaseGuard runs, shared by route handlers and the dashboard.
 */

const RUN_ID_PATTERN = /^run-[A-Za-z0-9_-]{1,64}$/;
const MS_PER_HOUR = 3_600_000;

export function isValidRunId(id: string): boolean {
  return RUN_ID_PATTERN.test(id);
}

/** Banked savings plus the time the run has spent paused so far. */
export function liveSavingsInr(run: RunView, nowMs: number): number {
  if (run.status !== "paused" || !run.paused_at) return run.savings_inr;
  const pausedMs = Math.max(0, nowMs - Date.parse(run.paused_at));
  return run.savings_inr + (pausedMs / MS_PER_HOUR) * run.hourly_cost_inr;
}

const INR_FORMAT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatInr(value: number): string {
  return INR_FORMAT.format(value);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}
