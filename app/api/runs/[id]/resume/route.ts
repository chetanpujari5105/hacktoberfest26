import { adaptRun } from "@/libs/leaseguard/adapters";
import { backendFetch } from "@/libs/leaseguard/backend";
import {
  errorResponse,
  isApiError,
  isDemoMode,
  parseRunId,
  readJsonObject,
  requireSession,
  respond,
  validateResumeBody,
} from "@/libs/leaseguard/bff";
import { demoStore } from "@/libs/leaseguard/demo-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const route = "POST /api/runs/[id]/resume";
  const denied = await requireSession(route);
  if (denied) return denied;

  const id = parseRunId((await params).id);
  if (isApiError(id)) return errorResponse(route, id);
  const json = await readJsonObject(request);
  if (isApiError(json)) return errorResponse(route, json);
  const body = validateResumeBody(json);
  if (isApiError(body)) return errorResponse(route, body);

  const result = isDemoMode()
    ? demoStore.resume(id, body.gpu_type)
    : await backendFetch<unknown>(`/api/v1/runs/${encodeURIComponent(id)}/resume`, { method: "POST", body });
  return respond(route, result, adaptRun);
}
