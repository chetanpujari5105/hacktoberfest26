import type { NextRequest } from "next/server";
import { badRequest, proxyToBackend, readJsonBody, withSession } from "@/libs/backend";
import type { RunAction } from "@/libs/backend-types";
import { isValidRunId } from "@/libs/runs";

const DECISIONS = ["pause", "keep", "resolved"] as const;
const MAX_EXTEND_MINUTES = 720;
const GPU_TYPE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

type Body = Record<string, unknown>;

function asBody(value: unknown): Body {
  return typeof value === "object" && value !== null ? (value as Body) : {};
}

/** Returns the body to forward, or an error message. */
const validators: Record<RunAction, (body: Body) => Body | string> = {
  decide: ({ action }) =>
    typeof action === "string" && (DECISIONS as readonly string[]).includes(action)
      ? { action }
      : `action must be one of: ${DECISIONS.join(", ")}`,
  extend: ({ minutes }) =>
    typeof minutes === "number" &&
    Number.isInteger(minutes) &&
    minutes >= 1 &&
    minutes <= MAX_EXTEND_MINUTES
      ? { minutes }
      : `minutes must be an integer between 1 and ${MAX_EXTEND_MINUTES}`,
  resume: ({ gpu_type }) => {
    if (gpu_type == null || gpu_type === "") return { gpu_type: null };
    return typeof gpu_type === "string" && GPU_TYPE_PATTERN.test(gpu_type)
      ? { gpu_type }
      : "gpu_type must be a GPU name like L4";
  },
  stop: () => ({}),
};

function isRunAction(value: string): value is RunAction {
  return Object.hasOwn(validators, value);
}

export const POST = withSession(async (
  request: NextRequest,
  ctx: RouteContext<"/api/runs/[id]/[action]">
) => {
  const { id, action } = await ctx.params;
  if (!isValidRunId(id)) return badRequest("Invalid run id");
  if (!isRunAction(action)) return badRequest("Unknown action");

  const result = validators[action](asBody(await readJsonBody(request)));
  if (typeof result === "string") return badRequest(result);

  return proxyToBackend(`/runs/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: result,
  });
});
