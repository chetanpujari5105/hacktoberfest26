import { adaptRun } from "@/libs/leaseguard/adapters";
import { backendFetch } from "@/libs/leaseguard/backend";
import { errorResponse, isApiError, isDemoMode, parseRunId, requireSession, respond } from "@/libs/leaseguard/bff";
import { demoStore } from "@/libs/leaseguard/demo-store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const route = "GET /api/runs/[id]";
  const denied = await requireSession(route);
  if (denied) return denied;

  const id = parseRunId((await params).id);
  if (isApiError(id)) return errorResponse(route, id);

  const result = isDemoMode()
    ? demoStore.getRun(id)
    : await backendFetch<unknown>(`/api/v1/runs/${encodeURIComponent(id)}`);
  return respond(route, result, adaptRun);
}
