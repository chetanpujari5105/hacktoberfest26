from datetime import UTC, datetime

from guard.models import Probe

NOW = datetime(2026, 10, 25, 12, 0, tzinfo=UTC)


def make_probe(**overrides: object) -> Probe:
    base: dict[str, object] = {
        "at": NOW,
        "gpu_util_pct": 92.0,
        "gpu_mem_mb": 8000.0,
        "process_alive": True,
        "losses": (2.0, 1.6, 1.3, 1.1, 0.9, 0.8, 0.7, 0.6),
        "log_tail": "step=8 loss=0.6",
        "seconds_since_log": 5.0,
        "error_hint": None,
    }
    return Probe(**{**base, **overrides})
