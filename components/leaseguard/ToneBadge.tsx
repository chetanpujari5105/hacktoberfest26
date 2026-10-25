import type { LucideIcon } from "lucide-react";
import { TONE_CLASSES, type Tone } from "@/components/leaseguard/statusMeta";

interface ToneBadgeProps {
  label: string;
  tone: Tone;
  icon: LucideIcon;
  spin?: boolean;
  title?: string;
  size?: "sm" | "md";
}

/** Shared visual for StatusBadge and VerdictBadge: icon + text + tone. */
export default function ToneBadge({ label, tone, icon: Icon, spin, title, size = "sm" }: ToneBadgeProps) {
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md font-medium whitespace-nowrap ring-1 ring-inset ${
        size === "md" ? "h-7 px-2.5 text-sm" : "h-6 px-2 text-xs"
      } ${TONE_CLASSES[tone].badge}`}
    >
      <Icon
        aria-hidden="true"
        className={`${size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} ${spin ? "motion-safe:animate-spin" : ""}`}
        strokeWidth={2.25}
      />
      {label}
    </span>
  );
}
