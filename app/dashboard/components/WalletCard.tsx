"use client";

import type { Wallet } from "@/libs/backend-types";
import { usePolling } from "@/hooks/usePolling";
import { formatInr } from "@/libs/runs";
import { Panel } from "@/components/ui/Panel";

interface WalletCardProps {
  pollIntervalMs: number;
}

function walletTone(wallet: Wallet): { label: string; className: string } {
  if (wallet.balance <= wallet.critical_threshold) {
    return { label: "Critical: runs will be checkpointed and paused", className: "text-error" };
  }
  if (wallet.balance <= wallet.warn_threshold) {
    return { label: "Low balance", className: "text-warning" };
  }
  return { label: "Healthy", className: "text-success" };
}

export default function WalletCard({ pollIntervalMs }: WalletCardProps) {
  const { data: wallet, error, loading } = usePolling<Wallet>("/api/wallet", pollIntervalMs);

  return (
    <Panel title="Jarvislabs wallet">
      {loading && !wallet && <span className="loading loading-dots loading-sm" />}
      {wallet && (
        <>
          <p className="text-3xl font-bold tabular-nums">{formatInr(wallet.balance)}</p>
          <p className={`text-sm ${walletTone(wallet).className}`}>{walletTone(wallet).label}</p>
          <p className="text-xs text-base-content/50">
            Warn at {formatInr(wallet.warn_threshold)} · pause all at{" "}
            {formatInr(wallet.critical_threshold)}
          </p>
        </>
      )}
      {error && <p className="text-sm text-error">{error}</p>}
    </Panel>
  );
}
