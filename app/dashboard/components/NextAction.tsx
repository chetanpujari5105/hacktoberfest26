import Link from "next/link";
import { isTransitioning, needsDecision } from "@/libs/leaseguard/actions";
import type { Run } from "@/libs/leaseguard/types";

/**
 * The one obvious next step for a run. State-changing actions happen on the
 * detail page behind a confirm dialog, so this always links there.
 */
export default function NextAction({ run, block = false }: { run: Run; block?: boolean }) {
  const href = `/dashboard/runs/${encodeURIComponent(run.id)}`;
  const width = block ? "w-full" : "";

  if (isTransitioning(run)) {
    return (
      <span className={`inline-flex h-8 items-center justify-center gap-2 px-2 text-sm text-warning ${width}`}>
        <span className="loading loading-spinner loading-xs" aria-hidden="true" />
        Working…
      </span>
    );
  }

  const { label, className } = needsDecision(run)
    ? { label: "Decide", className: "btn-primary" }
    : run.status === "paused"
      ? { label: "Resume…", className: "btn-ghost border border-base-content/15" }
      : run.status === "failed"
        ? { label: "Investigate", className: "btn-ghost border border-error/40 text-error" }
        : { label: "Details", className: "btn-ghost text-base-content/80" };

  return (
    <Link href={href} className={`btn btn-sm relative z-10 ${className} ${width}`} aria-label={`${label}: ${run.name}`}>
      {label}
    </Link>
  );
}
