"use client";

import { useState } from "react";
import { ExternalLink, Send } from "lucide-react";
import DataTag from "@/components/leaseguard/DataTag";
import InlineError from "@/components/leaseguard/InlineError";
import Skeleton from "@/components/leaseguard/Skeleton";
import { usePolling } from "@/hooks/usePolling";
import { useToast } from "@/hooks/useToast";
import { apiRequest } from "@/libs/leaseguard/client";
import type { ApiError, TelegramStatus } from "@/libs/leaseguard/types";

const fetchStatus = (signal: AbortSignal) => apiRequest<TelegramStatus>("/api/telegram/status", { signal });

/**
 * Connection status comes only from /api/telegram/status.
 * The bot, webhook and message polling all live in the backend.
 */
export default function TelegramPanel({ pollIntervalMs }: { pollIntervalMs: number }) {
  const statusQ = usePolling(fetchStatus, pollIntervalMs);
  const toast = useToast();
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<ApiError>();
  const demo = statusQ.meta?.demo === true;
  const status = statusQ.data;

  const simulateConnect = async () => {
    setConnecting(true);
    setConnectError(undefined);
    const result = await apiRequest<TelegramStatus>("/api/telegram/status", { method: "POST" });
    setConnecting(false);
    if (result.ok) {
      toast({ tone: "success", title: "Telegram connected (simulated)", description: "No real account was linked." });
      await statusQ.refresh();
    } else {
      setConnectError(result.error);
    }
  };

  return (
    <section aria-labelledby="telegram-heading" className="panel space-y-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="telegram-heading" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Send aria-hidden="true" className="h-4 w-4 text-base-content/70" />
          Telegram reminders
        </h2>
        {demo && <DataTag kind="simulated" />}
      </div>

      <div aria-live="polite">
        {statusQ.isLoading ? (
          <div aria-busy="true" aria-label="Loading Telegram status" className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !status && statusQ.error ? (
          statusQ.error.code === "NOT_IMPLEMENTED" ? (
            <p className="text-sm text-base-content/75">
              Telegram connection is being set up by the backend. Reminders will appear here once it&apos;s ready.
            </p>
          ) : (
            <InlineError error={statusQ.error} onRetry={() => void statusQ.refresh()} />
          )
        ) : status?.linked ? (
          <p className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent" />
            Connected as <span className="num font-medium">@{status.username ?? "unknown"}</span>
          </p>
        ) : (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-sm text-base-content/80">
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-quiet" />
              Not connected. Without Telegram, reminders can&apos;t reach you.
            </p>
            {demo ? (
              <button type="button" onClick={simulateConnect} disabled={connecting} className="btn btn-sm w-full border-base-content/15 bg-base-300">
                {connecting && <span className="loading loading-spinner loading-xs" aria-hidden="true" />}
                {connecting ? "Connecting…" : "Connect Telegram (simulated)"}
              </button>
            ) : status?.linkUrl ? (
              <a href={status.linkUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm w-full border-base-content/15 bg-base-300">
                Connect on Telegram
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <p className="text-xs text-base-content/70">The backend hasn&apos;t provided a link yet.</p>
            )}
            {connectError && <InlineError error={connectError} onRetry={simulateConnect} />}
          </div>
        )}
      </div>

      <div className="space-y-2.5 border-t border-base-content/[0.07] pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">What a reminder looks like</h3>
          <DataTag kind="preview" />
        </div>
        <figure aria-label="Example Telegram reminder (static preview)" className="rounded-xl bg-base-100 p-3 ring-1 ring-base-content/[0.06]">
          <div className="rounded-lg rounded-tl-sm bg-base-300 px-3 py-2.5 text-[13px] leading-relaxed">
            <p className="font-semibold">LeaseGuard: run looks idle</p>
            <p className="mt-1 text-base-content/85">
              <span className="num">sdxl-dreambooth-v3</span> · GPU <span className="num">3%</span> for{" "}
              <span className="num">25 min</span> (threshold <span className="num">10%</span>). Dataloader timeouts in the log.
            </p>
            <p className="mt-1 text-base-content/85">
              Auto-pause after checkpoint in <span className="num">15 min</span> unless you choose.
            </p>
          </div>
          <div aria-hidden="true" className="mt-1.5 grid grid-cols-3 gap-1.5 text-center text-xs font-medium">
            {["Pause", "Keep 30 min", "Extend"].map((label) => (
              <span key={label} className="rounded-md bg-base-300/70 px-2 py-1.5 text-info">
                {label}
              </span>
            ))}
          </div>
          <figcaption className="sr-only">Buttons: Pause, Keep 30 min, Extend.</figcaption>
        </figure>
      </div>
    </section>
  );
}
