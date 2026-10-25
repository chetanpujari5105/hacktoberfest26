"""Deterministic rules: decide *whether* a run looks idle, and a fallback verdict.

Pure functions only, so they are safe to call from inside a Temporal workflow.
Gemma decides *what kind* of idle it is; these rules gate when Gemma is asked
and take over when Gemma is unavailable.
"""

from __future__ import annotations

from guard.models import Policy, Probe, Suspicion, Verdict

EPSILON = 1e-8


def is_plateau(losses: tuple[float, ...], window: int, tolerance: float) -> bool:
    """True when relative improvement across the last ``window`` losses is below tolerance."""
    if len(losses) < window:
        return False
    recent = losses[-window:]
    improvement = (recent[0] - recent[-1]) / max(abs(recent[0]), EPSILON)
    return improvement < tolerance


def assess(probe: Probe, policy: Policy) -> Suspicion:
    signals: list[str] = []
    if probe.error_hint:
        signals.append(f"error:{probe.error_hint}")
    if not probe.process_alive:
        signals.append("process_exited")
    gpu_idle = probe.gpu_util_pct < policy.idle_gpu_pct
    if probe.process_alive and gpu_idle and probe.seconds_since_log > policy.stale_log_s:
        signals.append("stalled")
    if is_plateau(probe.losses, policy.loss_window, policy.plateau_tolerance):
        signals.append("loss_plateau")
    return Suspicion(suspicious=bool(signals), signals=tuple(signals))


def fallback_verdict(probe: Probe, suspicion: Suspicion) -> Verdict:
    """Rules-only verdict used when Gemma is unavailable or returns garbage."""
    signals = set(suspicion.signals)
    if probe.error_hint:
        return Verdict(
            action="escalate_to_kepler",
            reason=f"Training log shows an error ({probe.error_hint}).",
            symptom=probe.error_hint,
            source="rules",
        )
    if "stalled" in signals:
        minutes = int(probe.seconds_since_log // 60)
        return Verdict(
            action="escalate_to_kepler",
            reason=f"Process alive but GPU idle and no log output for {minutes} min.",
            symptom="stalled",
            source="rules",
        )
    if "process_exited" in signals:
        return Verdict(
            action="pause_run",
            reason="Training process exited cleanly; GPU is idle.",
            source="rules",
        )
    if "loss_plateau" in signals:
        return Verdict(
            action="pause_run",
            reason="Loss has plateaued over the recent window.",
            source="rules",
        )
    return Verdict(action="keep_running", reason="Training looks healthy.", source="rules")
