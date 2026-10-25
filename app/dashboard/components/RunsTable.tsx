import Link from "next/link";
import LeaseCell from "@/app/dashboard/components/LeaseCell";
import NextAction from "@/app/dashboard/components/NextAction";
import RelativeTime from "@/components/leaseguard/RelativeTime";
import StatusBadge from "@/components/leaseguard/StatusBadge";
import UtilBar from "@/components/leaseguard/UtilBar";
import { formatGpu } from "@/libs/leaseguard/format";
import type { Run } from "@/libs/leaseguard/types";

/** md+ table. Each row links to its detail page via the run name. */
export default function RunsTable({ runs, highlightId }: { runs: Run[]; highlightId?: string }) {
  return (
    <div className="panel hidden overflow-hidden md:block">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Guarded GPU runs</caption>
        <thead>
          <tr className="border-b border-base-content/[0.07] text-xs text-base-content/70">
            <th scope="col" className="px-4 py-2.5 font-medium">Run</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-3 py-2.5 font-medium">GPU util</th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">Last checked</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Lease</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              <span className="sr-only">Next action</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-content/[0.06]">
          {runs.map((run) => (
            <tr
              key={run.id}
              className={`relative transition-colors hover:bg-base-content/[0.025] ${
                run.id === highlightId ? "bg-accent/[0.05]" : ""
              }`}
            >
              <td className="px-4 py-3.5">
                <Link
                  href={`/dashboard/runs/${encodeURIComponent(run.id)}`}
                  className="num font-medium after:absolute after:inset-0 after:content-[''] hover:text-primary focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:outline-2 focus-visible:after:outline-primary"
                >
                  {run.name}
                </Link>
                <p className="num mt-0.5 text-xs text-base-content/70">{formatGpu(run.gpuType, run.gpuCount)}</p>
              </td>
              <td className="px-3 py-3.5">
                <StatusBadge status={run.status} />
              </td>
              <td className="px-3 py-3.5">
                <UtilBar
                  value={run.status === "paused" ? undefined : run.latestProbe?.gpuUtilPct}
                  threshold={run.policy.idleThresholdPct}
                />
              </td>
              <td className="hidden px-3 py-3.5 text-base-content/80 lg:table-cell">
                <RelativeTime iso={run.latestProbe?.at} />
              </td>
              <td className="px-3 py-3.5">
                <LeaseCell run={run} />
              </td>
              <td className="px-4 py-3.5 text-right">
                <NextAction run={run} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
