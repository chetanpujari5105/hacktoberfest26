"use client";

import type { RunAction, RunStatus, RunView } from "@/libs/backend-types";
import { useRunAction } from "@/hooks/useRunAction";
import { Panel } from "@/components/ui/Panel";

interface RunActionsProps {
  run: RunView;
  snoozeMinutes: number;
  resumeGpuOption: string;
  onDone: () => void;
}

interface ActionButton {
  key: string;
  label: string;
  action: RunAction;
  body: object;
  className: string;
}

function buttonsFor(status: RunStatus, snoozeMinutes: number, resumeGpu: string): ActionButton[] {
  const pause: ActionButton = { key: "pause", label: "Pause", action: "decide", body: { action: "pause" }, className: "btn-primary" };
  switch (status) {
    case "awaiting_decision":
      return [
        pause,
        { key: "keep", label: `Keep ${snoozeMinutes}m`, action: "decide", body: { action: "keep" }, className: "btn-ghost" },
      ];
    case "paused":
      return [
        { key: "resume", label: "Resume", action: "resume", body: { gpu_type: null }, className: "btn-primary" },
        { key: "resume-gpu", label: `Resume on ${resumeGpu}`, action: "resume", body: { gpu_type: resumeGpu }, className: "btn-secondary" },
      ];
    case "needs_triage":
      return [
        { key: "resolved", label: "Mark resolved", action: "decide", body: { action: "resolved" }, className: "btn-primary" },
        { ...pause, key: "pause-anyway", label: "Pause anyway", className: "btn-ghost" },
      ];
    case "watching":
      return [
        { ...pause, key: "pause-now", label: "Pause now" },
        { key: "extend", label: `Extend ${snoozeMinutes}m`, action: "extend", body: { minutes: snoozeMinutes }, className: "btn-ghost" },
      ];
    default:
      return [];
  }
}

export default function RunActions({ run, snoozeMinutes, resumeGpuOption, onDone }: RunActionsProps) {
  const { pending, error, send } = useRunAction(run.run_id, onDone);
  if (run.status === "stopped") return null;

  const buttons = buttonsFor(run.status, snoozeMinutes, resumeGpuOption);

  return (
    <Panel>
      {run.status === "needs_triage" && (
        <div role="alert" className="alert alert-error alert-soft text-sm">
          This run looks broken, so LeaseGuard left it running for diagnosis. Type{" "}
          <code className="font-mono">/triage {run.run_id}</code> in the Telegram group for Kepler.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {buttons.map((b) => (
          <button
            key={b.key}
            className={`btn ${b.className} btn-sm`}
            disabled={pending !== null}
            onClick={() => void send(b.key, b.action, b.body)}
          >
            {pending === b.key ? <span className="loading loading-spinner loading-xs" /> : b.label}
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm ml-auto text-error"
          disabled={pending !== null}
          onClick={() => void send("stop", "stop")}
        >
          {pending === "stop" ? <span className="loading loading-spinner loading-xs" /> : "Stop guarding"}
        </button>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
    </Panel>
  );
}
