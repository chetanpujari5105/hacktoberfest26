import { adaptRun, adaptRunList } from "@/libs/leaseguard/adapters";
import { backendFetch } from "@/libs/leaseguard/backend";
import {
  errorResponse,
  isApiError,
  isDemoMode,
  readJsonObject,
  requireSession,
  respond,
  validateStartGuardBody,
} from "@/libs/leaseguard/bff";
import { demoStore } from "@/libs/leaseguard/demo-store";

export async function GET() {
  const route = "GET /api/runs";
  const denied = await requireSession(route);
  if (denied) return denied;

  const result = isDemoMode() ? demoStore.listRuns() : await backendFetch<unknown>("/api/v1/runs");
  return respond(route, result, adaptRunList);
}

export async function POST(request: Request) {
  const route = "POST /api/runs";
  const denied = await requireSession(route);
  if (denied) return denied;

  const json = await readJsonObject(request);
  if (isApiError(json)) return errorResponse(route, json);
  const body = validateStartGuardBody(json);
  if (isApiError(body)) return errorResponse(route, body);

  const result = isDemoMode()
    ? demoStore.startGuard(body)
    : await backendFetch<unknown>("/api/v1/runs", { method: "POST", body });
  return respond(route, result, adaptRun);
}
