import Link from "next/link";
import LeaseCell from "@/app/dashboard/components/LeaseCell";
import NextAction from "@/app/dashboard/components/NextAction";
import RelativeTime from "@/components/leaseguard/RelativeTime";
import StatusBadge from "@/components/leaseguard/StatusBadge";
import UtilBar from "@/components/leaseguard/UtilBar";
import { formatGpu } from "@/libs/leaseguard/format";
import type { Run } from "@/libs/leaseguard/types";

/** Below md: stacked cards instead of a table, no horizontal scrolling. */
export default function RunCardList({ runs, highlightId }: { runs: Run[]; highlightId?: string }) {
  return (
    <ul className="space-y-3 md:hidden" aria-label="Guarded GPU runs">
      {runs.map((run) => (
        <li
          key={run.id}
          className={`panel relative space-y-3 p-4 ${run.id === highlightId ? "ring-1 ring-accent/40" : ""}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/dashboard/runs/${encodeURIComponent(run.id)}`}
                className="num block truncate font-medium after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-[14px] focus-visible:after:outline-2 focus-visible:after:outline-primary"
              >
                {run.name}
              </Link>
              <p className="num mt-0.5 text-xs text-base-content/70">{formatGpu(run.gpuType, run.gpuCount)}</p>
            </div>
            <StatusBadge status={run.status} />
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <div className="col-span-2 flex items-center justify-between">
              <dt className="text-xs text-base-content/70">GPU util</dt>
              <dd>
                <UtilBar
                  value={run.status === "paused" ? undefined : run.latestProbe?.gpuUtilPct}
                  threshold={run.policy.idleThresholdPct}
                />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-base-content/70">Last checked</dt>
              <dd className="mt-0.5">
                <RelativeTime iso={run.latestProbe?.at} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-base-content/70">Lease</dt>
              <dd className="mt-0.5">
                <LeaseCell run={run} />
              </dd>
            </div>
          </dl>
          <NextAction run={run} block />
        </li>
      ))}
    </ul>
  );
}
