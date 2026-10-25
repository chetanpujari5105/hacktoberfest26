import type { Probe } from "@/libs/backend-types";
import { formatTime } from "@/libs/runs";
import { Panel } from "@/components/ui/Panel";
import LossSparkline from "@/components/LossSparkline";

interface ProbeStatsProps {
  probe: Probe | null;
}

function lastFinite(values: number[]): number | null {
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite[finite.length - 1] : null;
}

export default function ProbeStats({ probe }: ProbeStatsProps) {
  if (!probe) {
    return (
      <Panel title="GPU & training">
        <p className="text-sm text-base-content/50">Waiting for the first probe…</p>
      </Panel>
    );
  }

  const latestLoss = lastFinite(probe.losses);

  return (
    <Panel
      title="GPU & training"
      actions={<span className="text-xs text-base-content/50">probed {formatTime(probe.at)}</span>}
    >
      <LossSparkline losses={probe.losses} width={320} height={80} className="w-full" />
      <div className="stats stats-vertical bg-transparent sm:stats-horizontal">
        <div className="stat px-2 py-1">
          <div className="stat-title">GPU util</div>
          <div className="stat-value text-xl">{Math.round(probe.gpu_util_pct)}%</div>
        </div>
        <div className="stat px-2 py-1">
          <div className="stat-title">GPU memory</div>
          <div className="stat-value text-xl">{Math.round(probe.gpu_mem_mb)} MB</div>
        </div>
        <div className="stat px-2 py-1">
          <div className="stat-title">Latest loss</div>
          <div className="stat-value text-xl">{latestLoss === null ? "—" : latestLoss.toFixed(4)}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`badge badge-sm ${probe.process_alive ? "badge-success" : "badge-error"}`}>
          process {probe.process_alive ? "alive" : "exited"}
        </span>
        <span className="badge badge-ghost badge-sm">
          last log {Math.round(probe.seconds_since_log)}s ago
        </span>
        {probe.error_hint && <span className="badge badge-error badge-sm">{probe.error_hint}</span>}
      </div>
    </Panel>
  );
}
