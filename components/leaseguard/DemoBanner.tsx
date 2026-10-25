import { FlaskConical } from "lucide-react";

/** Persistent notice shown whenever any response came from the demo store. */
export default function DemoBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-xl border border-dashed border-warning/45 bg-warning/[0.06] px-4 py-3 text-sm"
    >
      <FlaskConical aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="min-w-0">
        <strong className="font-semibold text-warning">DEMO DATA — no real GPUs or Telegram messages are affected.</strong>{" "}
        <span className="text-base-content/75">
          Sample runs live in server memory and reset when the server restarts.
        </span>
      </p>
    </div>
  );
}
