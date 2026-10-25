import type { RunEvent } from "@/libs/backend-types";
import { formatTime } from "@/libs/runs";
import { Panel } from "@/components/ui/Panel";

interface EventsTimelineProps {
  events: RunEvent[];
}

export default function EventsTimeline({ events }: EventsTimelineProps) {
  const newestFirst = [...events].reverse();

  return (
    <Panel title="Timeline">
      {newestFirst.length === 0 ? (
        <p className="text-sm text-base-content/50">No events yet.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-auto">
          {newestFirst.map((event, i) => (
            <li key={`${event.at}-${i}`} className="flex gap-3 text-sm">
              <span className="w-20 shrink-0 font-mono text-xs text-base-content/50">
                {formatTime(event.at)}
              </span>
              <span className="badge badge-ghost badge-sm shrink-0">{event.kind}</span>
              <span className="text-base-content/80">{event.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
