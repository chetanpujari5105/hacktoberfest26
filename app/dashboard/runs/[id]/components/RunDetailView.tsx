"use client";

import { useCallback, useState } from "react";
import { BellRing, LoaderCircle } from "lucide-react";
import ActionBar, { type ActionBarOptions } from "@/app/dashboard/runs/[id]/components/ActionBar";
import EvidencePanel from "@/app/dashboard/runs/[id]/components/EvidencePanel";
import PolicyCard from "@/app/dashboard/runs/[id]/components/PolicyCard";
import RunDetailSkeleton from "@/app/dashboard/runs/[id]/components/RunDetailSkeleton";
import RunHeader from "@/app/dashboard/runs/[id]/components/RunHeader";
import RunNotFound from "@/app/dashboard/runs/[id]/components/RunNotFound";
import SavingsCard from "@/app/dashboard/runs/[id]/components/SavingsCard";
import Timeline from "@/app/dashboard/runs/[id]/components/Timeline";
import VerdictCard from "@/app/dashboard/runs/[id]/components/VerdictCard";
import Countdown from "@/components/leaseguard/Countdown";
import DemoBanner from "@/components/leaseguard/DemoBanner";
import ErrorState from "@/components/leaseguard/ErrorState";
import InlineError from "@/components/leaseguard/InlineError";
import RefreshStatus from "@/components/leaseguard/RefreshStatus";
import { usePolling } from "@/hooks/usePolling";
import { hasAutoPauseDeadline, isTransitioning } from "@/libs/leaseguard/actions";
import { apiRequest } from "@/libs/leaseguard/client";
import type { Run } from "@/libs/leaseguard/types";

interface RunDetailViewProps extends ActionBarOptions {
  id: string;
  pollIntervalMs: number;
  maxBackoffMs: number;
}

export default function RunDetailView({ id, pollIntervalMs, maxBackoffMs, ...actionOptions }: RunDetailViewProps) {
  const fetchRun = useCallback(
    (signal: AbortSignal) => apiRequest<Run>(`/api/runs/${encodeURIComponent(id)}`, { signal }),
    [id]
  );
  // Poll faster while a pause/resume is in flight so each phase is visible.
  const [fast, setFast] = useState(false);
  const runQ = usePolling(fetchRun, fast ? 3_000 : pollIntervalMs, maxBackoffMs);
  const run = runQ.data;
  const transitioning = run ? isTransitioning(run) : false;
  if (transitioning !== fast) setFast(transitioning);
  const demo = runQ.meta?.demo === true;

  if (runQ.isLoading) return <RunDetailSkeleton />;
  if (!run && runQ.error?.code === "NOT_FOUND") return <RunNotFound id={id} />;
  if (!run && runQ.error) {
    return (
      <div className="space-y-6">
        {demo && <DemoBanner />}
        <h1 className="sr-only">Run {id}</h1>
        <ErrorState title="Couldn't load this run" error={runQ.error} onRetry={runQ.refresh} retrying={runQ.isRefreshing} />
      </div>
    );
  }
  if (!run) return <RunDetailSkeleton />;

  const timeline = <Timeline events={run.timeline} />;

  return (
    <div className="space-y-6">
      {demo && <DemoBanner />}
      <RunHeader run={run} />

      {hasAutoPauseDeadline(run) && run.policy.deadlineAt && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/[0.07] px-4 py-3 text-sm">
          <BellRing aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            <strong className="font-semibold">
              Auto-pause in <Countdown to={run.policy.deadlineAt} className="text-primary" /> unless you respond.
            </strong>{" "}
            <span className="text-base-content/80">
              A Telegram reminder was sent. If nobody answers, LeaseGuard saves a checkpoint and pauses this instance.
            </span>
          </p>
        </div>
      )}
      {isTransitioning(run) && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/[0.06] px-4 py-3 text-sm">
          <LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-warning motion-safe:animate-spin" />
          <p>
            {run.status === "resuming"
              ? "Resuming — the instance is starting up."
              : "Saving a checkpoint, then pausing. This usually takes a minute."}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ActionBar run={run} onChanged={runQ.refresh} {...actionOptions} />
        <RefreshStatus
          lastSuccessAt={runQ.lastSuccessAt}
          intervalMs={pollIntervalMs}
          failing={!!runQ.error}
          demo={demo}
          onRefresh={runQ.refresh}
        />
      </div>

      {runQ.error && (
        <InlineError
          polite
          error={{ ...runQ.error, message: `Couldn't refresh — showing the last good data. ${runQ.error.message}` }}
          onRetry={runQ.refresh}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <EvidencePanel run={run} />
          <div className="max-lg:hidden">{timeline}</div>
        </div>
        <div className="min-w-0 space-y-6">
          <VerdictCard verdict={run.verdict} />
          <PolicyCard policy={run.policy} />
          <SavingsCard run={run} />
          <div className="lg:hidden">{timeline}</div>
        </div>
      </div>
    </div>
  );
}
