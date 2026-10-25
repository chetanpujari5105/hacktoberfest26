import ToneBadge from "@/components/leaseguard/ToneBadge";
import { STATUS_META } from "@/components/leaseguard/statusMeta";
import type { RunStatus } from "@/libs/leaseguard/types";

export default function StatusBadge({ status, size }: { status: RunStatus; size?: "sm" | "md" }) {
  const meta = STATUS_META[status];
  return (
    <ToneBadge
      label={meta.label}
      tone={meta.tone}
      icon={meta.icon}
      spin={meta.spin}
      title={meta.description}
      size={size}
    />
  );
}
