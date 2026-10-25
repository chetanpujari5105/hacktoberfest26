import { Wallet as WalletIcon } from "lucide-react";
import DataTag from "@/components/leaseguard/DataTag";
import Skeleton from "@/components/leaseguard/Skeleton";
import { formatAbsolute, formatMoney } from "@/libs/leaseguard/format";
import type { ApiError, Wallet } from "@/libs/leaseguard/types";

interface WalletChipProps {
  wallet?: Wallet;
  error?: ApiError;
  loading: boolean;
  demo: boolean;
}

export default function WalletChip({ wallet, error, loading, demo }: WalletChipProps) {
  if (loading) return <Skeleton className="h-9 w-44" />;
  return (
    <div
      className="flex h-9 items-center gap-2 rounded-lg border border-base-content/10 bg-base-200 px-3 text-sm"
      title={wallet ? `JarvisLabs wallet as of ${formatAbsolute(wallet.asOf)}` : undefined}
    >
      <WalletIcon aria-hidden="true" className="h-4 w-4 text-base-content/70" />
      <span className="sr-only">Wallet balance</span>
      {wallet ? (
        <>
          <span className="num font-medium">{formatMoney(wallet.balance, wallet.currency)}</span>
          {wallet.burnRatePerHour !== undefined && (
            <span className="num text-base-content/70">
              −{formatMoney(wallet.burnRatePerHour, wallet.currency)}/h
            </span>
          )}
          {demo && <DataTag kind="demo" />}
        </>
      ) : (
        <>
          <span className="text-base-content/70">{error?.code === "NOT_IMPLEMENTED" ? "Wallet not available yet" : "Wallet"}</span>
          <DataTag kind="unavailable" />
        </>
      )}
    </div>
  );
}
