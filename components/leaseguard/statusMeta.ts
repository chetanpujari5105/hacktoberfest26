import {
  Activity,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  OctagonX,
  Pause,
  Save,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { RunStatus, VerdictKind } from "@/libs/leaseguard/types";

/**
 * Single mapping table for run status and verdict presentation.
 * Every entry pairs a text label with an icon so status is never color-only.
 */

export type Tone = "healthy" | "attention" | "pending" | "quiet" | "danger" | "info";

export const TONE_CLASSES: Record<Tone, { text: string; badge: string; fill: string }> = {
  healthy: { text: "text-accent", badge: "bg-accent/10 text-accent ring-accent/25", fill: "bg-accent" },
  attention: { text: "text-primary", badge: "bg-primary/10 text-primary ring-primary/30", fill: "bg-primary" },
  pending: { text: "text-warning", badge: "bg-warning/10 text-warning ring-warning/25", fill: "bg-warning" },
  quiet: { text: "text-quiet", badge: "bg-quiet/10 text-quiet ring-quiet/25", fill: "bg-quiet" },
  danger: { text: "text-error", badge: "bg-error/10 text-error ring-error/30", fill: "bg-error" },
  info: { text: "text-info", badge: "bg-info/10 text-info ring-info/25", fill: "bg-info" },
};

interface Meta {
  label: string;
  tone: Tone;
  icon: LucideIcon;
  spin?: boolean;
  description: string;
}

export const STATUS_META: Record<RunStatus, Meta> = {
  running: { label: "Running", tone: "healthy", icon: Activity, description: "Instance is running and being watched." },
  suspicious: {
    label: "Suspicious",
    tone: "attention",
    icon: TriangleAlert,
    description: "Looks idle or stuck. A reminder has been sent.",
  },
  needs_attention: {
    label: "Needs attention",
    tone: "attention",
    icon: CircleAlert,
    description: "The guard reported a state it couldn't classify.",
  },
  checkpointing: {
    label: "Checkpointing",
    tone: "pending",
    icon: Save,
    description: "Saving a checkpoint before pausing.",
  },
  pausing: { label: "Pausing", tone: "pending", icon: LoaderCircle, spin: true, description: "Stopping the instance." },
  paused: {
    label: "Paused",
    tone: "quiet",
    icon: Pause,
    description: "Compute stopped. Storage is still billed.",
  },
  resuming: {
    label: "Resuming",
    tone: "pending",
    icon: LoaderCircle,
    spin: true,
    description: "Starting the instance again.",
  },
  failed: { label: "Failed", tone: "danger", icon: OctagonX, description: "The last guard action failed." },
};

export const VERDICT_META: Record<VerdictKind, Meta> = {
  healthy: { label: "Healthy", tone: "healthy", icon: ShieldCheck, description: "Evidence shows active training." },
  suspicious: {
    label: "Suspicious",
    tone: "attention",
    icon: ShieldAlert,
    description: "Evidence suggests the run is idle or stuck.",
  },
  completed: {
    label: "Completed",
    tone: "info",
    icon: CircleCheck,
    description: "Evidence suggests the job finished.",
  },
  unknown: {
    label: "Unknown",
    tone: "quiet",
    icon: ShieldQuestion,
    description: "Not enough evidence for a verdict yet.",
  },
};
