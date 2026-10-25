"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import DataTag from "@/components/leaseguard/DataTag";
import { useNow } from "@/hooks/useNow";
import { formatAbsolute } from "@/libs/leaseguard/format";

interface RefreshStatusProps {
  lastSuccessAt?: number;
  intervalMs: number;
  failing: boolean;
  demo: boolean;
  onRefresh: () => Promise<void>;
}

/** "Updated 8s ago" + manual refresh. Only manual refreshes are announced. */
export default function RefreshStatus({
  lastSuccessAt,
  intervalMs,
  failing,
  demo,
  onRefresh,
}: RefreshStatusProps) {
  const now = useNow(1_000);
  const [announcement, setAnnouncement] = useState("");
  // Only manual refreshes spin; background polls stay quiet.
  const [manual, setManual] = useState(false);
  const stale = lastSuccessAt !== undefined && now - lastSuccessAt > 2 * intervalMs;
  const ago = lastSuccessAt === undefined ? undefined : Math.max(0, Math.round((now - lastSuccessAt) / 1000));

  const handleRefresh = async () => {
    if (manual) return;
    setManual(true);
    setAnnouncement("");
    await onRefresh();
    setManual(false);
    setAnnouncement(`Refresh finished at ${new Date().toLocaleTimeString()}`);
  };

  return (
    <div className="flex items-center gap-2 text-sm text-base-content/75">
      {stale || failing ? <DataTag kind="stale" /> : <DataTag kind={demo ? "demo" : "live"} />}
      <span title={lastSuccessAt ? formatAbsolute(new Date(lastSuccessAt).toISOString()) : undefined}>
        {ago === undefined ? (
          "Not updated yet"
        ) : (
          <>
            Updated{" "}
            <span className="num">{ago < 60 ? `${ago}s` : `${Math.floor(ago / 60)}m ${ago % 60}s`}</span> ago
          </>
        )}
      </span>
      <button
        type="button"
        onClick={handleRefresh}
        aria-disabled={manual}
        className="btn btn-ghost btn-sm btn-square"
        aria-label="Refresh now"
      >
        <RefreshCw aria-hidden="true" className={`h-4 w-4 ${manual ? "motion-safe:animate-spin" : ""}`} />
      </button>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
