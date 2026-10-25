import { BellRing, Cpu, PiggyBank, ShieldCheck } from "lucide-react";
import DataTag from "@/components/leaseguard/DataTag";
import MetricCard from "@/components/leaseguard/MetricCard";
import { needsDecision } from "@/libs/leaseguard/actions";
import { formatMoney } from "@/libs/leaseguard/format";
import type { Run, Wallet } from "@/libs/leaseguard/types";

export default function MetricStrip({ runs, wallet }: { runs: Run[]; wallet?: Wallet }) {
  const live = runs.filter((r) => r.status !== "paused" && r.status !== "failed");
  const gpus = live.reduce((n, r) => n + r.gpuCount, 0);
  const paused = runs.filter((r) => r.status === "paused").length;
  const attention = runs.filter(needsDecision).length;

  const withSavings = runs.filter((r) => r.savings?.estimatedComputeSaved !== undefined);
  const savings = withSavings.reduce((sum, r) => sum + (r.savings?.estimatedComputeSaved ?? 0), 0);
  const currency = withSavings[0]?.savings?.currency ?? "USD";

  return (
    <section aria-label="Summary" className="panel grid grid-cols-2 lg:grid-cols-4 [&>*]:border-base-content/[0.07] [&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r lg:[&>*:not(:last-child)]:border-r">
      <MetricCard
        label="Guarded runs"
        icon={ShieldCheck}
        value={runs.length}
        footnote={paused ? `${paused} paused` : "None paused"}
      />
      <MetricCard
        label="GPUs running"
        icon={Cpu}
        value={gpus}
        footnote={
          wallet?.burnRatePerHour !== undefined
            ? `Burning ${formatMoney(wallet.burnRatePerHour, wallet.currency)}/h`
            : `Across ${live.length} instance${live.length === 1 ? "" : "s"}`
        }
      />
      <MetricCard
        label="Needs attention"
        icon={BellRing}
        value={attention}
        emphasis={attention > 0}
        footnote={attention > 0 ? "Waiting on your decision" : "All quiet"}
      />
      <MetricCard
        label="Estimated savings"
        icon={PiggyBank}
        tag={<DataTag kind={withSavings.length ? "estimated" : "unavailable"} />}
        value={withSavings.length ? formatMoney(savings, currency) : "—"}
        footnote="Compute not billed while paused"
      />
    </section>
  );
}
