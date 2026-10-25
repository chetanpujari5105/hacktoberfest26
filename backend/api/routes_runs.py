"""REST routes under /api/v1 (consumed by the Next.js BFF and the Kepler hook).

Contract: libs/leaseguard/README.md in the frontend. Run-changing actions return
the run so the dashboard can re-render without a second request.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, Field

from api.envelope import ok
from api.telegram_status import telegram_status
from guard.models import DecideAction, RunStatus
from guard.policies import PRESETS, PolicyBody, to_policy
from guard.service import RunService
from providers.base import GpuProvider

GPU_TYPE_PATTERN = r"^[A-Za-z0-9_-]{1,40}$"
CURRENCY = "INR"
NOT_BURNING = frozenset({RunStatus.PAUSED, RunStatus.STOPPED})
router = APIRouter(prefix="/api/v1")


class StartRunBody(BaseModel):
    machine_id: int = Field(gt=0)
    name: str | None = Field(default=None, min_length=1, max_length=80)
    gpu_type: str | None = Field(default=None, pattern=GPU_TYPE_PATTERN)
    hourly_cost_inr: float | None = Field(default=None, ge=0, le=1000)
    policy: PolicyBody | None = None


class DecideBody(BaseModel):
    action: DecideAction


class ExtendBody(BaseModel):
    minutes: int = Field(ge=1, le=720)


class ResumeBody(BaseModel):
    gpu_type: str | None = Field(default=None, pattern=GPU_TYPE_PATTERN)


def _service(request: Request) -> RunService:
    return request.app.state.service


def _provider(request: Request) -> GpuProvider:
    return request.app.state.provider


@router.get("/runs")
async def list_runs(request: Request) -> dict[str, Any]:
    return ok(await _service(request).list_runs())


@router.post("/runs", status_code=status.HTTP_201_CREATED)
async def start_run(request: Request, body: StartRunBody) -> dict[str, Any]:
    settings = request.app.state.settings
    instance = await _find_instance(request, body.machine_id)
    name = body.name or (instance.name if instance else f"machine-{body.machine_id}")
    gpu_type = body.gpu_type or (instance.gpu_type if instance else None)
    policy = to_policy(body.policy, settings.policy_seconds_per_minute) if body.policy else None
    run = await _service(request).start_run(
        body.machine_id, name, gpu_type, body.hourly_cost_inr, policy=policy
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
    return ok(await _service(request).get_run(run_id))


@router.post("/runs/{run_id}/extend")
async def extend(request: Request, run_id: str, body: ExtendBody) -> dict[str, Any]:
    await _service(request).extend(run_id, body.minutes)
    return ok(await _service(request).get_run(run_id))


@router.post("/runs/{run_id}/resume")
async def resume(request: Request, run_id: str, body: ResumeBody) -> dict[str, Any]:
    await _service(request).resume(run_id, body.gpu_type)
    return ok(await _service(request).get_run(run_id))


@router.post("/runs/{run_id}/stop")
async def stop(request: Request, run_id: str) -> dict[str, Any]:
    await _service(request).stop(run_id)
    return ok({"ok": True})


@router.get("/wallet")
async def wallet(request: Request) -> dict[str, Any]:
    settings = request.app.state.settings
    runs = await _service(request).list_runs()
    burn = sum(r.hourly_cost_inr for r in runs if r.status not in NOT_BURNING)
    return ok(
        {
            "balance": await _provider(request).balance(),
            "currency": CURRENCY,
            "burn_rate_per_hour": round(burn, 2),
            "as_of": datetime.now(UTC),
            "warn_threshold": settings.wallet_warn_inr,
            "critical_threshold": settings.wallet_critical_inr,
        }
    )


@router.get("/instances/eligible")
async def eligible_instances(request: Request) -> dict[str, Any]:
    guarded = {r.machine_id for r in await _service(request).list_runs()}
    default_rate = request.app.state.settings.default_hourly_cost_inr
    instances = [
        i.model_copy(update={"hourly_rate": i.hourly_rate or default_rate})
        for i in await _provider(request).list_instances()
        if i.machine_id not in guarded
    ]
    return ok(instances)


@router.get("/policies")
async def policies() -> dict[str, Any]:
    return ok(list(PRESETS))


@router.get("/telegram/status")
async def get_telegram_status(request: Request) -> dict[str, Any]:
    return ok(await telegram_status(request.app.state.settings))


async def _find_instance(request: Request, machine_id: int):  # noqa: ANN202
    try:
        instances = await _provider(request).list_instances()
    except Exception:  # listing is best-effort; guarding must still work
        return None
    return next((i for i in instances if i.machine_id == machine_id), None)
