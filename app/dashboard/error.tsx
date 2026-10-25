"use client";

import ErrorState from "@/components/leaseguard/ErrorState";

// Catches unexpected render errors in the console. Data errors are handled inline.
export default function DashboardError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <ErrorState
      title="Something broke while rendering this page"
      error={{ code: error.digest ? `RENDER_ERROR ${error.digest}` : "RENDER_ERROR", message: "Try again. If it keeps happening, reload the page." }}
      onRetry={unstable_retry}
    />
  );
}
