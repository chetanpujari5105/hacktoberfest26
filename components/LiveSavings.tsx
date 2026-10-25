"use client";

import type { RunView } from "@/libs/backend-types";
import { useNow } from "@/hooks/useNow";
import { formatInr, liveSavingsInr } from "@/libs/runs";

interface LiveSavingsProps {
  runs: RunView[];
  className?: string;
}

/** Ticking total of money saved across runs (paused runs keep counting up). */
export default function LiveSavings({ runs, className }: LiveSavingsProps) {
  const now = useNow();
  const total = runs.reduce((sum, run) => sum + liveSavingsInr(run, now), 0);
  return <span className={`tabular-nums ${className ?? ""}`}>{formatInr(total)}</span>;
}
