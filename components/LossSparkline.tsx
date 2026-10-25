interface LossSparklineProps {
  losses: number[];
  width?: number;
  height?: number;
  className?: string;
}

const PADDING = 2;

function toPoints(values: number[], width: number, height: number): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = values.length > 1 ? (width - PADDING * 2) / (values.length - 1) : 0;
  return values
    .map((value, i) => {
      const x = PADDING + i * stepX;
      const y = PADDING + (1 - (value - min) / span) * (height - PADDING * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Inline SVG loss curve. Non-finite values (NaN loss) are dropped. */
export default function LossSparkline({
  losses,
  width = 120,
  height = 32,
  className,
}: LossSparklineProps) {
  const finite = losses.filter(Number.isFinite);
  if (finite.length < 2) {
    return <span className="text-xs text-base-content/40">no loss data</span>;
  }
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`text-primary ${className ?? ""}`}
      role="img"
      aria-label={`Loss curve, latest ${finite[finite.length - 1].toFixed(4)}`}
    >
      <polyline
        points={toPoints(finite, width, height)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
