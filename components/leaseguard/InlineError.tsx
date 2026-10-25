import { CircleAlert } from "lucide-react";
import type { ApiError } from "@/libs/leaseguard/types";

/** Recoverable error shown inside a panel or dialog, with an optional retry. */
export default function InlineError({
  error,
  onRetry,
  retryLabel = "Try again",
}: {
  error: ApiError;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg bg-primary/8 p-3 ring-1 ring-primary/25 ring-inset">
      <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{error.message}</p>
        <p className="num mt-0.5 text-xs text-base-content/70">{error.code}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-sm btn-ghost border border-base-content/15">
          {retryLabel}
        </button>
      )}
    </div>
  );
}
