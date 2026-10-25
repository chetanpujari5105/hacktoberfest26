from collections.abc import AsyncIterator
from typing import Any

import httpx
import pytest

from api.main import create_app
from config import Settings
from guard.models import ProbeSummary
from guard.service import (
    LogsView,
    RunAlreadyGuardedError,
    RunNotFoundError,
    RunView,
    validate_run_id,
)
from tests.factories import NOW, make_probe

pytestmark = pytest.mark.unit
KEY = "test-key"
HEADERS = {"X-API-Key": KEY}


def _view(run_id: str = "run-1") -> RunView:
    return RunView(
        run_id=run_id,
        machine_id=1,
        name="demo",
        started_at=NOW,
        last_probe=make_probe(),
        live_savings_inr=0.0,
    )


class FakeService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, Any]] = []
        self.guarded: set[int] = set()

    async def list_runs(self) -> list[RunView]:
        return [_view()]

    async def start_run(self, machine_id: int, name: str, gpu_type: Any, cost: Any) -> RunView:
        if machine_id in self.guarded:
            raise RunAlreadyGuardedError(f"run-{machine_id}")
        self.guarded.add(machine_id)
        self.calls.append(("start", (machine_id, name, gpu_type, cost)))
        return _view(f"run-{machine_id}")

    async def get_run(self, run_id: str) -> RunView:
        validate_run_id(run_id)
        if run_id != "run-1":
            raise RunNotFoundError(run_id)
        return _view()

    async def get_logs(self, run_id: str) -> LogsView:
        return LogsView(log_tail="step=1 loss=1.0", losses=[1.0])

    async def get_probe_history(self, run_id: str) -> list[ProbeSummary]:
        return [ProbeSummary.of(make_probe())]

    async def decide(self, run_id: str, action: str) -> None:
        self.calls.append(("decide", (run_id, action)))

    async def extend(self, run_id: str, minutes: int) -> None:
        self.calls.append(("extend", (run_id, minutes)))

    async def resume(self, run_id: str, gpu_type: str | None) -> None:
        self.calls.append(("resume", (run_id, gpu_type)))

    async def stop(self, run_id: str) -> None:
        self.calls.append(("stop", run_id))


async def _balance() -> float:
    return 12.5


@pytest.fixture
async def ctx() -> AsyncIterator[tuple[httpx.AsyncClient, FakeService]]:
    service = FakeService()
    settings = Settings(backend_api_key=KEY, provider="fake", llm="off", _env_file=None)
    app = create_app(settings, service=service, balance=_balance)  # type: ignore[arg-type]
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, service


async def test_health_is_public(ctx) -> None:  # noqa: ANN001
    client, _ = ctx
    assert (await client.get("/health")).json() == {"status": "ok"}


@pytest.mark.parametrize("path", ["/api/v1/runs", "/mcp/"])
async def test_protected_paths_require_key(ctx, path: str) -> None:  # noqa: ANN001
    client, _ = ctx
    response = await client.get(path, headers={"X-API-Key": "wrong"})
    assert response.status_code == 401
    assert response.json() == {"success": False, "data": None, "error": "Unauthorized"}


async def test_list_runs_envelope(ctx) -> None:  # noqa: ANN001
    client, _ = ctx
    body = (await client.get("/api/v1/runs", headers=HEADERS)).json()
    assert body["success"] is True
    assert body["error"] is None
    assert body["data"][0]["run_id"] == "run-1"
    assert body["data"][0]["status"] == "watching"


async def test_start_run_and_conflict(ctx) -> None:  # noqa: ANN001
    client, service = ctx
    payload = {"machine_id": 42, "name": "llama"}
    created = await client.post("/api/v1/runs", json=payload, headers=HEADERS)
    assert created.status_code == 201
    assert created.json()["data"]["run_id"] == "run-42"
    again = await client.post("/api/v1/runs", json=payload, headers=HEADERS)
    assert again.status_code == 409
    assert again.json()["success"] is False


@pytest.mark.parametrize(
    "payload",
    [
        {"machine_id": -1, "name": "x"},
        {"machine_id": 1, "name": ""},
        {"machine_id": 1, "name": "x", "gpu_type": "A100; rm -rf /"},
        {"machine_id": 1, "name": "x", "hourly_cost_inr": 5000},
    ],
)
async def test_start_run_validation(ctx, payload: dict[str, Any]) -> None:  # noqa: ANN001
    client, _ = ctx
    response = await client.post("/api/v1/runs", json=payload, headers=HEADERS)
    assert response.status_code == 422
    assert response.json()["success"] is False


async def test_get_unknown_run_is_404(ctx) -> None:  # noqa: ANN001
    client, _ = ctx
    response = await client.get("/api/v1/runs/run-404", headers=HEADERS)
    assert response.status_code == 404
    assert "run-404" in response.json()["error"]


async def test_actions_forward_to_service(ctx) -> None:  # noqa: ANN001
    client, service = ctx
    for path, body in [
        ("decide", {"action": "pause"}),
        ("extend", {"minutes": 30}),
        ("resume", {"gpu_type": "A5000"}),
        ("resume", {"gpu_type": None}),
        ("stop", {}),
    ]:
        response = await client.post(f"/api/v1/runs/run-1/{path}", json=body, headers=HEADERS)
        assert response.json() == {"success": True, "data": {"ok": True}, "error": None}
    assert ("decide", ("run-1", "pause")) in service.calls
    assert ("resume", ("run-1", None)) in service.calls
    assert ("stop", "run-1") in service.calls


async def test_invalid_decide_action(ctx) -> None:  # noqa: ANN001
    client, _ = ctx
    response = await client.post(
        "/api/v1/runs/run-1/decide", json={"action": "destroy"}, headers=HEADERS
    )
    assert response.status_code == 422


async def test_logs_and_wallet(ctx) -> None:  # noqa: ANN001
    client, _ = ctx
    logs = (await client.get("/api/v1/runs/run-1/logs", headers=HEADERS)).json()
    assert logs["data"] == {"log_tail": "step=1 loss=1.0", "losses": [1.0]}
    wallet = (await client.get("/api/v1/wallet", headers=HEADERS)).json()
    assert wallet["data"]["balance"] == 12.5
    assert wallet["data"]["critical_threshold"] == 250.0


def test_missing_api_key_refuses_to_start() -> None:
    settings = Settings(backend_api_key="", provider="fake", llm="off", _env_file=None)
    app = create_app(settings, service=FakeService(), balance=_balance)  # type: ignore[arg-type]
    with pytest.raises(ValueError, match="BACKEND_API_KEY"):
        app.build_middleware_stack()


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/openapi.json"])
async def test_api_docs_are_not_public(ctx, path: str) -> None:  # noqa: ANN001
    client, _ = ctx
    assert (await client.get(path)).status_code == 404
