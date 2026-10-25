"""Integration tests: real workflows on Temporal's time-skipping test server."""

import asyncio
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field
from datetime import timedelta
from uuid import uuid4

import pytest
from temporalio.client import WorkflowHandle
from temporalio.contrib.pydantic import pydantic_data_converter
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from guard.activities import GuardActivities
from guard.models import (
    JudgeRequest,
    Notification,
    Policy,
    RunState,
    RunStatus,
    Verdict,
    WalletInput,
)
from guard.service import RunAlreadyGuardedError, RunNotFoundError, RunService
from guard.workflows import RunGuardWorkflow, WalletGuardWorkflow
from providers.fake import FakeProvider

pytestmark = pytest.mark.integration
POLICY = Policy(probe_interval_s=60, decision_timeout_s=600, keep_snooze_s=1800)
STEP = timedelta(seconds=60)


@dataclass
class Harness:
    env: WorkflowEnvironment
    service: RunService
    provider: FakeProvider
    sent: list[Notification]
    paused_all: list[str] = field(default_factory=list)

    async def wait_for(
        self, run_id: str, predicate: Callable[[RunState], bool], steps: int = 40
    ) -> RunState:
        for _ in range(steps):
            state = await self.service.get_state(run_id)
            if predicate(state):
                return state
            await self.env.sleep(STEP)
        raise AssertionError(f"condition not reached; last status {state.status}")


class RecordingNotifier:
    def __init__(self, sink: list[Notification]) -> None:
        self.sink = sink

    async def send(self, notification: Notification) -> None:
        self.sink.append(notification)


def _no_gemma() -> Callable[[JudgeRequest], object]:
    async def judge(_: JudgeRequest) -> Verdict | None:
        return None

    return judge


@pytest.fixture
async def make_harness() -> AsyncIterator[Callable[..., object]]:
    env = await WorkflowEnvironment.start_time_skipping(data_converter=pydantic_data_converter)
    workers: list[Worker] = []

    async def build(scenarios: dict[int, str], judge: object = None) -> Harness:
        provider = FakeProvider(scenarios)  # type: ignore[arg-type]
        sent: list[Notification] = []
        queue = f"tq-{uuid4()}"
        service = RunService(env.client, queue, default_hourly_cost=2.0)
        harness = Harness(env, service, provider, sent)

        async def pause_all(reason: str) -> int:
            harness.paused_all.append(reason)
            return 0

        acts = GuardActivities(provider, judge or _no_gemma(), RecordingNotifier(sent), pause_all)
        worker = Worker(
            env.client,
            task_queue=queue,
            workflows=[RunGuardWorkflow, WalletGuardWorkflow],
            activities=acts.all(),
        )
        await worker.__aenter__()
        workers.append(worker)
        return harness

    yield build
    for worker in workers:
        await worker.__aexit__(None, None, None)
    await env.shutdown()


async def test_converged_run_is_paused_then_resumed_on_new_gpu(make_harness) -> None:  # noqa: ANN001
    h: Harness = await make_harness({1: "converge"})
    await h.service.start_run(1, "llama-ft", policy=POLICY)

    state = await h.wait_for("run-1", lambda s: s.status == RunStatus.AWAITING_DECISION)
    assert state.last_verdict is not None
    assert state.last_verdict.action == "pause_run"
    assert state.last_verdict.source == "rules"
    assert "looks done" in h.sent[-1].text

    await h.service.decide("run-1", "pause")
    state = await h.wait_for("run-1", lambda s: s.status == RunStatus.PAUSED)
    assert any(e.kind == "checkpoint" and "saved" in e.message for e in state.events)

    # Workflow time is skipped ahead of the wall clock here, so evaluate savings in workflow time.
    assert state.paused_at is not None
    assert state.live_savings(state.paused_at + timedelta(hours=1)) == pytest.approx(2.0)
    await h.env.sleep(timedelta(hours=1))

    await h.service.resume("run-1", "A5000")
    state = await h.wait_for(
        "run-1", lambda s: s.status == RunStatus.WATCHING and s.machine_id != 1
    )
    assert state.machine_id == 1001
    assert state.gpu_type == "A5000"
    assert state.savings_inr >= 2.0


async def test_no_response_auto_pauses(make_harness) -> None:  # noqa: ANN001
    h: Harness = await make_harness({2: "converge"})
    await h.service.start_run(2, "auto", policy=POLICY)
    await h.wait_for("run-2", lambda s: s.status == RunStatus.AWAITING_DECISION)
    state = await h.wait_for("run-2", lambda s: s.status == RunStatus.PAUSED, steps=15)
    assert any("auto-pausing" in e.message for e in state.events)


