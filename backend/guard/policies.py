"""Dashboard policy presets and the minutes-based policy the frontend sends."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from guard.models import Policy

NoResponse = Literal["checkpoint_and_pause", "notify_only"]
MIN_PROBE_S = 5
MIN_STALE_S = 30
MIN_DECISION_S = 10


class PolicyBody(BaseModel):
    """Policy as the dashboard expresses it (minutes, percent)."""

    preset_id: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{1,64}$")
    check_interval_min: int = Field(ge=1, le=60)
    idle_threshold_pct: int = Field(ge=1, le=50)
    idle_window_min: int = Field(ge=5, le=240)
    reminder_timeout_min: int = Field(ge=1, le=240)
    on_no_response: NoResponse = "checkpoint_and_pause"


class PolicyPreset(PolicyBody):
    id: str
    name: str
    description: str


PRESETS: tuple[PolicyPreset, ...] = (
    PolicyPreset(
        id="demo",
        name="Demo (fast)",
        description="Checks every minute and asks quickly. Best for live demos.",
        check_interval_min=1,
        idle_threshold_pct=5,
        idle_window_min=5,
        reminder_timeout_min=1,
    ),
    PolicyPreset(
        id="balanced",
        name="Balanced",
        description="Checks every 5 min; pauses after 15 min without an answer.",
        check_interval_min=5,
        idle_threshold_pct=10,
        idle_window_min=20,
        reminder_timeout_min=15,
    ),
    PolicyPreset(
        id="cost_saver",
        name="Cost saver",
        description="Checks every 2 min; pauses after 5 min without an answer.",
        check_interval_min=2,
        idle_threshold_pct=10,
        idle_window_min=10,
        reminder_timeout_min=5,
    ),
    PolicyPreset(
        id="notify_only",
        name="Notify only",
        description="Never pauses on its own; only asks you on Telegram.",
        check_interval_min=5,
        idle_threshold_pct=5,
        idle_window_min=30,
        reminder_timeout_min=15,
        on_no_response="notify_only",
    ),
)


def to_policy(body: PolicyBody, seconds_per_minute: int) -> Policy:
    """Convert dashboard minutes into guard seconds (scaled down for demos)."""
    return Policy(
        probe_interval_s=max(MIN_PROBE_S, body.check_interval_min * seconds_per_minute),
        idle_gpu_pct=float(body.idle_threshold_pct),
        stale_log_s=max(MIN_STALE_S, body.idle_window_min * seconds_per_minute),
        decision_timeout_s=max(MIN_DECISION_S, body.reminder_timeout_min * seconds_per_minute),
        auto_pause_on_timeout=body.on_no_response == "checkpoint_and_pause",
        preset_id=body.preset_id,
    )
