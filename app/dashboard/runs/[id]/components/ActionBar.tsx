"use client";

import { useState } from "react";
import { Clock, Cpu, Pause, Play, TimerReset } from "lucide-react";
import ConfirmDialog from "@/components/leaseguard/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { getAllowedActions, isTransitioning, needsDecision } from "@/libs/leaseguard/actions";
import { apiRequest } from "@/libs/leaseguard/client";
import { formatMinutes, formatMoney } from "@/libs/leaseguard/format";
import type { ApiError, Run, RunAction } from "@/libs/leaseguard/types";

export interface ActionBarOptions {
  keepMinutes: number;
  extendMinuteOptions: number[];
  gpuTypes: { value: string; label: string }[];
}

interface ActionBarProps extends ActionBarOptions {
  run: Run;
  onChanged: () => Promise<void>;
}

const ICONS: Record<RunAction, typeof Pause> = {
  pause: Pause,
  keep: TimerReset,
  extend: Clock,
  resume: Play,
  resume_other_gpu: Cpu,
};

/** Shows only the actions the backend (or getAllowedActions) allows; every one is confirmed. */
export default function ActionBar({ run, onChanged, keepMinutes, extendMinuteOptions, gpuTypes }: ActionBarProps) {
  const toast = useToast();
  const allowed = getAllowedActions(run);
  const [dialog, setDialog] = useState<RunAction | null>(null);
  const [pending, setPending] = useState<RunAction | null>(null);
  const [error, setError] = useState<ApiError>();
  const [minutes, setMinutes] = useState(extendMinuteOptions.includes(30) ? 30 : extendMinuteOptions[0]);
  const otherGpus = gpuTypes.filter((g) => g.value !== run.gpuType);
  const [gpuType, setGpuType] = useState(otherGpus[0]?.value ?? "");

  const rate = run.hourlyRate !== undefined ? ` (${formatMoney(run.hourlyRate)}/h)` : "";
  const gpuLabel = (value: string) => gpuTypes.find((g) => g.value === value)?.label ?? value;

  const labels: Record<RunAction, string> = {
    pause: "Pause after checkpoint",
    keep: `Keep running ${keepMinutes} min`,
    extend: "Extend lease…",
    resume: "Resume",
    resume_other_gpu: "Resume on another GPU…",
  };

  const open = (action: RunAction) => {
    setError(undefined);
    setDialog(action);
  };

  const close = () => {
    if (pending) return;
    setDialog(null);
    setError(undefined);
  };

  const perform = async (action: RunAction) => {
    setPending(action);
    setError(undefined);
    const base = `/api/runs/${encodeURIComponent(run.id)}` as const;
    const request =
      action === "pause" || action === "keep"
        ? apiRequest<Run>(`${base}/decide`, { method: "POST", body: { action } })
        : action === "extend"
          ? apiRequest<Run>(`${base}/extend`, { method: "POST", body: { minutes } })
          : apiRequest<Run>(`${base}/resume`, {
              method: "POST",
              body: action === "resume_other_gpu" ? { gpu_type: gpuType } : {},
            });
    const result = await request;
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDialog(null);
    const messages: Record<RunAction, string> = {
      pause: "Checkpoint started — the instance will pause shortly",
      keep: `Keeping ${run.name} running for ${keepMinutes} min`,
      extend: `Lease extended by ${formatMinutes(minutes)}`,
      resume: `Resuming ${run.name}`,
      resume_other_gpu: `Resuming ${run.name} on ${gpuLabel(gpuType)}`,
    };
    toast({ tone: "success", title: messages[action] });
    await onChanged();
  };

  if (allowed.length === 0) {
    return (
      <p className="rounded-xl border border-base-content/[0.07] px-4 py-3 text-sm text-base-content/75">
        {isTransitioning(run)
          ? "LeaseGuard is carrying out a decision. Actions are available again once it finishes."
          : "No actions are available for this run right now."}
      </p>
    );
  }

  const primary: RunAction | undefined = needsDecision(run) ? "pause" : allowed.includes("resume") ? "resume" : undefined;

  return (
    <>
      <div role="group" aria-label="Run actions" className="flex flex-wrap gap-2">
        {allowed.map((action) => {
          const Icon = ICONS[action];
          return (
            <button
              key={action}
              type="button"
              disabled={pending !== null}
              onClick={() => open(action)}
              className={`btn btn-sm h-9 gap-1.5 ${
                action === primary ? "btn-primary" : "btn-ghost border border-base-content/15"
              }`}
            >
              {pending === action ? (
                <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              ) : (
                <Icon aria-hidden="true" className="h-4 w-4" />
              )}
              {labels[action]}
            </button>
          );
        })}
      </div>

      <ConfirmDialog
        open={dialog === "pause"}
        title={`Pause ${run.name} after a checkpoint?`}
        confirmLabel="Checkpoint and pause"
        pendingLabel="Starting checkpoint…"
        pending={pending === "pause"}
        error={dialog === "pause" ? error : undefined}
        onConfirm={() => perform("pause")}
        onClose={close}
        consequence={
          <p>
            Saves a checkpoint, then stops the instance. Compute billing stops; storage is still billed. This does not
            delete your data, but make sure your training script supports resuming from checkpoints.
          </p>
        }
      />

      <ConfirmDialog
        open={dialog === "keep"}
        title={`Keep ${run.name} running for ${keepMinutes} min?`}
        confirmLabel={`Keep running ${keepMinutes} min`}
        pendingLabel="Saving decision…"
        tone="neutral"
        pending={pending === "keep"}
        error={dialog === "keep" ? error : undefined}
        onConfirm={() => perform("keep")}
        onClose={close}
        consequence={
          <p>
            LeaseGuard won&apos;t pause this run for the next {keepMinutes} minutes and compute keeps billing{rate}. If
            it still looks idle afterwards, you&apos;ll get another reminder.
          </p>
        }
      />

      <ConfirmDialog
        open={dialog === "extend"}
        title={`Extend the lease for ${run.name}?`}
        confirmLabel={`Extend by ${formatMinutes(minutes)}`}
        pendingLabel="Extending…"
        tone="neutral"
        pending={pending === "extend"}
        error={dialog === "extend" ? error : undefined}
        onConfirm={() => perform("extend")}
        onClose={close}
        consequence={
          <p>
            No reminders or automatic pause until the extension ends. Compute keeps billing{rate} the whole time.
          </p>
        }
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Extend by</legend>
          <div className="grid grid-cols-4 gap-2">
            {extendMinuteOptions.map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${
                  minutes === m ? "border-primary/60 bg-primary/[0.08] font-semibold" : "border-base-content/15"
                }`}
              >
                <input
                  type="radio"
                  name="extend-minutes"
                  value={m}
                  checked={minutes === m}
                  onChange={() => setMinutes(m)}
                  className="sr-only"
                />
                <span className="num">
                  {formatMinutes(m)}
                  {minutes === m && <span className="sr-only"> (selected)</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "resume"}
        title={`Resume ${run.name}?`}
        confirmLabel="Resume instance"
        pendingLabel="Resuming…"
        pending={pending === "resume"}
        error={dialog === "resume" ? error : undefined}
        onConfirm={() => perform("resume")}
        onClose={close}
        consequence={
          <p>
            Starts the instance again on the same GPU type ({gpuLabel(run.gpuType)}). Compute billing resumes{rate}.
            Your training script needs to pick up from its last checkpoint.
          </p>
        }
      />

      <ConfirmDialog
        open={dialog === "resume_other_gpu"}
        title={`Resume ${run.name} on another GPU?`}
        confirmLabel={`Resume on ${gpuLabel(gpuType)}`}
        pendingLabel="Resuming…"
        pending={pending === "resume_other_gpu"}
        error={dialog === "resume_other_gpu" ? error : undefined}
        onConfirm={() => perform("resume_other_gpu")}
        onClose={close}
        consequence={
          <p>
            Starts the instance from its saved state on a different GPU type. Compute billing resumes at that GPU&apos;s
            price, and availability depends on JarvisLabs capacity.
          </p>
        }
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">GPU type</span>
          <select
            value={gpuType}
            onChange={(e) => setGpuType(e.target.value)}
            className="select select-sm w-full border-base-content/15 bg-base-100"
          >
            {otherGpus.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      </ConfirmDialog>
    </>
  );
}
