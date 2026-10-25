import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Countdown from "@/components/leaseguard/Countdown";
import RelativeTime from "@/components/leaseguard/RelativeTime";
import StatusBadge from "@/components/leaseguard/StatusBadge";
import { hasAutoPauseDeadline, isTransitioning, needsDecision } from "@/libs/leaseguard/actions";
import { formatGpu } from "@/libs/leaseguard/format";
import type { Run } from "@/libs/leaseguard/types";

function guardStatus(run: Run): string {
  if (run.status === "paused") return "Standing by — instance paused";
  if (run.status === "failed") return "Stopped — last action failed";
  if (isTransitioning(run)) return "Carrying out a decision";
  if (needsDecision(run)) {
    return run.policy.onNoResponse === "checkpoint_and_pause" ? "Waiting for your reply" : "Reminder sent (notify only)";
  }
  return run.policy.checkIntervalMin ? `Watching every ${run.policy.checkIntervalMin} min` : "Watching";
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-base-content/70">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">{children}</dd>
    </div>
  );
}

export default function RunHeader({ run }: { run: Run }) {
  const autoPause = hasAutoPauseDeadline(run) && run.policy.deadlineAt;

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded text-sm text-base-content/75 hover:text-base-content"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        All runs
      </Link>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="num text-2xl font-semibold break-all sm:text-[28px]">{run.name}</h1>
          <p className="num mt-1 text-sm text-base-content/75">
            {formatGpu(run.gpuType, run.gpuCount)} · machine {run.machineId}
          </p>
        </div>
        <StatusBadge status={run.status} size="md" />
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-base-content/[0.07] px-4 py-3 sm:grid-cols-3 xl:grid-cols-5">
        <Fact label="Provider status">{run.providerStatus ?? <span className="text-base-content/70">Unavailable</span>}</Fact>
        <Fact label="Guard">{guardStatus(run)}</Fact>
        <Fact label="Last probe">
          <RelativeTime iso={run.latestProbe?.at} />
        </Fact>
        <Fact label="Next check">
          {run.policy.nextCheckAt ? <RelativeTime iso={run.policy.nextCheckAt} /> : <span className="text-base-content/70">Not scheduled</span>}
        </Fact>
        <Fact label="Auto-pause">
          {autoPause ? (
            <span className="font-semibold text-primary">
              in <Countdown to={autoPause} />
            </span>
          ) : (
            <span className="text-base-content/70">{run.policy.onNoResponse === "notify_only" ? "Never (notify only)" : "Not pending"}</span>
          )}
        </Fact>
      </dl>
    </div>
  );
}
