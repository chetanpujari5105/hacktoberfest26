import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import config from "@/config";
import type { BackendResult } from "@/libs/leaseguard/backend";
import type { ApiEnvelope, ApiError, NoResponseAction, StartGuardBody } from "@/libs/leaseguard/types";

/**
 * Shared helpers for the LeaseGuard BFF route handlers:
 * session check, demo switch, hand validation, and the response envelope.
 */

export const isDemoMode = () => process.env.DEMO_MODE === "true";

const meta = () => ({ demo: isDemoMode(), fetchedAt: new Date().toISOString() });

export function okResponse<T>(data: T, status = 200) {
  const body: ApiEnvelope<T> = { success: true, data, error: null, meta: meta() };
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(route: string, error: ApiError) {
  const status = error.status ?? 500;
  // Log only the route, code and status — never headers, sessions or bodies.
  if (status >= 500 || error.code === "UNAUTHORIZED") {
    console.warn("[leaseguard-bff]", { route, code: error.code, status });
  }
  const body: ApiEnvelope<never> = {
    success: false,
    data: null,
    error: { code: error.code, message: error.message },
    meta: meta(),
  };
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const validationError = (message: string): ApiError => ({ code: "VALIDATION_ERROR", message, status: 400 });

/** Returns an error response when there is no signed-in user. */
export async function requireSession(route: string) {
  const session = await auth();
  if (!session?.user) {
    return errorResponse(route, { code: "UNAUTHORIZED", message: "Sign in to continue.", status: 401 });
  }
  return null;
}

/** Map a backend/demo result through an adapter into an envelope response. */
export function respond<Raw, Out>(route: string, result: BackendResult<Raw>, adapt: (raw: Raw) => Out | undefined) {
  if (!result.ok) return errorResponse(route, result.error);
  const data = adapt(result.data);
  if (data === undefined) {
    return errorResponse(route, {
      code: "UPSTREAM_ERROR",
      message: "The LeaseGuard backend sent data we couldn't understand.",
      status: 502,
    });
  }
  return okResponse(data);
}

/* ----------------------------- validation ----------------------------- */

const RUN_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function parseRunId(raw: string): string | ApiError {
  return RUN_ID_RE.test(raw) ? raw : validationError("Run id must be 1–64 letters, digits, '-' or '_'.");
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | ApiError> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return validationError("Expected a JSON request body.");
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : validationError("Request body must be a JSON object.");
  } catch {
    return validationError("Request body is not valid JSON.");
  }
}

export const isApiError = (v: unknown): v is ApiError =>
  typeof v === "object" && v !== null && "code" in v && "message" in v && !Array.isArray(v);

function intInRange(v: unknown, min: number, max: number): number | undefined {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : undefined;
}

function onlyKeys(body: Record<string, unknown>, allowed: string[]): ApiError | undefined {
  const extra = Object.keys(body).filter((k) => !allowed.includes(k));
  return extra.length ? validationError(`Unexpected field(s): ${extra.slice(0, 3).join(", ")}.`) : undefined;
}

export function validateDecideBody(body: Record<string, unknown>): { action: "pause" | "keep" } | ApiError {
  const extra = onlyKeys(body, ["action"]);
  if (extra) return extra;
  return body.action === "pause" || body.action === "keep"
    ? { action: body.action }
    : validationError('action must be "pause" or "keep".');
}

export function validateExtendBody(body: Record<string, unknown>): { minutes: number } | ApiError {
  const extra = onlyKeys(body, ["minutes"]);
  if (extra) return extra;
  const { min, max } = config.leaseguard.extendMinutesRange;
  const minutes = intInRange(body.minutes, min, max);
  return minutes !== undefined ? { minutes } : validationError(`minutes must be a whole number from ${min} to ${max}.`);
}

const GPU_TYPES: ReadonlySet<string> = new Set(config.leaseguard.gpuTypes.map((g) => g.value));

export function validateResumeBody(body: Record<string, unknown>): { gpu_type?: string } | ApiError {
  const extra = onlyKeys(body, ["gpu_type"]);
  if (extra) return extra;
  if (body.gpu_type === undefined || body.gpu_type === null) return {};
  return typeof body.gpu_type === "string" && GPU_TYPES.has(body.gpu_type)
    ? { gpu_type: body.gpu_type }
    : validationError("gpu_type must be one of the supported GPU types, or omitted.");
}

const POLICY_KEYS = [
  "preset_id",
  "check_interval_min",
  "idle_threshold_pct",
  "idle_window_min",
  "reminder_timeout_min",
  "on_no_response",
];

export function validateStartGuardBody(body: Record<string, unknown>): StartGuardBody | ApiError {
  const extra = onlyKeys(body, ["machine_id", "policy"]);
  if (extra) return extra;
  const machineId = intInRange(body.machine_id, 1, Number.MAX_SAFE_INTEGER);
  if (machineId === undefined) return validationError("machine_id must be a positive whole number.");
  const p = body.policy;
  if (typeof p !== "object" || p === null || Array.isArray(p)) return validationError("policy must be an object.");
  const policy = p as Record<string, unknown>;
  const extraPolicy = onlyKeys(policy, POLICY_KEYS);
  if (extraPolicy) return extraPolicy;

  const checkInterval = intInRange(policy.check_interval_min, 1, 60);
  const threshold = intInRange(policy.idle_threshold_pct, 1, 50);
  const idleWindow = intInRange(policy.idle_window_min, 5, 240);
  const reminderTimeout = intInRange(policy.reminder_timeout_min, 1, 240);
  if (checkInterval === undefined) return validationError("policy.check_interval_min must be 1–60.");
  if (threshold === undefined) return validationError("policy.idle_threshold_pct must be 1–50.");
  if (idleWindow === undefined) return validationError("policy.idle_window_min must be 5–240.");
  if (reminderTimeout === undefined) return validationError("policy.reminder_timeout_min must be 1–240.");
  const onNoResponse = policy.on_no_response;
  if (onNoResponse !== "checkpoint_and_pause" && onNoResponse !== "notify_only") {
    return validationError('policy.on_no_response must be "checkpoint_and_pause" or "notify_only".');
  }
  const presetId = policy.preset_id;
  if (presetId !== undefined && (typeof presetId !== "string" || !RUN_ID_RE.test(presetId))) {
    return validationError("policy.preset_id must be a short identifier.");
  }

  return {
    machine_id: machineId,
    policy: {
      ...(presetId ? { preset_id: presetId as string } : {}),
      check_interval_min: checkInterval,
      idle_threshold_pct: threshold,
      idle_window_min: idleWindow,
      reminder_timeout_min: reminderTimeout,
      on_no_response: onNoResponse as NoResponseAction,
    },
  };
}
