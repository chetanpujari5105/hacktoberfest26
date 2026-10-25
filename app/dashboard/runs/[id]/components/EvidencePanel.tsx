import { Cpu, FileText, MemoryStick } from "lucide-react";
import UtilChart from "@/app/dashboard/runs/[id]/components/UtilChart";
import DataTag from "@/components/leaseguard/DataTag";
import RelativeTime from "@/components/leaseguard/RelativeTime";
import { formatGb } from "@/libs/leaseguard/format";
import type { Run } from "@/libs/leaseguard/types";

function Unavailable() {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-base-content/70">
      Unavailable <DataTag kind="unavailable" />
    </span>
  );
}

/** Primary panel: what the guard actually observed. */
export default function EvidencePanel({ run }: { run: Run }) {
  const probe = run.latestProbe;
  const memPct =
    probe?.memUsedMb !== undefined && probe.memTotalMb ? Math.round((probe.memUsedMb / probe.memTotalMb) * 100) : undefined;

  return (
    <section aria-labelledby="evidence-heading" className="panel space-y-5 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="evidence-heading" className="text-base font-semibold tracking-tight">
          Evidence
        </h2>
        <p className="text-xs text-base-content/75">
          Latest probe <RelativeTime iso={probe?.at} className="text-base-content" />
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <Cpu aria-hidden="true" className="h-4 w-4 text-base-content/70" />
          GPU utilization
        </h3>
        <UtilChart probes={run.probeHistory ?? (probe ? [probe] : [])} thresholdPct={run.policy.idleThresholdPct} />
      </div>

      <dl className="grid gap-4 border-t border-base-content/[0.07] pt-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <dt className="flex items-center gap-1.5 text-sm font-medium">
            <MemoryStick aria-hidden="true" className="h-4 w-4 text-base-content/70" />
            GPU memory
          </dt>
          <dd>
            {probe?.memUsedMb !== undefined && probe.memTotalMb !== undefined ? (
              <div className="space-y-1.5">
                <p className="num text-sm">
                  {formatGb(probe.memUsedMb)} <span className="text-base-content/70">/ {formatGb(probe.memTotalMb)}</span>
                  {memPct !== undefined && <span className="text-base-content/70"> · {memPct}%</span>}
                </p>
                <span
                  role="meter"
                  aria-label="GPU memory used"
                  aria-valuenow={memPct ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="relative block h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-base-content/10"
                >
                  <span className="absolute inset-y-0 left-0 rounded-full bg-base-content/55" style={{ width: `${memPct ?? 0}%` }} />
                </span>
              </div>
            ) : (
              <Unavailable />
            )}
          </dd>
        </div>
        <div className="min-w-0 space-y-1.5">
          <dt className="text-sm font-medium">Training process</dt>
          <dd className="space-y-0.5">
            {probe?.processName ? (
              <p className="num text-sm break-all">{probe.processName}</p>
            ) : (
              <Unavailable />
            )}
            {probe?.processStatus && <p className="num text-xs text-base-content/75">State: {probe.processStatus}</p>}
          </dd>
        </div>
      </dl>

      <div className="space-y-2 border-t border-base-content/[0.07] pt-4">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <FileText aria-hidden="true" className="h-4 w-4 text-base-content/70" />
          Recent training log
        </h3>
        {probe?.logExcerpt ? (
          <pre className="num max-h-56 overflow-y-auto rounded-lg bg-base-100 p-3 text-xs leading-relaxed whitespace-pre-wrap break-words text-base-content/90 ring-1 ring-base-content/[0.06] ring-inset">
            <code>{probe.logExcerpt}</code>
          </pre>
        ) : (
          <Unavailable />
        )}
      </div>
    </section>
  );
}
