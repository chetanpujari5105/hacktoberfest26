"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatAbsolute, formatClock, formatMinutes } from "@/libs/leaseguard/format";
import type { Probe } from "@/libs/leaseguard/types";

interface UtilChartProps {
  probes: Probe[];
  thresholdPct: number;
}

const HEIGHT = 184;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };
const Y_TICKS = [0, 25, 50, 75, 100];

interface Point {
  t: number;
  v: number;
  at: string;
}

function summarise(points: Point[], threshold: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  const spanMin = Math.round((last.t - first.t) / 60_000);
  const values = points.map((p) => p.v);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  let idleSince: Point | undefined;
  for (let i = points.length - 1; i >= 0 && points[i].v < threshold; i--) idleSince = points[i];
  const idlePart = idleSince
    ? ` Below the ${threshold}% idle threshold for the last ${formatMinutes(Math.max(1, Math.round((last.t - idleSince.t) / 60_000)))}.`
    : ` The latest reading is above the ${threshold}% idle threshold.`;
  return `GPU utilization over the last ${formatMinutes(Math.max(1, spanMin))}: latest ${Math.round(last.v)}%, average ${Math.round(
    avg
  )}%, range ${Math.round(Math.min(...values))}–${Math.round(Math.max(...values))}%.${idlePart}`;
}

/** Hand-drawn SVG area chart of GPU utilization with the idle threshold dashed. */
export default function UtilChart({ probes, thresholdPct }: UtilChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const summaryId = useId();
  const gradientId = `util-fill-${summaryId.replace(/[^A-Za-z0-9_-]/g, "")}`;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = useMemo<Point[]>(
    () =>
      probes
        .filter((p): p is Probe & { gpuUtilPct: number } => p.gpuUtilPct !== undefined)
        .map((p) => ({ t: Date.parse(p.at), v: Math.max(0, Math.min(100, p.gpuUtilPct)), at: p.at })),
    [probes]
  );

  if (points.length < 2) {
    return (
      <div className="grid h-[184px] place-items-center rounded-lg bg-base-100/50 text-sm text-base-content/70 ring-1 ring-base-content/[0.06] ring-inset">
        Not enough probe history for a chart yet.
      </div>
    );
  }

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const x = (t: number) => PAD.left + (t1 === t0 ? innerW : ((t - t0) / (t1 - t0)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / 100) * innerH;
  const r1 = (n: number) => Math.round(n * 10) / 10;

  const line = points.map((p, i) => `${i ? "L" : "M"}${r1(x(p.t))},${r1(y(p.v))}`).join("");
  const area = `${line}L${r1(x(t1))},${r1(y(0))}L${r1(x(t0))},${r1(y(0))}Z`;
  const xTicks = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const last = points[points.length - 1];
  const hovered = hover !== null ? points[hover] : undefined;
  const summary = summarise(points, thresholdPct);

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(x(p.t) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  };

  return (
    <figure className="space-y-2">
      <div ref={wrapRef} className="relative">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-labelledby={summaryId}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHover(null)}
            className="block touch-pan-y select-none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {Y_TICKS.map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + innerW}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="currentColor"
                  strokeOpacity={v === 0 ? 0.18 : 0.07}
                />
                {v % 50 === 0 && (
                  <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="num fill-base-content/70 text-[11px]">
                    {v}%
                  </text>
                )}
              </g>
            ))}

            {xTicks.map((i, k) => (
              <text
                key={i}
                x={x(points[i].t)}
                y={HEIGHT - 6}
                textAnchor={k === 0 ? "start" : k === xTicks.length - 1 ? "end" : "middle"}
                className="num fill-base-content/70 text-[11px]"
              >
                {formatClock(points[i].at)}
              </text>
            ))}

            <path d={area} fill={`url(#${gradientId})`} />
            <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            <line
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={y(thresholdPct)}
              y2={y(thresholdPct)}
              stroke="var(--color-primary)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text
              x={PAD.left + innerW}
              y={y(thresholdPct) - 6}
              textAnchor="end"
              className="fill-primary text-[11px] font-medium"
            >
              Idle threshold {thresholdPct}%
            </text>

            <circle cx={x(last.t)} cy={y(last.v)} r={4} fill="var(--color-accent)" stroke="var(--color-base-200)" strokeWidth={2} />

            {hovered && (
              <g pointerEvents="none">
                <line x1={x(hovered.t)} x2={x(hovered.t)} y1={PAD.top} y2={PAD.top + innerH} stroke="currentColor" strokeOpacity={0.3} />
                <circle cx={x(hovered.t)} cy={y(hovered.v)} r={4.5} fill="var(--color-accent)" stroke="var(--color-base-200)" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}
        {hovered && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1 rounded-md bg-base-300 px-2 py-1 text-xs shadow-[0_6px_16px_-6px_rgba(0,0,0,0.6)] ring-1 ring-base-content/10"
            style={{
              left: Math.min(Math.max(x(hovered.t) - 48, 0), Math.max(width - 104, 0)),
            }}
          >
            <span className="num font-semibold">{Math.round(hovered.v)}%</span>{" "}
            <span className="num text-base-content/75">{formatClock(hovered.at)}</span>
          </div>
        )}
      </div>
      <figcaption id={summaryId} className="text-xs leading-relaxed text-base-content/75">
        {summary}
      </figcaption>
      <details className="text-xs">
        <summary className="cursor-pointer rounded text-base-content/75 hover:text-base-content">Show data table</summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg ring-1 ring-base-content/[0.07] ring-inset">
          <table className="w-full text-left">
            <caption className="sr-only">GPU utilization probes</caption>
            <thead className="sticky top-0 bg-base-300">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-medium">Time</th>
                <th scope="col" className="px-3 py-1.5 text-right font-medium">GPU util</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-content/[0.05]">
              {points.toReversed().map((p) => (
                <tr key={p.at}>
                  <td className="num px-3 py-1.5" title={formatAbsolute(p.at)}>
                    {formatClock(p.at)}
                  </td>
                  <td className="num px-3 py-1.5 text-right">{p.v.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
