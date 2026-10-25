"""RunService behaviour when the Temporal worker is down (the kill-the-worker demo)."""

from typing import Any

import pytest
from temporalio.service import RPCError, RPCStatusCode

from guard.models import RunState
from guard.service import RunNotFoundError, RunService, RunUnavailableError
from tests.factories import NOW

pytestmark = pytest.mark.unit
STATE = RunState(run_id="run-1", machine_id=1, name="demo", started_at=NOW)


class Handle:
    def __init__(self, outcome: Any) -> None:
        self.outcome = outcome
        self.kwargs: dict[str, Any] = {}

    async def query(self, *_: Any, **kwargs: Any) -> RunState:
        self.kwargs = kwargs
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return self.outcome


class Client:
    def __init__(self) -> None:
        self.outcome: Any = STATE
        self.last: Handle | None = None

    def get_workflow_handle(self, _: str) -> Handle:
        self.last = Handle(self.outcome)
        return self.last


def _service() -> tuple[RunService, Client]:
    client = Client()
    return RunService(client, "tq", 1.0), client  # type: ignore[arg-type]


async def test_queries_use_short_timeout() -> None:
    service, client = _service()
    await service.get_run("run-1")
    assert client.last is not None
    assert client.last.kwargs["rpc_timeout"].total_seconds() <= 5


async def test_not_found_maps_to_404_error() -> None:
    service, client = _service()
    client.outcome = RPCError("missing", RPCStatusCode.NOT_FOUND, b"")
    with pytest.raises(RunNotFoundError):
        await service.get_run("run-1")


async def test_worker_down_serves_last_known_state_as_stale() -> None:
    service, client = _service()
    fresh = await service.get_run("run-1")
    assert fresh.stale is False
    client.outcome = RPCError("deadline", RPCStatusCode.DEADLINE_EXCEEDED, b"")
    stale = await service.get_run("run-1")
    assert stale.stale is True
    assert stale.run_id == "run-1"


async def test_worker_down_without_cache_is_unavailable() -> None:
    service, client = _service()
    client.outcome = RPCError("deadline", RPCStatusCode.DEADLINE_EXCEEDED, b"")
    with pytest.raises(RunUnavailableError):
        await service.get_run("run-1")
