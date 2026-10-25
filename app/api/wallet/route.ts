import { proxyToBackend, withSession } from "@/libs/backend";

export const GET = withSession(async () => proxyToBackend("/wallet"));
