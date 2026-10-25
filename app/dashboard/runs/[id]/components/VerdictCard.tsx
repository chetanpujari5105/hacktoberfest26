import type { Verdict, VerdictAction } from "@/libs/backend-types";
import { formatTime } from "@/libs/runs";
import { Panel } from "@/components/ui/Panel";

interface VerdictCardProps {
  verdict: Verdict | null;
}

const ACTION_META: Record<VerdictAction, { label: string; className: string }> = {
  pause_run: { label: "pause_run", className: "badge-success" },
  keep_running: { label: "keep_running", className: "badge-info" },
  escalate_to_kepler: { label: "escalate_to_kepler", className: "badge-error" },
};

export default function VerdictCard({ verdict }: VerdictCardProps) {
  return (
    <Panel
      title="Gemma 4 verdict"
      actions={
        verdict && (
          <span className={`badge badge-sm ${verdict.source === "gemma" ? "badge-primary" : "badge-ghost"}`}>
            {verdict.source === "gemma" ? "Gemma 4" : "rules fallback"}
          </span>
        )
      }
    >
      {!verdict ? (
        <p className="text-sm text-base-content/50">
          No verdict yet. Gemma is only asked when the rules spot something suspicious.
        </p>
      ) : (
        <>
          <p className="font-mono text-sm">
            <span className={`badge ${ACTION_META[verdict.action].className}`}>
              {ACTION_META[verdict.action].label}
            </span>
          </p>
          <p className="text-sm">{verdict.reason}</p>
          {verdict.symptom && (
            <p className="text-sm text-error">Symptom: {verdict.symptom}</p>
          )}
          {verdict.recheck_minutes != null && (
            <p className="text-xs text-base-content/50">Recheck in {verdict.recheck_minutes} min</p>
          )}
          <p className="text-xs text-base-content/40">at {formatTime(verdict.at)}</p>
        </>
      )}
    </Panel>
  );
}
