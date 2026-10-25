"use client";

import type { RunView } from "@/libs/backend-types";
import { usePolling } from "@/hooks/usePolling";
import { formatInr } from "@/libs/runs";
import { Panel } from "@/components/ui/Panel";
import RunStatusBadge from "@/components/RunStatusBadge";
import LiveSavings from "@/components/LiveSavings";
import ProbeStats from "./ProbeStats";
import VerdictCard from "./VerdictCard";
import RunActions from "./RunActions";
import EventsTimeline from "./EventsTimeline";

interface RunDetailProps {
  runId: string;
  pollIntervalMs: number;
  snoozeMinutes: number;
  resumeGpuOption: string;
}

export default function RunDetail({ runId, pollIntervalMs, snoozeMinutes, resumeGpuOption }: RunDetailProps) {
  const { data: run, error, loading, refresh } = usePolling<RunView>(
    `/api/runs/${encodeURIComponent(runId)}`,
    pollIntervalMs
  );

  if (loading && !run) return <span className="loading loading-dots loading-md" />;
  if (!run) {
    return (
      <div role="alert" className="alert alert-error alert-soft">
        {error ?? "Run not found"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            {run.name} <RunStatusBadge status={run.status} stale={run.stale} />
          </h1>
          <p className="text-sm text-base-content/50">
            {run.run_id} · machine {run.machine_id}
            {run.gpu_type ? ` · ${run.gpu_type}` : ""} · {formatInr(run.hourly_cost_inr)}/h
          </p>
        </div>
        <div className="text-right">
          <LiveSavings runs={[run]} className="text-2xl font-bold text-primary" />
          <p className="text-xs text-base-content/50">saved</p>
        </div>
      </header>

      {error && (
        <div role="alert" className="alert alert-warning alert-soft py-2 text-sm">
          Showing last known state: {error}
        </div>
      )}

      <RunActions
        run={run}
        snoozeMinutes={snoozeMinutes}
        resumeGpuOption={resumeGpuOption}
        onDone={() => void refresh()}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProbeStats probe={run.last_probe} />
        <VerdictCard verdict={run.last_verdict} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <EventsTimeline events={run.events} />
        <Panel title="Log tail">
          <pre className="max-h-80 overflow-auto rounded-box bg-base-300 p-3 font-mono text-xs whitespace-pre-wrap">
            {run.last_probe?.log_tail || "No log output yet"}
          </pre>
        </Panel>
      </div>
    </div>
  );
}
