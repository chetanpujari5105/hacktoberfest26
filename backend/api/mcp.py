"""MCP tools for Kepler (and any MCP client). Mounted at /mcp behind the API key."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from fastapi.encoders import jsonable_encoder
from fastmcp import FastMCP

from guard.service import RunService

ServiceGetter = Callable[[], RunService]


def build_mcp(get_service: ServiceGetter) -> FastMCP:
    mcp = FastMCP("LeaseGuard")

    @mcp.tool
    async def list_runs() -> list[dict[str, Any]]:
        """List every guarded GPU training run with status, verdict and savings."""
        return jsonable_encoder(await get_service().list_runs())

    @mcp.tool
    async def get_run(run_id: str) -> dict[str, Any]:
        """Full state of one run: last probe, Gemma verdict, events. run_id looks like run-123."""
        return jsonable_encoder(await get_service().get_run(run_id))

    @mcp.tool
    async def get_logs(run_id: str) -> dict[str, Any]:
        """Latest training log tail and recent loss values for a run."""
        return jsonable_encoder(await get_service().get_logs(run_id))

    @mcp.tool
    async def get_probe_history(run_id: str) -> list[dict[str, Any]]:
        """Recent probes (GPU %, process alive, last loss) to see when a run went wrong."""
        return jsonable_encoder(await get_service().get_probe_history(run_id))

    @mcp.tool
    async def extend(run_id: str, minutes: int) -> str:
        """Snooze the guard for N minutes (1-720)."""
        await get_service().extend(run_id, max(1, min(minutes, 720)))
        return f"Extended {run_id} by {minutes} min"

    @mcp.tool
    async def pause_now(run_id: str) -> str:
        """Checkpoint and pause the run's GPU now."""
        await get_service().decide(run_id, "pause")
        return f"Pause requested for {run_id}"

    @mcp.tool
    async def resume(run_id: str, gpu_type: str | None = None) -> str:
        """Resume a paused run, optionally on a different GPU type (e.g. A5000)."""
        await get_service().resume(run_id, gpu_type)
        return f"Resume requested for {run_id} on {gpu_type or 'the same GPU'}"

    @mcp.tool
    async def resolve(run_id: str) -> str:
        """Close a triage: mark a run flagged as broken as fixed so the guard watches it again."""
        await get_service().decide(run_id, "resolved")
        return f"Marked {run_id} resolved"

    return mcp
