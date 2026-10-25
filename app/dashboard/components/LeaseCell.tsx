import Countdown from "@/components/leaseguard/Countdown";
import RelativeTime from "@/components/leaseguard/RelativeTime";
import { hasAutoPauseDeadline, isTransitioning } from "@/libs/leaseguard/actions";
import type { Run } from "@/libs/leaseguard/types";

/** "Lease deadline / next check" summary shared by the table and card views. */
export default function LeaseCell({ run }: { run: Run }) {
  const { policy } = run;

  if (hasAutoPauseDeadline(run) && policy.deadlineAt) {
    return (
      <span className="text-sm">
        <span className="text-base-content/75">Auto-pause in </span>
        <Countdown to={policy.deadlineAt} className="font-semibold text-primary" />
      </span>
    );
  }
  if (isTransitioning(run)) return <span className="text-sm text-warning">Guard action in progress</span>;
  if (run.status === "paused") return <span className="text-sm text-base-content/75">Paused · storage billed</span>;
  if (policy.deadlineAt) {
    return (
      <span className="text-sm text-base-content/75">
        Reminder open until <RelativeTime iso={policy.deadlineAt} className="text-base-content" />
      </span>
    );
  }
  if (policy.nextCheckAt) {
    return (
      <span className="text-sm text-base-content/75">
        Next check <RelativeTime iso={policy.nextCheckAt} className="text-base-content" />
      </span>
    );
  }
  return <span className="text-sm text-base-content/70">Unavailable</span>;
}
