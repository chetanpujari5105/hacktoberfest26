import type { RunStatus } from "@/libs/backend-types";

const STATUS_META: Record<RunStatus, { label: string; className: string }> = {
  watching: { label: "Watching", className: "badge-info" },
  awaiting_decision: { label: "Awaiting decision", className: "badge-warning" },
  checkpointing: { label: "Checkpointing", className: "badge-secondary" },
  paused: { label: "Paused", className: "badge-success" },
  resuming: { label: "Resuming", className: "badge-secondary" },
  needs_triage: { label: "Needs triage", className: "badge-error" },
  stopped: { label: "Stopped", className: "badge-ghost" },
};

interface RunStatusBadgeProps {
  status: RunStatus;
  /** Backend served cached state because the Temporal worker is unreachable. */
  stale?: boolean;
}

export default function RunStatusBadge({ status, stale = false }: RunStatusBadgeProps) {
  const meta = STATUS_META[status] ?? { label: status, className: "badge-ghost" };
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`badge ${meta.className} badge-sm whitespace-nowrap`}>{meta.label}</span>
      {stale && (
        <span
          className="badge badge-outline badge-sm whitespace-nowrap"
          title="Worker offline: showing last known state. The workflow resumes when the worker is back."
        >
          worker offline
        </span>
      )}
    </span>
  );
}
