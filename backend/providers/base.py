"""The GPU provider interface used by Temporal activities."""

from __future__ import annotations

from typing import Protocol

from guard.models import InstanceInfo, Probe


class GpuProvider(Protocol):
    async def probe(self, machine_id: int) -> Probe:
        """Collect GPU stats, process liveness and the training log tail."""
        ...

    async def request_checkpoint(self, machine_id: int) -> None:
        """Ask the training process to save a checkpoint."""
        ...

    async def checkpoint_ready(self, machine_id: int) -> bool:
        """True once the requested checkpoint has been written."""
        ...

    async def pause(self, machine_id: int) -> None: ...

    async def resume(self, machine_id: int, gpu_type: str | None) -> int:
        """Resume the instance and return its (possibly new) machine id."""
        ...

    async def balance(self) -> float: ...

    async def list_instances(self) -> list[InstanceInfo]:
        """Running instances that could be guarded."""
        ...
