import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";
import type { ApiError } from "@/libs/leaseguard/types";

interface ErrorStateProps {
  title?: string;
  error: ApiError;
  onRetry?: () => void;
  retrying?: boolean;
}

/** Full-panel failure state. Never rendered as (or confused with) an empty list. */
export default function ErrorState({ title = "Couldn't load your runs", error, onRetry, retrying }: ErrorStateProps) {
  const signedOut = error.code === "UNAUTHORIZED";
  return (
    <div role="alert" className="panel flex flex-col items-center gap-4 px-6 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <CloudOff aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="max-w-md space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight">{signedOut ? "Your session has ended" : title}</h2>
        <p className="text-sm text-base-content/70">{error.message}</p>
        <p className="num text-xs text-base-content/70">Error code: {error.code}</p>
      </div>
      {signedOut ? (
        <Link href="/login?callbackUrl=/dashboard" className="btn btn-primary btn-sm">
          Sign in again
        </Link>
      ) : (
        onRetry && (
          <button type="button" onClick={onRetry} disabled={retrying} className="btn btn-primary btn-sm">
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${retrying ? "motion-safe:animate-spin" : ""}`} />
            {retrying ? "Retrying…" : "Retry"}
          </button>
        )
      )}
    </div>
  );
}
