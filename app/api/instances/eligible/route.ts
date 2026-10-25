import { adaptEligibleInstances } from "@/libs/leaseguard/adapters";
import { backendFetch } from "@/libs/leaseguard/backend";
import { isDemoMode, requireSession, respond } from "@/libs/leaseguard/bff";
import { demoStore } from "@/libs/leaseguard/demo-store";

// PROPOSED contract: unguarded instances that can be guarded.
export async function GET() {
  const route = "GET /api/instances/eligible";
  const denied = await requireSession(route);
  if (denied) return denied;

  const result = isDemoMode()
    ? demoStore.eligibleInstances()
    : await backendFetch<unknown>("/api/v1/instances/eligible", { notFoundCode: "NOT_IMPLEMENTED" });
  return respond(route, result, adaptEligibleInstances);
}
