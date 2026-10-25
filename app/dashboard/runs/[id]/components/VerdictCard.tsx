import RelativeTime from "@/components/leaseguard/RelativeTime";
import VerdictBadge from "@/components/leaseguard/VerdictBadge";
import type { Verdict } from "@/libs/leaseguard/types";

/** Secondary to the evidence: the guard's conclusion, never more than the backend said. */
export default function VerdictCard({ verdict }: { verdict?: Verdict }) {
  return (
    <section aria-labelledby="verdict-heading" className="panel space-y-4 p-4 sm:p-5">
      <h2 id="verdict-heading" className="text-base font-semibold tracking-tight">
        Verdict
      </h2>
      {!verdict ? (
        <p className="text-sm text-base-content/75">The guard hasn&apos;t produced a verdict for this run yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <VerdictBadge kind={verdict.kind} size="md" />
            {verdict.confidence !== undefined && (
              <span className="num text-xs text-base-content/75">Confidence {Math.round(verdict.confidence * 100)}%</span>
            )}
          </div>
          <p className="text-sm leading-relaxed">{verdict.reason}</p>
          {verdict.evidence && verdict.evidence.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-base-content/75">Observed</h3>
              <ul className="mt-1.5 space-y-1.5 text-sm">
                {verdict.evidence.map((e) => (
                  <li key={e} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-base-content/50" />
                    <span className="text-base-content/90">{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {verdict.aiExplanation && (
            <div className="rounded-lg bg-base-100/60 p-3 ring-1 ring-base-content/[0.06] ring-inset">
              <h3 className="text-xs font-medium text-base-content/75">AI explanation — based on the evidence above</h3>
              <p className="mt-1 text-sm leading-relaxed text-base-content/80">{verdict.aiExplanation}</p>
            </div>
          )}
          <p className="text-xs text-base-content/70">
            Observed <RelativeTime iso={verdict.observedAt} />
          </p>
        </>
      )}
    </section>
  );
}
