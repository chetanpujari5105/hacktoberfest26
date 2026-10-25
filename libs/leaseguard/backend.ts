import "server-only";

import config from "@/config";
import type { ApiError } from "@/libs/leaseguard/types";

/**
 * Typed server-side client for the FastAPI backend.
 * Reads BACKEND_URL / BACKEND_API_KEY from the server environment only and
 * normalises every failure into a safe ApiError (no upstream text leaks).
 */

export type BackendResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

interface BackendFetchOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Code to use when FastAPI answers 404 (e.g. NOT_IMPLEMENTED for proposed routes). */
  notFoundCode?: "NOT_FOUND" | "NOT_IMPLEMENTED";
}

const SAFE_MESSAGES: Record<string, string> = {
  BACKEND_MISCONFIGURED: "The LeaseGuard backend is not configured on this server.",
  BACKEND_UNREACHABLE: "Couldn't reach the LeaseGuard backend.",
  BACKEND_TIMEOUT: "The LeaseGuard backend took too long to respond.",
  UPSTREAM_ERROR: "The LeaseGuard backend returned an error.",
  NOT_FOUND: "That resource doesn't exist.",
  NOT_IMPLEMENTED: "This feature isn't available from the backend yet.",
  UNAUTHORIZED: "The backend rejected this server's credentials.",
  VALIDATION_ERROR: "The backend rejected the request as invalid.",
  CONFLICT: "That action isn't allowed in the run's current state.",
};

const fail = (code: string, status: number, message?: string): { ok: false; error: ApiError } => ({
  ok: false,
  error: { code, status, message: message ?? SAFE_MESSAGES[code] ?? SAFE_MESSAGES.UPSTREAM_ERROR },
});

function statusToCode(status: number, notFoundCode: string): string {
  if (status === 400 || status === 422) return "VALIDATION_ERROR";
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 404) return notFoundCode;
  if (status === 409) return "CONFLICT";
  if (status === 501) return "NOT_IMPLEMENTED";
  if (status === 504) return "BACKEND_TIMEOUT";
  return "UPSTREAM_ERROR";
}

function failFromStatus(status: number, notFoundCode: string) {
  const code = statusToCode(status, notFoundCode);
  return fail(code, code === "NOT_IMPLEMENTED" ? 501 : status >= 500 ? 502 : status);
}

// Envelope codes from FastAPI that we pass through; anything else becomes UPSTREAM_ERROR.
const PASSTHROUGH_CODES = new Set(["VALIDATION_ERROR", "NOT_FOUND", "NOT_IMPLEMENTED", "CONFLICT"]);

// Allow only short, printable messages from a backend validation/conflict error.
function safeUpstreamMessage(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 && trimmed.length <= 200 && /^[\p{L}\p{N}\p{P}\p{Zs}]+$/u.test(trimmed)
    ? trimmed
    : undefined;
}

export async function backendFetch<T>(path: string, options: BackendFetchOptions = {}): Promise<BackendResult<T>> {
  const baseUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!baseUrl || !apiKey) return fail("BACKEND_MISCONFIGURED", 500);

  const { method = "GET", body, notFoundCode = "NOT_FOUND" } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.leaseguard.backendTimeoutMs);

  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err instanceof Error && err.name === "AbortError";
    return aborted ? fail("BACKEND_TIMEOUT", 504) : fail("BACKEND_UNREACHABLE", 502);
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    clearTimeout(timer);
    return res.ok
      ? fail("UPSTREAM_ERROR", 502, "The LeaseGuard backend sent a response we couldn't read.")
      : failFromStatus(res.status, notFoundCode);
  }
  clearTimeout(timer);

  const envelope =
    typeof payload === "object" && payload !== null && "success" in payload
      ? (payload as { success: unknown; data?: unknown; error?: { code?: unknown; message?: unknown } | null })
      : undefined;

  if (!envelope) {
    return fail("UPSTREAM_ERROR", 502, "The LeaseGuard backend sent an unexpected response shape.");
  }

  if (!res.ok || envelope.success !== true) {
    const upstreamCode = typeof envelope.error?.code === "string" ? envelope.error.code : undefined;
    const code =
      upstreamCode && PASSTHROUGH_CODES.has(upstreamCode) ? upstreamCode : statusToCode(res.status, notFoundCode);
    const status = res.ok ? 502 : code === "NOT_IMPLEMENTED" ? 501 : res.status;
    const message =
      code === "VALIDATION_ERROR" || code === "CONFLICT" ? safeUpstreamMessage(envelope.error?.message) : undefined;
    return fail(code, status, message);
  }

  return { ok: true, data: envelope.data as T };
}
