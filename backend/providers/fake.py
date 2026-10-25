"""Scripted provider so the full flow can be demoed without GPUs or credits.

Scenarios (select per machine id with ``FAKE_SCENARIOS="101=converge,102=oom"``):
- ``converge``: loss falls for a few probes, then flattens (-> pause_run)
- ``oom``:      healthy for 3 probes, then CUDA OOM crash (-> escalate_to_kepler)
- ``stall``:    healthy for 3 probes, then GPU idle with no log output (-> escalate)
- ``healthy``:  keeps improving forever (used after a resume)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from typing import Literal

from guard.logparse import detect_error, extract_losses
from guard.models import Probe

logger = logging.getLogger(__name__)

Scenario = Literal["converge", "oom", "stall", "healthy"]
SCENARIOS: tuple[Scenario, ...] = ("converge", "oom", "stall", "healthy")
FAILURE_TICK = 3
RESUME_ID_OFFSET = 1000
OOM_LINE = "torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 20.00 GiB"


def parse_scenarios(spec: str) -> dict[int, Scenario]:
    result: dict[int, Scenario] = {}
    for item in spec.split(","):
        key, _, value = item.strip().partition("=")
        if key.isdigit() and value in SCENARIOS:
            result[int(key)] = value  # type: ignore[assignment]
    return result


@dataclass(frozen=True)
class _Sim:
    scenario: Scenario
    tick: int = 0
    log: str = ""
    checkpoint_requested: bool = False
    checkpointed: bool = False
    paused: bool = False


def _loss(scenario: Scenario, tick: int) -> float:
    if scenario == "healthy":
        return round(1.0 / (tick + 1), 5)
    if tick < 6:
        return round(2.0 - 0.25 * tick, 5)
    return round(0.5 + 0.001 * ((tick * 7) % 3 - 1), 5)


def _advance(sim: _Sim) -> tuple[_Sim, float, float, bool, float]:
    """Returns (new_sim, gpu_util, gpu_mem, alive, seconds_since_log)."""
    tick = sim.tick + 1
    failed = sim.scenario in ("oom", "stall") and tick > FAILURE_TICK
    if not failed:
        log = f"{sim.log}step={tick * 100} loss={_loss(sim.scenario, tick)}\n"
        return replace(sim, tick=tick, log=log), 93.0, 15200.0, True, 4.0
    if sim.scenario == "oom":
        log = (
            sim.log
            if OOM_LINE in sim.log
            else f"{sim.log}Traceback (most recent call last):\n{OOM_LINE}\n"
        )
        return replace(sim, tick=tick, log=log), 0.0, 0.0, False, 30.0
    quiet_for = (tick - FAILURE_TICK) * 400.0
    return replace(sim, tick=tick), 0.0, 15200.0, True, quiet_for


class FakeProvider:
    def __init__(self, scenarios: dict[int, Scenario]) -> None:
        self._scenarios = dict(scenarios)
        self._sims: dict[int, _Sim] = {}

    def _sim(self, machine_id: int) -> _Sim:
        # Resumed machines keep training even if the worker restarted and lost its memory.
        default: Scenario = "healthy" if machine_id >= RESUME_ID_OFFSET else "converge"
        return self._sims.get(machine_id) or _Sim(self._scenarios.get(machine_id, default))

    async def probe(self, machine_id: int) -> Probe:
        sim, util, mem, alive, quiet = _advance(self._sim(machine_id))
        self._sims[machine_id] = sim
        return Probe(
            at=datetime.now(UTC),
            gpu_util_pct=util,
            gpu_mem_mb=mem,
            process_alive=alive,
            losses=extract_losses(sim.log),
            log_tail=sim.log[-4000:],
            seconds_since_log=quiet,
            error_hint=detect_error(sim.log),
        )

    async def request_checkpoint(self, machine_id: int) -> None:
        self._sims[machine_id] = replace(self._sim(machine_id), checkpoint_requested=True)

    async def checkpoint_ready(self, machine_id: int) -> bool:
        sim = self._sim(machine_id)
        if sim.checkpoint_requested and not sim.checkpointed:
            self._sims[machine_id] = replace(sim, checkpointed=True)
        return sim.checkpoint_requested

    async def pause(self, machine_id: int) -> None:
        self._sims[machine_id] = replace(self._sim(machine_id), paused=True)
        logger.info("fake: paused machine %s", machine_id)

    async def resume(self, machine_id: int, gpu_type: str | None) -> int:
        new_id = machine_id + RESUME_ID_OFFSET
        self._sims[new_id] = _Sim("healthy")
        logger.info("fake: resumed %s as %s on %s", machine_id, new_id, gpu_type or "same GPU")
        return new_id

    async def balance(self) -> float:
        return 4050.0  # INR, like the real hackathon grant; above the wallet thresholds
