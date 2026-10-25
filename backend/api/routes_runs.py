"""REST routes under /api/v1 (consumed by the Next.js dashboard and the Kepler hook)."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, Field

from api.envelope import ok
from guard.models import DecideAction
from guard.service import RunService

GPU_TYPE_PATTERN = r"^[A-Za-z0-9_-]{1,40}$"
router = APIRouter(prefix="/api/v1")
Balance = Callable[[], Awaitable[float]]


class StartRunBody(BaseModel):
    machine_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=80)
    gpu_type: str | None = Field(default=None, pattern=GPU_TYPE_PATTERN)
    hourly_cost_inr: float | None = Field(default=None, ge=0, le=1000)


class DecideBody(BaseModel):
    action: DecideAction


class ExtendBody(BaseModel):
    minutes: int = Field(ge=1, le=720)


class ResumeBody(BaseModel):
    gpu_type: str | None = Field(default=None, pattern=GPU_TYPE_PATTERN)


def _service(request: Request) -> RunService:
    return request.app.state.service


@router.get("/runs")
async def list_runs(request: Request) -> dict[str, Any]:
    return ok(await _service(request).list_runs())


@router.post("/runs", status_code=status.HTTP_201_CREATED)
async def start_run(request: Request, body: StartRunBody) -> dict[str, Any]:
    run = await _service(request).start_run(
        body.machine_id, body.name, body.gpu_type, body.hourly_cost_inr
    )
    return ok(run)


@router.get("/runs/{run_id}")
async def get_run(request: Request, run_id: str) -> dict[str, Any]:
    return ok(await _service(request).get_run(run_id))


@router.get("/runs/{run_id}/logs")
async def get_logs(request: Request, run_id: str) -> dict[str, Any]:
    return ok(await _service(request).get_logs(run_id))


@router.post("/runs/{run_id}/decide")
async def decide(request: Request, run_id: str, body: DecideBody) -> dict[str, Any]:
    await _service(request).decide(run_id, body.action)
    return ok({"ok": True})


@router.post("/runs/{run_id}/extend")
async def extend(request: Request, run_id: str, body: ExtendBody) -> dict[str, Any]:
    await _service(request).extend(run_id, body.minutes)
    return ok({"ok": True})


@router.post("/runs/{run_id}/resume")
async def resume(request: Request, run_id: str, body: ResumeBody) -> dict[str, Any]:
    await _service(request).resume(run_id, body.gpu_type)
    return ok({"ok": True})


@router.post("/runs/{run_id}/stop")
async def stop(request: Request, run_id: str) -> dict[str, Any]:
    await _service(request).stop(run_id)
    return ok({"ok": True})


@router.get("/wallet")
async def wallet(request: Request) -> dict[str, Any]:
    settings = request.app.state.settings
    balance: Balance = request.app.state.balance
    return ok(
        {
            "balance": await balance(),
            "warn_threshold": settings.wallet_warn_inr,
            "critical_threshold": settings.wallet_critical_inr,
        }
    )
