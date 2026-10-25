import type { NextRequest } from "next/server";
import { badRequest, proxyToBackend, withSession } from "@/libs/backend";
import { isValidRunId } from "@/libs/runs";

export const GET = withSession(
  async (_request: NextRequest, ctx: RouteContext<"/api/runs/[id]">) => {
    const { id } = await ctx.params;
    if (!isValidRunId(id)) return badRequest("Invalid run id");
    return proxyToBackend(`/runs/${encodeURIComponent(id)}`);
  }
);
