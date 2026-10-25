"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResult } from "@/libs/leaseguard/client";
import type { ApiError, ApiMeta } from "@/libs/leaseguard/types";

interface PollingState<T> {
  data?: T;
  meta?: ApiMeta;
  error?: ApiError;
  lastSuccessAt?: number;
  isRefreshing: boolean;
  /** False only before the first response (success or failure). */
  settled: boolean;
}

export interface PollingResult<T> extends Omit<PollingState<T>, "settled"> {
  isLoading: boolean;
  /** Fetch now and reset any error backoff. */
  refresh: () => Promise<void>;
}

/**
 * Poll a BFF endpoint on an interval.
 * - pauses while the tab is hidden and refetches when it becomes visible
 * - backs off exponentially on consecutive errors (capped at `maxBackoffMs`)
 * - keeps the last good data when a poll fails, so callers can show it as stale
 * - stops polling after UNAUTHORIZED (the session is gone; refresh() still works)
 *
 * `fetcher` should be stable (module-level or memoised).
 */
export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<ApiResult<T>>,
  intervalMs: number,
  maxBackoffMs = 120_000
): PollingResult<T> {
  const [state, setState] = useState<PollingState<T>>({ isRefreshing: false, settled: false });
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let disposed = false;
    let failures = 0;
    let timer: number | undefined;
    let inflight: AbortController | null = null;
    let signedOut = false;

    const runFetch = async () => {
      inflight?.abort();
      const controller = new AbortController();
      inflight = controller;
      setState((s) => ({ ...s, isRefreshing: true }));
      let result: ApiResult<T>;
      try {
        result = await fetcher(controller.signal);
      } catch {
        return; // aborted by a newer request or unmount
      }
      if (disposed || controller.signal.aborted) return;
      if (result.ok) {
        failures = 0;
        setState({
          data: result.data,
          meta: result.meta,
          error: undefined,
          lastSuccessAt: Date.now(),
          isRefreshing: false,
          settled: true,
        });
      } else {
        failures += 1;
        signedOut = result.error.code === "UNAUTHORIZED";
        const { error, meta } = result;
        setState((s) => ({ ...s, meta: meta ?? s.meta, error, isRefreshing: false, settled: true }));
      }
    };

    const schedule = () => {
      window.clearTimeout(timer);
      if (disposed || signedOut || document.visibilityState === "hidden") return;
      const delay = Math.min(intervalMs * 2 ** failures, maxBackoffMs);
      timer = window.setTimeout(() => void runFetch().then(schedule), delay);
    };

    const cycle = async () => {
      window.clearTimeout(timer);
      await runFetch();
      schedule();
    };

    refreshRef.current = async () => {
      failures = 0;
      await cycle();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void cycle();
      else window.clearTimeout(timer);
    };

    void cycle();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(timer);
      inflight?.abort();
    };
  }, [fetcher, intervalMs, maxBackoffMs]);

  const refresh = useCallback(() => refreshRef.current(), []);
  const { settled, ...rest } = state;
  return { ...rest, isLoading: !settled, refresh };
}
