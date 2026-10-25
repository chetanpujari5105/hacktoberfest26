"use client";

import { useNow } from "@/hooks/useNow";
import { formatAbsolute, formatCountdown } from "@/libs/leaseguard/format";

/** Live mm:ss countdown to an ISO deadline. Not announced on every tick. */
export default function Countdown({ to, className = "" }: { to: string; className?: string }) {
  const now = useNow(1_000);
  const remaining = Date.parse(to) - now;
  return (
    <time dateTime={to} title={formatAbsolute(to)} className={`num whitespace-nowrap ${className}`}>
      {remaining > 0 ? formatCountdown(remaining) : "any moment"}
    </time>
  );
}
