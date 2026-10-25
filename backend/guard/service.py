"""RunService: the one place that talks to Temporal on behalf of API, MCP and Telegram."""

from __future__ import annotations

import asyncio
import logging
import re
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from pydantic import BaseModel
from temporalio.client import Client, WorkflowExecutionStatus
from temporalio.common import WorkflowIDConflictPolicy, WorkflowIDReusePolicy
from temporalio.exceptions import WorkflowAlreadyStartedError
from temporalio.service import RPCError, RPCStatusCode

from guard.models import DecideAction, Policy, ProbeSummary, RunInput, RunState
from guard.workflows import RunGuardWorkflow

logger = logging.getLogger(__name__)
RUN_ID_PATTERN = re.compile(r"^run-[A-Za-z0-9_-]{1,64}$")
RUNNING_QUERY = "WorkflowType='RunGuardWorkflow' AND ExecutionStatus='Running'"
MAX_LISTED_RUNS = 100
# Queries need a live worker; fail fast so the dashboard never hangs.
QUERY_TIMEOUT = timedelta(seconds=3)


class RunNotFoundError(LookupError):
    pass


class RunAlreadyGuardedError(RuntimeError):
    pass


class RunUnavailableError(RuntimeError):
    """The run exists but no worker answered and we have no cached state."""


class RunView(RunState):
    """RunState plus values computed at read time for the dashboard."""

    live_savings_inr: float
    stale: bool = False


class LogsView(BaseModel):
    log_tail: str
    losses: list[float]


def run_id_for(machine_id: int) -> str:
    return f"run-{machine_id}"


def validate_run_id(run_id: str) -> str:
    if not RUN_ID_PATTERN.fullmatch(run_id):
        raise RunNotFoundError(run_id)
    return run_id


def to_view(state: RunState, now: datetime | None = None, stale: bool = False) -> RunView:
    moment = now or datetime.now(UTC)
    return RunView(**state.model_dump(), live_savings_inr=state.live_savings(moment), stale=stale)


class RunService:
    def __init__(
        self,
        client: Client,
        task_queue: str,
        default_hourly_cost: float,
        default_policy: Policy | None = None,
    ) -> None:
        self._client = client
        self._task_queue = task_queue
        self._default_cost = default_hourly_cost
        self._default_policy = default_policy or Policy()
        # Last state seen per run, served (marked stale) while the worker is down.
        self._last_known: dict[str, RunState] = {}

    async def start_run(
        self,
        machine_id: int,
        name: str,
        gpu_type: str | None = None,
        hourly_cost_inr: float | None = None,
        policy: Policy | None = None,
    ) -> RunView:
        run_id = run_id_for(machine_id)
        inp = RunInput(
            run_id=run_id,
            machine_id=machine_id,
            name=name,
            gpu_type=gpu_type,
            hourly_cost_inr=self._default_cost if hourly_cost_inr is None else hourly_cost_inr,
            policy=policy or self._default_policy,
        )
        try:
            await self._client.start_workflow(
                RunGuardWorkflow.run,
                inp,
                id=run_id,
                task_queue=self._task_queue,
                id_conflict_policy=WorkflowIDConflictPolicy.FAIL,
                id_reuse_policy=WorkflowIDReusePolicy.ALLOW_DUPLICATE,
            )
        except WorkflowAlreadyStartedError as exc:
            raise RunAlreadyGuardedError(run_id) from exc
        return await self.get_run(run_id)

    async def _fetch(self, run_id: str) -> tuple[RunState, bool]:
        """Return (state, stale)."""
        handle = self._client.get_workflow_handle(validate_run_id(run_id))
        try:
            state = await handle.query(RunGuardWorkflow.get_state, rpc_timeout=QUERY_TIMEOUT)
        except RPCError as exc:
            if exc.status == RPCStatusCode.NOT_FOUND:
                self._last_known.pop(run_id, None)
                raise RunNotFoundError(run_id) from exc
            cached = self._last_known.get(run_id)
            if cached is None:
                raise RunUnavailableError(run_id) from exc
            logger.warning("worker unavailable; serving cached state for %s", run_id)
            return cached, True
        self._last_known[run_id] = state
        return state, False

    async def get_state(self, run_id: str) -> RunState:
        return (await self._fetch(run_id))[0]

    async def get_run(self, run_id: str) -> RunView:
        state, stale = await self._fetch(run_id)
        return to_view(state, stale=stale)

    async def _try_get_run(self, run_id: str) -> RunView | None:
        try:
            return await self.get_run(run_id)
        except (RunNotFoundError, RunUnavailableError):
            logger.warning("run %s could not be read while listing", run_id)
            return None

    async def list_runs(self) -> list[RunView]:
        run_ids = [
            execution.id
            async for execution in self._client.list_workflows(RUNNING_QUERY, limit=MAX_LISTED_RUNS)
            if execution.status == WorkflowExecutionStatus.RUNNING
        ]
        views = await asyncio.gather(*(self._try_get_run(run_id) for run_id in run_ids))
        return sorted((v for v in views if v), key=lambda v: v.started_at, reverse=True)

    async def get_logs(self, run_id: str) -> LogsView:
        probe = (await self.get_state(run_id)).last_probe
        if probe is None:
            return LogsView(log_tail="", losses=[])
        return LogsView(log_tail=probe.log_tail, losses=list(probe.losses))

    async def get_probe_history(self, run_id: str) -> list[ProbeSummary]:
        return list((await self.get_state(run_id)).probes)

    async def decide(self, run_id: str, action: DecideAction) -> None:
        await self._signal(run_id, RunGuardWorkflow.decide, action)

    async def extend(self, run_id: str, minutes: int) -> None:
        await self._signal(run_id, RunGuardWorkflow.extend, minutes)

    async def resume(self, run_id: str, gpu_type: str | None) -> None:
        await self._signal(run_id, RunGuardWorkflow.resume, gpu_type)

    async def stop(self, run_id: str) -> None:
        await self._signal(run_id, RunGuardWorkflow.stop)

    async def pause_all(self, reason: str) -> int:
        count = 0
        async for execution in self._client.list_workflows(RUNNING_QUERY, limit=MAX_LISTED_RUNS):
            await self.decide(execution.id, "pause")
            count += 1
        logger.warning("paused %d runs: %s", count, reason)
        return count

    async def _signal(self, run_id: str, signal: Callable[..., None], *args: object) -> None:
        handle = self._client.get_workflow_handle(validate_run_id(run_id))
        try:
            await handle.signal(signal, args=args)
        except RPCError as exc:
            raise RunNotFoundError(run_id) from exc
