"use client";

import { useState } from "react";
import {
  Activity,
  BellRing,
  CirclePause,
  CirclePlay,
  CircleAlert,
  Clock,
  PiggyBank,
  Save,
  ShieldCheck,
  ShieldQuestion,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import RelativeTime from "@/components/leaseguard/RelativeTime";
import { formatAbsolute } from "@/libs/leaseguard/format";
import type { TimelineEvent, TimelineEventType } from "@/libs/leaseguard/types";

const ICONS: Record<TimelineEventType, { icon: LucideIcon; className: string }> = {
  guard_started: { icon: ShieldCheck, className: "text-accent" },
  probe: { icon: Activity, className: "text-base-content/75" },
  verdict: { icon: ShieldQuestion, className: "text-base-content/75" },
  telegram_sent: { icon: BellRing, className: "text-info" },
  user_decision: { icon: UserCheck, className: "text-base-content" },
  checkpoint: { icon: Save, className: "text-warning" },
  paused: { icon: CirclePause, className: "text-quiet" },
  resumed: { icon: CirclePlay, className: "text-accent" },
  extended: { icon: Clock, className: "text-base-content" },
  savings: { icon: PiggyBank, className: "text-info" },
  error: { icon: CircleAlert, className: "text-error" },
};

const INITIAL = 8;

/** Newest first, everywhere. */
export default function Timeline({ events }: { events?: TimelineEvent[] }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = (events ?? []).toSorted((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const shown = showAll ? sorted : sorted.slice(0, INITIAL);

  return (
    <section aria-labelledby="timeline-heading" className="panel p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="timeline-heading" className="text-base font-semibold tracking-tight">
          Timeline
        </h2>
        <span className="text-xs text-base-content/70">Newest first</span>
      </div>
      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-base-content/75">No guard events recorded yet.</p>
      ) : (
        <>
          <ol className="mt-4">
            {shown.map((e, i) => {
              const { icon: Icon, className } = ICONS[e.type];
              return (
                <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < shown.length - 1 && (
                    <span aria-hidden="true" className="absolute top-7 bottom-0 left-[13px] w-px bg-base-content/10" />
                  )}
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-base-300">
                    <Icon aria-hidden="true" className={`h-3.5 w-3.5 ${className}`} />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-base-content/70">
                        <RelativeTime iso={e.at} />
                        <span className="sr-only"> ({formatAbsolute(e.at)})</span>
                      </p>
                    </div>
                    {e.detail && <p className="mt-0.5 text-sm break-words text-base-content/75">{e.detail}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          {sorted.length > INITIAL && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="btn btn-ghost btn-sm mt-3 w-full border border-base-content/10"
            >
              {showAll ? "Show fewer events" : `Show all ${sorted.length} events`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
