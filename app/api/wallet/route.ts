import { adaptWallet } from "@/libs/leaseguard/adapters";
import { backendFetch } from "@/libs/leaseguard/backend";
import { isDemoMode, requireSession, respond } from "@/libs/leaseguard/bff";
import { demoStore } from "@/libs/leaseguard/demo-store";

export async function GET() {
  const route = "GET /api/wallet";
  const denied = await requireSession(route);
  if (denied) return denied;

  const result = isDemoMode() ? demoStore.wallet() : await backendFetch<unknown>("/api/v1/wallet");
  return respond(route, result, adaptWallet);
}
