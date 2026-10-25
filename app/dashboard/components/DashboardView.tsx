"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, ShieldPlus } from "lucide-react";
import AttentionStrip from "@/app/dashboard/components/AttentionStrip";
import { DashboardBodySkeleton } from "@/app/dashboard/components/DashboardSkeleton";
import GuardRunDialog from "@/app/dashboard/components/GuardRunDialog";
import MetricStrip from "@/app/dashboard/components/MetricStrip";
import RunCardList from "@/app/dashboard/components/RunCardList";
import RunFilters, { type RunFilter } from "@/app/dashboard/components/RunFilters";
import RunsTable from "@/app/dashboard/components/RunsTable";
import TelegramPanel from "@/app/dashboard/components/TelegramPanel";
import WalletChip from "@/app/dashboard/components/WalletChip";
import DemoBanner from "@/components/leaseguard/DemoBanner";
import EmptyState from "@/components/leaseguard/EmptyState";
import ErrorState from "@/components/leaseguard/ErrorState";
import InlineError from "@/components/leaseguard/InlineError";
import RefreshStatus from "@/components/leaseguard/RefreshStatus";
import { usePolling } from "@/hooks/usePolling";
import { useToast } from "@/hooks/useToast";
import { isTransitioning, needsDecision } from "@/libs/leaseguard/actions";
import { apiRequest } from "@/libs/leaseguard/client";
import type { Run, RunStatus, Wallet } from "@/libs/leaseguard/types";

const STATUS_ORDER: Record<RunStatus, number> = {
  suspicious: 0,
  needs_attention: 0,
  failed: 1,
  checkpointing: 2,
  pausing: 2,
  resuming: 2,
  running: 3,
  paused: 4,
};

function matchesFilter(run: Run, filter: RunFilter): boolean {
  switch (filter) {
    case "attention":
      return needsDecision(run) || run.status === "failed";
    case "running":
      return run.status === "running" || isTransitioning(run);
    case "paused":
      return run.status === "paused";
    default:
      return true;
  }
}

const fetchRuns = (signal: AbortSignal) => apiRequest<Run[]>("/api/runs", { signal });
const fetchWallet = (signal: AbortSignal) => apiRequest<Wallet>("/api/wallet", { signal });

export default function DashboardView({ pollIntervalMs, maxBackoffMs }: { pollIntervalMs: number; maxBackoffMs: number }) {
  const runsQ = usePolling(fetchRuns, pollIntervalMs, maxBackoffMs);
  const walletQ = usePolling(fetchWallet, pollIntervalMs, maxBackoffMs);
  const toast = useToast();
  const [filter, setFilter] = useState<RunFilter>("all");
  const [query, setQuery] = useState("");
  const [guardOpen, setGuardOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string>();

  const demo = runsQ.meta?.demo === true || walletQ.meta?.demo === true;
  const runs = runsQ.data;

  const sorted = useMemo(
    () =>
      (runs ?? []).toSorted(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name)
      ),
    [runs]
  );

  const counts = useMemo(
    () => ({
      all: sorted.length,
      attention: sorted.filter((r) => matchesFilter(r, "attention")).length,
      running: sorted.filter((r) => matchesFilter(r, "running")).length,
      paused: sorted.filter((r) => matchesFilter(r, "paused")).length,
    }),
    [sorted]
  );

  const q = query.trim().toLowerCase();
  const visible = sorted.filter(
    (r) => matchesFilter(r, filter) && (!q || r.name.toLowerCase().includes(q) || r.gpuType.toLowerCase().includes(q))
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([runsQ.refresh(), walletQ.refresh()]);
  }, [runsQ, walletQ]);

  const handleStarted = useCallback(
    (run: Run) => {
      setGuardOpen(false);
      setFilter("all");
      setQuery("");
      setHighlightId(run.id);
      toast({ tone: "success", title: `Guard started on ${run.name}`, description: "First verdict arrives after the initial probes." });
      void runsQ.refresh();
    },
    [runsQ, toast]
  );

  const guardButton = (
    <button type="button" className="btn btn-primary btn-sm h-9 gap-1.5" onClick={() => setGuardOpen(true)}>
      <Plus aria-hidden="true" className="h-4 w-4" />
      Guard a run
    </button>
  );

  return (
    <div className="space-y-6">
      {demo && <DemoBanner />}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">GPU runs</h1>
          <p className="mt-1 text-sm text-base-content/70">
            What each guarded JarvisLabs instance is doing right now, and what happens if you walk away.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <WalletChip wallet={walletQ.data} error={walletQ.error} loading={walletQ.isLoading} demo={walletQ.meta?.demo === true} />
          <RefreshStatus
            lastSuccessAt={runsQ.lastSuccessAt}
            intervalMs={pollIntervalMs}
            refreshing={runsQ.isRefreshing}
            failing={!!runsQ.error && !!runsQ.data}
            demo={demo}
            onRefresh={refreshAll}
          />
          {guardButton}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="min-w-0 space-y-6">
          {runsQ.isLoading ? (
            <DashboardBodySkeleton />
          ) : !runs && runsQ.error ? (
            <ErrorState error={runsQ.error} onRetry={refreshAll} retrying={runsQ.isRefreshing} />
          ) : runs && runs.length === 0 ? (
            <EmptyState icon={ShieldPlus} title="No runs are being guarded yet" action={guardButton}>
              Pick a running JarvisLabs instance and a policy. LeaseGuard probes it on a schedule — GPU utilization,
              memory, process state and training logs — and asks you on Telegram before it pauses anything.
            </EmptyState>
          ) : (
            <>
              {runsQ.error && (
                <InlineError
                  error={{ ...runsQ.error, message: `Couldn't refresh — showing the last good data. ${runsQ.error.message}` }}
                  onRetry={refreshAll}
                />
              )}
              <AttentionStrip runs={sorted} />
              <MetricStrip runs={sorted} wallet={walletQ.data} />
              <section aria-labelledby="runs-heading" className="space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h2 id="runs-heading" className="text-base font-semibold tracking-tight">
                    Running instances
                  </h2>
                  <RunFilters filter={filter} onFilter={setFilter} counts={counts} query={query} onQuery={setQuery} />
                </div>
                {visible.length === 0 ? (
                  <div className="panel flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-base-content/75">
                    <p>No runs match {q ? <>“{query.trim()}” in </> : null}this view.</p>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm border border-base-content/15"
                      onClick={() => {
                        setFilter("all");
                        setQuery("");
                      }}
                    >
                      Show all runs
                    </button>
                  </div>
                ) : (
                  <>
                    <RunsTable runs={visible} highlightId={highlightId} />
                    <RunCardList runs={visible} highlightId={highlightId} />
                  </>
                )}
              </section>
            </>
          )}
        </div>
        <aside aria-label="Notifications setup" className="min-w-0">
          <TelegramPanel pollIntervalMs={pollIntervalMs * 4} />
        </aside>
      </div>

      <GuardRunDialog open={guardOpen} onClose={() => setGuardOpen(false)} onStarted={handleStarted} />
    </div>
  );
}
