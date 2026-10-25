import { adaptPolicyPresets } from "@/libs/leaseguard/adapters";
import { backendFetch } from "@/libs/leaseguard/backend";
import { isDemoMode, requireSession, respond } from "@/libs/leaseguard/bff";
import { demoStore } from "@/libs/leaseguard/demo-store";

// PROPOSED contract: backend-supported policy presets.
export async function GET() {
  const route = "GET /api/policies";
  const denied = await requireSession(route);
  if (denied) return denied;

  const result = isDemoMode()
    ? demoStore.policies()
    : await backendFetch<unknown>("/api/v1/policies", { notFoundCode: "NOT_IMPLEMENTED" });
  return respond(route, result, adaptPolicyPresets);
}
