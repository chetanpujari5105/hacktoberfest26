import type { ApiEnvelope, ApiError, ApiMeta } from "@/libs/leaseguard/types";

/**
 * Browser-side helper for calling OUR BFF routes (`/api/...`) only.
 * It never talks to FastAPI and never sees backend credentials.
 */

export type ApiResult<T> =
  | { ok: true; data: T; meta?: ApiMeta }
  | { ok: false; error: ApiError; meta?: ApiMeta };

export async function apiRequest<T>(
  path: `/api/${string}`,
  init?: { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal }
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      credentials: "same-origin",
      signal: init?.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return {
      ok: false,
      error: { code: "NETWORK_ERROR", message: "Couldn't reach the LeaseGuard server. Check your connection." },
    };
  }

  let body: ApiEnvelope<T>;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    return {
      ok: false,
      error: { code: "UPSTREAM_ERROR", message: "The server sent a response we couldn't read.", status: res.status },
    };
  }

  if (body.success) return { ok: true, data: body.data, meta: body.meta };
  return {
    ok: false,
    error: {
      code: body.error?.code ?? "UPSTREAM_ERROR",
      message: body.error?.message ?? "Something went wrong.",
      status: res.status,
    },
    meta: body.meta,
  };
}
