import Link from "next/link";
import { ArrowRight, BellRing } from "lucide-react";
import Countdown from "@/components/leaseguard/Countdown";
import { hasAutoPauseDeadline, needsDecision } from "@/libs/leaseguard/actions";
import type { Run } from "@/libs/leaseguard/types";

/** Only rendered when at least one run is waiting on the user. */
export default function AttentionStrip({ runs }: { runs: Run[] }) {
  const waiting = runs.filter(needsDecision);
  if (waiting.length === 0) return null;

  return (
    <section
      aria-label="Runs needing a decision"
      className="rounded-xl border border-primary/30 bg-primary/[0.07] px-4 py-3.5"
    >
      <div className="flex items-start gap-3">
        <BellRing aria-hidden="true" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold">
            {waiting.length === 1 ? "1 run needs a decision" : `${waiting.length} runs need a decision`}
          </p>
          <ul className="space-y-1.5">
            {waiting.slice(0, 3).map((run) => (
              <li key={run.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="num font-medium">{run.name}</span>
                <span className="text-base-content/75">
                  {hasAutoPauseDeadline(run) && run.policy.deadlineAt ? (
                    <>
                      auto-pauses in <Countdown to={run.policy.deadlineAt} className="font-medium text-primary" />
                    </>
                  ) : (
                    "is waiting — this policy won't pause it on its own"
                  )}
                </span>
                <Link
                  href={`/dashboard/runs/${encodeURIComponent(run.id)}`}
                  className="inline-flex items-center gap-1 rounded font-medium text-primary underline-offset-4 hover:underline"
                >
                  Review evidence
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
