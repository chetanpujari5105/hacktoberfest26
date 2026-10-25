import Link from "next/link";
import type { RunView } from "@/libs/backend-types";
import RunStatusBadge from "@/components/RunStatusBadge";
import LossSparkline from "@/components/LossSparkline";
import LiveSavings from "@/components/LiveSavings";

interface RunsTableProps {
  runs: RunView[];
}

export default function RunsTable({ runs }: RunsTableProps) {
  if (runs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-base-content/50">
        No guarded runs yet. Guard a Jarvislabs instance below.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Run</th>
            <th>Status</th>
            <th>GPU</th>
            <th>Loss</th>
            <th>Verdict</th>
            <th className="text-right">Saved</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.run_id} className="hover">
              <td>
                <Link href={`/dashboard/runs/${run.run_id}`} className="link link-hover font-medium">
                  {run.name}
                </Link>
                <p className="text-xs text-base-content/50">
                  {run.run_id} · machine {run.machine_id}
                </p>
              </td>
              <td>
                <RunStatusBadge status={run.status} stale={run.stale} />
              </td>
              <td className="tabular-nums">
                {run.last_probe ? `${Math.round(run.last_probe.gpu_util_pct)}%` : "—"}
                {run.gpu_type && <p className="text-xs text-base-content/50">{run.gpu_type}</p>}
              </td>
              <td>
                <LossSparkline losses={run.last_probe?.losses ?? []} />
              </td>
              <td className="max-w-xs truncate text-xs text-base-content/70">
                {run.last_verdict?.reason ?? "—"}
              </td>
              <td className="text-right">
                <LiveSavings runs={[run]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
