"""Temporal activities. All I/O (SSH, SDK, Gemma, Telegram) happens here."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable

from temporalio import activity

from guard.models import (
    CheckpointRequest,
    JudgeRequest,
    Notification,
    Probe,
    ResumeRequest,
    Verdict,
)
from guard.notify import Notifier
from guard.rules import fallback_verdict
from providers.base import GpuProvider

CHECKPOINT_POLL_S = 5.0
HEARTBEAT_EVERY_S = 10.0
Judge = Callable[[JudgeRequest], Awaitable[Verdict | None]]
PauseAll = Callable[[str], Awaitable[int]]


async def _heartbeat_forever() -> None:
    while True:
        activity.heartbeat()
        await asyncio.sleep(HEARTBEAT_EVERY_S)


class GuardActivities:
    def __init__(
        self,
        provider: GpuProvider,
        judge: Judge,
        notifier: Notifier,
        pause_all: PauseAll | None = None,
    ) -> None:
        self._provider = provider
        self._judge = judge
        self._notifier = notifier
        self._pause_all = pause_all

    @activity.defn(name="probe")
    async def probe(self, machine_id: int) -> Probe:
        return await self._provider.probe(machine_id)

    @activity.defn(name="judge")
    async def judge(self, req: JudgeRequest) -> Verdict:
        verdict = await self._judge(req)
        return verdict or fallback_verdict(req.probe, req.suspicion)

    @activity.defn(name="request_checkpoint")
    async def request_checkpoint(self, machine_id: int) -> None:
        await self._provider.request_checkpoint(machine_id)

    @activity.defn(name="wait_checkpoint")
    async def wait_checkpoint(self, req: CheckpointRequest) -> bool:
        # Heartbeat from a side task: one `jl exec` can block longer than the heartbeat timeout.
        beating = asyncio.create_task(_heartbeat_forever())
        try:
            loop = asyncio.get_running_loop()
            deadline = loop.time() + req.timeout_s
            while loop.time() < deadline:
                if await self._provider.checkpoint_ready(req.machine_id):
                    return True
                await asyncio.sleep(CHECKPOINT_POLL_S)
            return False
        finally:
            beating.cancel()

    @activity.defn(name="pause")
    async def pause(self, machine_id: int) -> None:
        await self._provider.pause(machine_id)

    @activity.defn(name="resume")
    async def resume(self, req: ResumeRequest) -> int:
        return await self._provider.resume(req.machine_id, req.gpu_type)

    @activity.defn(name="balance")
    async def balance(self) -> float:
        return await self._provider.balance()

    @activity.defn(name="notify")
    async def notify(self, notification: Notification) -> None:
        await self._notifier.send(notification)

    @activity.defn(name="pause_all_runs")
    async def pause_all_runs(self, reason: str) -> int:
        if self._pause_all is None:
            return 0
        return await self._pause_all(reason)

    def all(self) -> list[Callable[..., Awaitable[object]]]:
        return [
            self.probe,
            self.judge,
            self.request_checkpoint,
            self.wait_checkpoint,
            self.pause,
            self.resume,
            self.balance,
            self.notify,
            self.pause_all_runs,
        ]
