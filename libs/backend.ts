import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAuthDisabled } from "@/libs/authMode";
import type { Envelope } from "@/libs/backend-types";

/**
 * Thin server-only client for the LeaseGuard FastAPI backend.
 * The browser never talks to FastAPI directly: route handlers call these
 * helpers, which add the shared X-API-Key header.
 */

export interface BackendResult<T> {
  status: number;
  body: Envelope<T>;
}

const UNAVAILABLE: Envelope<never> = {
  success: false,
  data: null,
  error: "Backend unavailable",
};

function backendConfig(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function isEnvelope(value: unknown): value is Envelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as { success: unknown }).success === "boolean"
  );
}

export async function backendFetch<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {}
): Promise<BackendResult<T>> {
  const config = backendConfig();
  if (!config) {
    console.error("[backend] BACKEND_URL or BACKEND_API_KEY is not set");
    return { status: 502, body: UNAVAILABLE };
  }

  try {
    const res = await fetch(`${config.baseUrl}/api/v1${path}`, {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    const json: unknown = await res.json().catch(() => null);
    if (!isEnvelope(json)) {
      console.error(`[backend] ${path} returned a non-envelope response (${res.status})`);
      return { status: 502, body: UNAVAILABLE };
    }
    return { status: res.status, body: json as Envelope<T> };
  } catch (error) {
    console.error(`[backend] ${path} request failed`, error);
    return { status: 502, body: UNAVAILABLE };
  }
}

/**
 * Wraps a route handler so it runs only for signed-in users. `/api` is public
 * in proxy.ts, so every LeaseGuard route handler must be wrapped with this.
 * The session is checked before any body validation.
 */
export function withSession<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse>
): (...args: A) => Promise<NextResponse> {
  return async (...args: A) => {
    if (isAuthDisabled()) {
      return handler(...args);
    }
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, data: null, error: "Please sign in" },
        { status: 401 }
      );
    }
    return handler(...args);
  };
}

/** Forwards to the backend and passes the envelope through unchanged. */
export async function proxyToBackend(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {}
): Promise<NextResponse> {
  const { status, body } = await backendFetch<unknown>(path, init);
  return NextResponse.json(body, { status });
}

export function badRequest(error: string): NextResponse {
  return NextResponse.json({ success: false, data: null, error }, { status: 400 });
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
