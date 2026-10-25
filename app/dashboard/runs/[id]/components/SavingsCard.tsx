import DataTag from "@/components/leaseguard/DataTag";
import { formatMoney } from "@/libs/leaseguard/format";
import type { Run } from "@/libs/leaseguard/types";

/** Savings are always shown as an estimate unless the API sends an explicit actual figure. */
export default function SavingsCard({ run }: { run: Run }) {
  const s = run.savings;
  return (
    <section aria-labelledby="savings-heading" className="panel space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="savings-heading" className="text-base font-semibold tracking-tight">
          Savings
        </h2>
        <DataTag kind={s?.estimatedComputeSaved !== undefined ? "estimated" : "unavailable"} />
      </div>
      <div>
        <p className="num text-2xl font-semibold">
          {s?.estimatedComputeSaved !== undefined ? formatMoney(s.estimatedComputeSaved, s.currency) : "—"}
        </p>
        <p className="mt-0.5 text-xs text-base-content/75">
          Estimated compute not billed{s?.period ? `, ${s.period}` : ""}
        </p>
      </div>
      {s?.actualComputeSaved !== undefined && (
        <p className="text-sm">
          Billed difference reported by backend:{" "}
          <span className="num font-medium">{formatMoney(s.actualComputeSaved, s.currency)}</span>
        </p>
      )}
      <p className="border-t border-base-content/[0.07] pt-3 text-xs leading-relaxed text-base-content/75">
        Pausing stops compute billing{run.hourlyRate !== undefined ? ` (${formatMoney(run.hourlyRate)}/h for this GPU)` : ""}.
        Storage is still billed while paused
        {s?.storageCostPerHour !== undefined ? (
          <>
            {" "}
            at about <span className="num">{formatMoney(s.storageCostPerHour, s.currency)}/h</span>
          </>
        ) : null}
        .
      </p>
    </section>
  );
}
