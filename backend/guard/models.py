"""Domain models shared by the workflow, activities, API and MCP server.

All models are frozen: state changes produce new copies via the ``with_*``
helpers, which keeps Temporal workflow state easy to reason about.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MAX_EVENTS = 50
MAX_PROBES = 20


class Frozen(BaseModel):
    model_config = ConfigDict(frozen=True)


class RunStatus(StrEnum):
    WATCHING = "watching"
    AWAITING_DECISION = "awaiting_decision"
    CHECKPOINTING = "checkpointing"
    PAUSED = "paused"
    RESUMING = "resuming"
    NEEDS_TRIAGE = "needs_triage"
    STOPPED = "stopped"


VerdictAction = Literal["pause_run", "keep_running", "escalate_to_kepler"]
DecideAction = Literal["pause", "keep", "resolved"]


class Policy(Frozen):
    probe_interval_s: int = Field(default=60, ge=5)
    idle_gpu_pct: float = Field(default=5.0, ge=0, le=100)
    stale_log_s: int = Field(default=600, ge=30)
    loss_window: int = Field(default=8, ge=3)
    plateau_tolerance: float = Field(default=0.01, gt=0, lt=1)
    decision_timeout_s: int = Field(default=600, ge=10)
    keep_snooze_s: int = Field(default=1800, ge=0)
    checkpoint_timeout_s: int = Field(default=300, ge=10)
    max_loops_before_continue: int = Field(default=200, ge=10)


class Probe(Frozen):
    at: datetime
    gpu_util_pct: float
    gpu_mem_mb: float
    process_alive: bool
    losses: tuple[float, ...] = ()
    log_tail: str = ""
    seconds_since_log: float = 0.0
    error_hint: str | None = None


class ProbeSummary(Frozen):
    at: datetime
    gpu_util_pct: float
    process_alive: bool
    last_loss: float | None

    @classmethod
    def of(cls, probe: Probe) -> ProbeSummary:
        return cls(
            at=probe.at,
            gpu_util_pct=probe.gpu_util_pct,
            process_alive=probe.process_alive,
            last_loss=probe.losses[-1] if probe.losses else None,
        )


class Suspicion(Frozen):
    suspicious: bool
    signals: tuple[str, ...] = ()


class Verdict(Frozen):
    action: VerdictAction
    reason: str
    symptom: str | None = None
    recheck_minutes: int | None = None
    source: Literal["gemma", "rules"]
    at: datetime | None = None


class RunEvent(Frozen):
    at: datetime
    kind: str
    message: str


class RunState(Frozen):
    run_id: str
    machine_id: int
    name: str
    status: RunStatus = RunStatus.WATCHING
    gpu_type: str | None = None
    hourly_cost_inr: float = 0.0
    savings_inr: float = 0.0
    paused_at: datetime | None = None
    started_at: datetime
    last_probe: Probe | None = None
    last_verdict: Verdict | None = None
    probes: tuple[ProbeSummary, ...] = ()
    events: tuple[RunEvent, ...] = ()

    def with_status(self, status: RunStatus) -> RunState:
        return self.model_copy(update={"status": status})

    def with_probe(self, probe: Probe) -> RunState:
        probes = (*self.probes, ProbeSummary.of(probe))[-MAX_PROBES:]
        return self.model_copy(update={"last_probe": probe, "probes": probes})

    def with_verdict(self, verdict: Verdict) -> RunState:
        return self.model_copy(update={"last_verdict": verdict})

    def with_event(self, at: datetime, kind: str, message: str) -> RunState:
        events = (*self.events, RunEvent(at=at, kind=kind, message=message))[-MAX_EVENTS:]
        return self.model_copy(update={"events": events})

    def paused(self, at: datetime) -> RunState:
        return self.model_copy(update={"status": RunStatus.PAUSED, "paused_at": at})

    def resumed(self, at: datetime, machine_id: int, gpu_type: str | None) -> RunState:
        return self.model_copy(
            update={
                "status": RunStatus.WATCHING,
                "machine_id": machine_id,
                "gpu_type": gpu_type or self.gpu_type,
                "savings_inr": self.live_savings(at),
                "paused_at": None,
            }
        )

    def live_savings(self, now: datetime) -> float:
        if self.paused_at is None:
            return self.savings_inr
        hours = max((now - self.paused_at).total_seconds(), 0) / 3600
        return round(self.savings_inr + hours * self.hourly_cost_inr, 4)


class RunInput(Frozen):
    """Workflow input. ``carry`` holds state across continue-as-new."""

    run_id: str
    machine_id: int
    name: str
    gpu_type: str | None = None
    hourly_cost_inr: float = 0.0
    policy: Policy = Policy()
    carry: RunState | None = None


class JudgeRequest(Frozen):
    run_name: str
    probe: Probe
    suspicion: Suspicion


class ResumeRequest(Frozen):
    machine_id: int
    gpu_type: str | None = None


class CheckpointRequest(Frozen):
    machine_id: int
    timeout_s: int


class Button(Frozen):
    label: str
    data: str


class Notification(Frozen):
    text: str
    buttons: tuple[Button, ...] = ()


class WalletInput(Frozen):
    warn_threshold: float
    critical_threshold: float
    interval_s: int = 600
    last_level: Literal["ok", "warn", "critical"] = "ok"
    loops: int = 0