async def test_keep_snoozes_and_returns_to_watching(make_harness) -> None:  # noqa: ANN001
    h: Harness = await make_harness({3: "converge"})
    await h.service.start_run(3, "keep", policy=POLICY)
    await h.wait_for("run-3", lambda s: s.status == RunStatus.AWAITING_DECISION)
    await h.service.decide("run-3", "keep")
    state = await h.wait_for("run-3", lambda s: s.status == RunStatus.WATCHING)
    assert any("Kept running" in e.message for e in state.events)


async def test_oom_escalates_to_kepler_without_pausing(make_harness) -> None:  # noqa: ANN001
    h: Harness = await make_harness({4: "oom"})
    await h.service.start_run(4, "oom-run", policy=POLICY)
    state = await h.wait_for("run-4", lambda s: s.status == RunStatus.NEEDS_TRIAGE)
    assert state.last_verdict is not None
    assert state.last_verdict.symptom == "oom"
    assert "/triage run-4" in h.sent[-1].text
    assert state.paused_at is None

    await h.service.decide("run-4", "resolved")
    state = await h.wait_for("run-4", lambda s: s.status == RunStatus.WATCHING)
    assert state.events[-1].kind == "resolved"


async def test_gemma_verdict_wins_over_rules(make_harness) -> None:  # noqa: ANN001
    async def gemma(_: JudgeRequest) -> Verdict | None:
        return Verdict(
            action="escalate_to_kepler",
            reason="loss curve looks diverged",
            symptom="divergence",
            source="gemma",
        )

    h: Harness = await make_harness({5: "converge"}, judge=gemma)
    await h.service.start_run(5, "gemma", policy=POLICY)
    state = await h.wait_for("run-5", lambda s: s.status == RunStatus.NEEDS_TRIAGE)
    assert state.last_verdict is not None
    assert state.last_verdict.source == "gemma"


async def test_manual_pause_while_watching(make_harness) -> None:  # noqa: ANN001
    h: Harness = await make_harness({6: "healthy"})
    await h.service.start_run(6, "manual", policy=POLICY)
    await h.wait_for("run-6", lambda s: s.last_probe is not None)
    await h.service.decide("run-6", "pause")
    state = await h.wait_for("run-6", lambda s: s.status == RunStatus.PAUSED)
    assert any("manually" in e.message for e in state.events)


async def test_stop_completes_workflow(make_harness) -> None:  # noqa: ANN001
    h: Harness = await make_harness({7: "healthy"})
    await h.service.start_run(7, "stop-me", policy=POLICY)
    await h.service.stop("run-7")
    handle: WorkflowHandle = h.env.client.get_workflow_handle("run-7", result_type=RunState)
    result = await handle.result()
    assert result.status == RunStatus.STOPPED


async def test_duplicate_and_unknown_runs(make_harness) -> None:  # noqa: ANN001
    h: Harness = await make_harness({8: "healthy"})
    await h.service.start_run(8, "dup", policy=POLICY)
    with pytest.raises(RunAlreadyGuardedError):
        await h.service.start_run(8, "dup", policy=POLICY)
    with pytest.raises(RunNotFoundError):
        await h.service.get_run("run-999")
    with pytest.raises(RunNotFoundError):
        await h.service.get_run("../etc/passwd")


async def test_wallet_critical_pauses_everything(make_harness) -> None:  # noqa: ANN001
    h: Harness = await make_harness({})
    handle = await h.env.client.start_workflow(
        WalletGuardWorkflow.run,
        # Both above FakeProvider's ₹4050 balance
        WalletInput(warn_threshold=5000.0, critical_threshold=4500.0, interval_s=600),
        id=f"wallet-{uuid4()}",
        task_queue=h.service._task_queue,  # noqa: SLF001
    )
    for _ in range(10):
        if h.paused_all:
            break
        await h.env.sleep(STEP)
    assert h.paused_all == ["wallet critical"]
    assert "critical" in h.sent[-1].text
    await handle.terminate()


async def test_list_and_pause_all_on_dev_server() -> None:
    """The time-skipping server has no visibility API, so use the local dev server."""
    env = await WorkflowEnvironment.start_local(data_converter=pydantic_data_converter)
    queue = f"tq-{uuid4()}"
    acts = GuardActivities(FakeProvider({}), _no_gemma(), RecordingNotifier([]))
    try:
        async with Worker(
            env.client, task_queue=queue, workflows=[RunGuardWorkflow], activities=acts.all()
        ):
            service = RunService(env.client, queue, default_hourly_cost=1.0)
            await service.start_run(11, "a", policy=POLICY)
            await service.start_run(12, "b", policy=POLICY)
            listed: list[str] = []
            for _ in range(50):  # visibility is eventually consistent
                listed = sorted(r.run_id for r in await service.list_runs())
                if len(listed) == 2:
                    break
                await asyncio.sleep(0.2)
            assert listed == ["run-11", "run-12"]
            assert await service.pause_all("test") == 2
            for run_id in listed:
                await service.stop(run_id)
    finally:
        await env.shutdown()
