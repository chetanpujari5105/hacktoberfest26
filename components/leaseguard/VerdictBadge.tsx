import ToneBadge from "@/components/leaseguard/ToneBadge";
import { VERDICT_META } from "@/components/leaseguard/statusMeta";
import type { VerdictKind } from "@/libs/leaseguard/types";

export default function VerdictBadge({ kind, size }: { kind: VerdictKind; size?: "sm" | "md" }) {
  const meta = VERDICT_META[kind];
  return (
    <ToneBadge
      label={`Verdict: ${meta.label}`}
      tone={meta.tone}
      icon={meta.icon}
      title={meta.description}
      size={size}
    />
  );
}
