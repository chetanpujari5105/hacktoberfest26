"""Notification text and button payloads. Pure functions (safe inside workflows).

Button ``data`` is parsed by the Telegram bot: ``<action>:<run_id>[:<gpu_type>]``.
Telegram limits callback data to 64 bytes, which run ids comfortably fit.
"""

from __future__ import annotations

from typing import Literal

from guard.models import Button, Notification, Policy, ResumeRequest, RunState, Verdict

ALT_RESUME_GPU = "L4"  # must be a GPU Jarvislabs offers (`jl gpus`)
WalletLevel = Literal["ok", "warn", "critical"]


def button_data(action: str, run_id: str, extra: str | None = None) -> str:
    return f"{action}:{run_id}" + (f":{extra}" if extra else "")


def parse_button_data(data: str) -> tuple[str, str, str | None]:
    """Inverse of :func:`button_data`. Raises ValueError on malformed input."""
    parts = data.split(":")
    if len(parts) not in (2, 3) or not all(parts):
        raise ValueError(f"malformed button data: {data!r}")
    return parts[0], parts[1], parts[2] if len(parts) == 3 else None


def _who(state: RunState) -> str:
    return f"{state.name} (run {state.run_id}, machine {state.machine_id})"


def looks_done(state: RunState, verdict: Verdict, policy: Policy) -> Notification:
    minutes = max(policy.decision_timeout_s // 60, 1)
    return Notification(
        text=(
            f"💤 {_who(state)} looks done.\n"
            f"Gemma: {verdict.reason}\n"
            f"I'll checkpoint and pause in {minutes} min unless you keep it."
        ),
        buttons=(
            Button(label="⏸ Pause now", data=button_data("pause", state.run_id)),
            Button(label="▶ Keep 30m", data=button_data("keep", state.run_id)),
        ),
    )


def needs_triage(state: RunState, verdict: Verdict) -> Notification:
    symptom = verdict.symptom or "unknown"
    return Notification(
        text=(
            f"🚨 {_who(state)} looks broken: {symptom}.\n"
            f"{verdict.reason}\n"
            f"Not pausing, so the process stays alive for diagnosis.\n"
            f"Kepler: /triage {state.run_id}"
        ),
        buttons=(
            Button(label="✅ Mark resolved", data=button_data("resolved", state.run_id)),
            Button(label="⏸ Pause anyway", data=button_data("pause", state.run_id)),
        ),
    )


def paused(state: RunState) -> Notification:
    return Notification(
        text=(
            f"⏸ {_who(state)} is paused. No GPU compute billing; disk is kept.\n"
            f"Saving about ₹{state.hourly_cost_inr:.2f}/hour."
        ),
        buttons=(
            Button(label="▶ Resume", data=button_data("resume", state.run_id)),
            Button(
                label=f"▶ Resume on {ALT_RESUME_GPU}",
                data=button_data("resume", state.run_id, ALT_RESUME_GPU),
            ),
        ),
    )


def action_failed(state: RunState, action: str, cause: str) -> Notification:
    return Notification(
        text=f"⚠️ Could not {action} {_who(state)}: {cause}\nTap the button again to retry."
    )


def resume_request(machine_id: int, gpu_type: str | None) -> ResumeRequest:
    return ResumeRequest(machine_id=machine_id, gpu_type=gpu_type)


def wallet_level(balance: float, warn: float, critical: float) -> WalletLevel:
    if balance < critical:
        return "critical"
    if balance < warn:
        return "warn"
    return "ok"


def wallet_alert(balance: float, level: WalletLevel) -> Notification:
    if level == "critical":
        text = (
            f"🛑 Jarvislabs wallet critical: {balance:.2f} left. "
            "Checkpointing and pausing every guarded run before data is at risk."
        )
    else:
        text = f"💸 Jarvislabs wallet low: {balance:.2f} left. Top up soon."
    return Notification(text=text)
