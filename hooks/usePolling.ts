"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Envelope } from "@/libs/backend-types";
import { getErrorMessage } from "@/libs/runs";

interface PollingState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Fetches a LeaseGuard proxy route that returns an envelope, and re-fetches
 * every `intervalMs`. Keeps the last good data visible when a poll fails.
 */
export function usePolling<T>(url: string, intervalMs: number): PollingState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const body = (await res.json()) as Envelope<T>;
      if (body.success) {
        setData(body.data);
        setError(null);
      } else {
        setError(body.error ?? "Request failed");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { data, error, loading, refresh };
}
