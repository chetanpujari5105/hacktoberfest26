"use client";

import type { RunView } from "@/libs/backend-types";
import { usePolling } from "@/hooks/usePolling";
import { Panel } from "@/components/ui/Panel";
import LiveSavings from "@/components/LiveSavings";
import RunsTable from "./RunsTable";
import GuardRunForm from "./GuardRunForm";
import WalletCard from "./WalletCard";

interface RunsOverviewProps {
  pollIntervalMs: number;
  defaultHourlyCostInr: number;
}

export default function RunsOverview({ pollIntervalMs, defaultHourlyCostInr }: RunsOverviewProps) {
  const { data, error, loading, refresh } = usePolling<RunView[]>("/api/runs", pollIntervalMs);
  const runs = data ?? [];
  const needsTriage = runs.filter((run) => run.status === "needs_triage").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <WalletCard pollIntervalMs={pollIntervalMs} />
        <Panel title="Saved so far">
          <LiveSavings runs={runs} className="text-3xl font-bold text-primary" />
          <p className="text-xs text-base-content/50">Counts up while runs are paused</p>
        </Panel>
        <Panel title="Guarded runs">
          <p className="text-3xl font-bold tabular-nums">{runs.length}</p>
          <p className={`text-xs ${needsTriage ? "text-error" : "text-base-content/50"}`}>
            {needsTriage ? `${needsTriage} need Kepler triage` : "Nothing needs triage"}
          </p>
        </Panel>
      </div>

      <Panel
        title="Runs"
        actions={loading && !data ? <span className="loading loading-dots loading-sm" /> : null}
      >
        {error && (
          <div role="alert" className="alert alert-error alert-soft py-2 text-sm">
            {error}
          </div>
        )}
        {data && <RunsTable runs={runs} />}
      </Panel>

      <GuardRunForm defaultHourlyCostInr={defaultHourlyCostInr} onCreated={() => void refresh()} />
    </div>
  );
}
