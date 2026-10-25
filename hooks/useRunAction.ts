"use client";

import { useState } from "react";
import type { Envelope, RunAction } from "@/libs/backend-types";
import { getErrorMessage } from "@/libs/runs";

interface RunActionState {
  pending: string | null;
  error: string | null;
  send: (key: string, action: RunAction, body?: object) => Promise<boolean>;
}

/**
 * Posts an action (decide / extend / resume / stop) for one run.
 * `key` identifies the clicked button so only it shows a spinner.
 */
export function useRunAction(runId: string, onDone?: () => void): RunActionState {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (key: string, action: RunAction, body: object = {}) => {
    setPending(key);
    setError(null);
    try {
      const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await res.json()) as Envelope<unknown>;
      if (!result.success) {
        setError(result.error ?? "Action failed");
        return false;
      }
      onDone?.();
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setPending(null);
    }
  };

  return { pending, error, send };
}
