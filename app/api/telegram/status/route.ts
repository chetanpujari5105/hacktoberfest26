import { adaptTelegramStatus } from "@/libs/leaseguard/adapters";
import { backendFetch } from "@/libs/leaseguard/backend";
import { errorResponse, isDemoMode, requireSession, respond } from "@/libs/leaseguard/bff";
import { demoStore } from "@/libs/leaseguard/demo-store";

// PROPOSED contract: Telegram link status. The bot itself lives in the backend.
export async function GET() {
  const route = "GET /api/telegram/status";
  const denied = await requireSession(route);
  if (denied) return denied;

  const result = isDemoMode()
    ? demoStore.telegramStatus()
    : await backendFetch<unknown>("/api/v1/telegram/status", { notFoundCode: "NOT_IMPLEMENTED" });
  return respond(route, result, adaptTelegramStatus);
}

// Simulated "Connect" for DEMO_MODE only. Live linking happens via the bot's link_url.
export async function POST() {
  const route = "POST /api/telegram/status";
  const denied = await requireSession(route);
  if (denied) return denied;

  if (!isDemoMode()) {
    return errorResponse(route, {
      code: "NOT_IMPLEMENTED",
      message: "Telegram is linked through the bot, not from this page.",
      status: 501,
    });
  }
  return respond(route, demoStore.telegramConnect(), adaptTelegramStatus);
}
