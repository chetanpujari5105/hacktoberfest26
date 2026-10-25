import RelativeTime from "@/components/leaseguard/RelativeTime";
import { formatMinutes, NO_RESPONSE_LABEL } from "@/libs/leaseguard/format";
import type { LeasePolicy } from "@/libs/leaseguard/types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-base-content/75">{label}</dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  );
}

export default function PolicyCard({ policy }: { policy: LeasePolicy }) {
  const { lastDecision } = policy;
  return (
    <section aria-labelledby="policy-heading" className="panel p-4 sm:p-5">
      <h2 id="policy-heading" className="text-base font-semibold tracking-tight">
        Lease policy
      </h2>
      <dl className="mt-2 divide-y divide-base-content/[0.06]">
        <Row label="Check every">
          <span className="num">{policy.checkIntervalMin ? formatMinutes(policy.checkIntervalMin) : "—"}</span>
        </Row>
        <Row label="Idle when GPU below">
          <span className="num">
            {policy.idleThresholdPct}% for {formatMinutes(policy.idleWindowMin)}
          </span>
        </Row>
        <Row label="Reply window">
          <span className="num">{formatMinutes(policy.reminderTimeoutMin)}</span>
        </Row>
        <Row label="If you don't reply">
          <span className={policy.onNoResponse === "checkpoint_and_pause" ? "font-medium" : ""}>
            {NO_RESPONSE_LABEL[policy.onNoResponse]}
          </span>
        </Row>
        <Row label="Next check">
          {policy.nextCheckAt ? <RelativeTime iso={policy.nextCheckAt} /> : <span className="text-base-content/70">Not scheduled</span>}
        </Row>
        {policy.deadlineAt && (
          <Row label="Reply deadline">
            <RelativeTime iso={policy.deadlineAt} />
          </Row>
        )}
        <Row label="Last decision">
          {lastDecision ? (
            <span>
              <span className="capitalize">{lastDecision.action}</span>
              <span className="text-base-content/70"> by {lastDecision.by === "user" ? "you" : "policy"} · </span>
              <RelativeTime iso={lastDecision.at} className="text-base-content/80" />
            </span>
          ) : (
            <span className="text-base-content/70">None yet</span>
          )}
        </Row>
      </dl>
    </section>
  );
}
