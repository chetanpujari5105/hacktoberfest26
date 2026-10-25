import { formatPct } from "@/libs/leaseguard/format";

interface UtilBarProps {
  value?: number;
  /** Values below this read as idle and use the attention tone. */
  threshold?: number;
  muted?: boolean;
  className?: string;
}

/** Inline GPU-utilization meter. The % text always accompanies the bar. */
export default function UtilBar({ value, threshold, muted, className = "" }: UtilBarProps) {
  if (value === undefined) {
    return <span className="text-sm text-base-content/70">Unavailable</span>;
  }
  const pct = Math.max(0, Math.min(100, value));
  const idle = threshold !== undefined && pct < threshold;
  const fill = muted ? "bg-quiet" : idle ? "bg-primary" : "bg-accent";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="num w-10 text-right text-sm">{formatPct(pct)}</span>
      <span
        role="meter"
        aria-label="GPU utilization"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-1.5 w-16 overflow-hidden rounded-full bg-base-content/10"
      >
        <span className={`absolute inset-y-0 left-0 rounded-full ${fill}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </span>
      {idle && !muted && <span className="text-xs font-medium text-primary">idle</span>}
    </span>
  );
}
