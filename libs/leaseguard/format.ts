import type { LeasePolicy, PolicyPreset } from "@/libs/leaseguard/types";

/**
 * Formatting helpers. All timestamps arrive as ISO strings and are shown
 * in the viewer's local timezone via Intl.
 */

const absoluteFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

const clockFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

const relativeFmt = new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "long" });

export function formatAbsolute(isoString: string | undefined): string {
  if (!isoString) return "Unavailable";
  const d = new Date(isoString);
  return Number.isNaN(d.getTime()) ? "Unavailable" : absoluteFmt.format(d);
}

export function formatClock(isoString: string): string {
  return clockFmt.format(new Date(isoString));
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

/** "3 min ago" / "in 12 min". `now` is injectable for ticking components. */
export function formatRelative(isoString: string | undefined, now: number = Date.now()): string {
  if (!isoString) return "Unavailable";
  const t = Date.parse(isoString);
  if (Number.isNaN(t)) return "Unavailable";
  const diffSec = Math.round((t - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 5) return "just now";
  for (const [unit, size] of UNITS) {
    if (abs >= size || unit === "second") {
      return relativeFmt.format(Math.round(diffSec / size), unit);
    }
  }
  return relativeFmt.format(diffSec, "second");
}

/** mm:ss or h:mm:ss for countdowns; negative values clamp to 0. */
export function formatCountdown(msRemaining: number): string {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatMoney(amount: number | undefined, currency = "USD"): string {
  if (amount === undefined) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPct(value: number | undefined): string {
  return value === undefined ? "—" : `${Math.round(value)}%`;
}

export function formatGb(mb: number | undefined): string {
  if (mb === undefined) return "—";
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function formatGpu(gpuType: string, gpuCount: number): string {
  return `${gpuCount}× ${gpuType}`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

type PolicyNumbers = Pick<
  LeasePolicy | PolicyPreset,
  "checkIntervalMin" | "idleThresholdPct" | "idleWindowMin" | "reminderTimeoutMin" | "onNoResponse"
>;

/** Plain-English description of what a policy will do. */
export function describePolicy(p: PolicyNumbers): string[] {
  const lines = [
    `Every ${formatMinutes(p.checkIntervalMin)} we check GPU utilization, memory, the training process, and recent logs.`,
    `If utilization stays under ${p.idleThresholdPct}% for ${formatMinutes(p.idleWindowMin)}, we'll message you on Telegram.`,
  ];
  if (p.onNoResponse === "checkpoint_and_pause") {
    lines.push(
      `If you don't answer within ${formatMinutes(p.reminderTimeoutMin)}, we'll checkpoint and pause this instance.`,
      "Pausing stops compute billing; storage is still billed."
    );
  } else {
    lines.push(
      `If you don't answer within ${formatMinutes(p.reminderTimeoutMin)}, we'll remind you again. We never pause on our own under this policy.`
    );
  }
  return lines;
}

export const NO_RESPONSE_LABEL: Record<PolicyNumbers["onNoResponse"], string> = {
  checkpoint_and_pause: "Checkpoint, then pause",
  notify_only: "Notify only — never auto-pause",
};
