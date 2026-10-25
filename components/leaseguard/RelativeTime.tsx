"use client";

import { useNow } from "@/hooks/useNow";
import { formatAbsolute, formatRelative } from "@/libs/leaseguard/format";

/** "3 min ago" with the absolute local time in the tooltip and datetime attribute. */
export default function RelativeTime({ iso, className = "" }: { iso?: string; className?: string }) {
  const now = useNow(5_000);
  if (!iso) return <span className={`text-base-content/70 ${className}`}>Unavailable</span>;
  return (
    <time dateTime={iso} title={formatAbsolute(iso)} className={`num whitespace-nowrap ${className}`}>
      {formatRelative(iso, now)}
    </time>
  );
}
