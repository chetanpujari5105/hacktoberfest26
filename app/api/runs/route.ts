import { badRequest, proxyToBackend, readJsonBody, withSession } from "@/libs/backend";
import type { StartRunInput } from "@/libs/backend-types";

const MAX_NAME_LENGTH = 80;

function parseStartRun(body: unknown): StartRunInput | string {
  if (typeof body !== "object" || body === null) return "Request body must be JSON";
  const { machine_id, name, gpu_type, hourly_cost_inr } = body as Record<string, unknown>;

  if (typeof machine_id !== "number" || !Number.isInteger(machine_id) || machine_id <= 0) {
    return "machine_id must be a positive integer";
  }
  if (typeof name !== "string" || !name.trim() || name.length > MAX_NAME_LENGTH) {
    return `name is required (max ${MAX_NAME_LENGTH} characters)`;
  }
  if (gpu_type != null && (typeof gpu_type !== "string" || !gpu_type.trim())) {
    return "gpu_type must be a non-empty string";
  }
  if (
    hourly_cost_inr != null &&
    (typeof hourly_cost_inr !== "number" || !(hourly_cost_inr > 0))
  ) {
    return "hourly_cost_inr must be a positive number";
  }

  return {
    machine_id,
    name: name.trim(),
    gpu_type: typeof gpu_type === "string" ? gpu_type.trim() : null,
    ...(typeof hourly_cost_inr === "number" ? { hourly_cost_inr } : {}),
  };
}

export const GET = withSession(async () => proxyToBackend("/runs"));

export const POST = withSession(async (request: Request) => {
  const parsed = parseStartRun(await readJsonBody(request));
  if (typeof parsed === "string") return badRequest(parsed);
  return proxyToBackend("/runs", { method: "POST", body: parsed });
});
