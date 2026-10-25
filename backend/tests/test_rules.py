import pytest

from guard.models import Policy
from guard.rules import assess, fallback_verdict, is_plateau
from tests.factories import make_probe

pytestmark = pytest.mark.unit
POLICY = Policy()


def test_healthy_training_is_not_suspicious() -> None:
    result = assess(make_probe(), POLICY)
    assert result.suspicious is False
    assert result.signals == ()


def test_dead_process_is_suspicious() -> None:
    result = assess(make_probe(process_alive=False, gpu_util_pct=0), POLICY)
    assert result.suspicious
    assert "process_exited" in result.signals


def test_error_hint_is_suspicious() -> None:
    result = assess(make_probe(error_hint="oom"), POLICY)
    assert "error:oom" in result.signals


def test_idle_gpu_with_fresh_logs_is_not_enough() -> None:
    result = assess(make_probe(gpu_util_pct=1.0, seconds_since_log=10), POLICY)
    assert result.suspicious is False


def test_idle_gpu_with_stale_logs_is_a_stall() -> None:
    result = assess(make_probe(gpu_util_pct=1.0, seconds_since_log=900), POLICY)
    assert "stalled" in result.signals


def test_flat_loss_is_a_plateau() -> None:
    flat = (0.5012, 0.5009, 0.5011, 0.5008, 0.5010, 0.5009, 0.5008, 0.5007)
    result = assess(make_probe(losses=flat), POLICY)
    assert "loss_plateau" in result.signals


@pytest.mark.parametrize(
    ("losses", "expected"),
    [
        ((), False),
        ((1.0, 0.9), False),
        ((2.0, 1.5, 1.2, 1.0, 0.8, 0.7, 0.6, 0.5), False),
        ((0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5), True),
        ((0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), True),
    ],
)
def test_is_plateau(losses: tuple[float, ...], expected: bool) -> None:
    assert is_plateau(losses, window=8, tolerance=0.01) is expected


def test_fallback_escalates_errors() -> None:
    probe = make_probe(error_hint="oom", process_alive=False)
    verdict = fallback_verdict(probe, assess(probe, POLICY))
    assert verdict.action == "escalate_to_kepler"
    assert verdict.symptom == "oom"
    assert verdict.source == "rules"


def test_fallback_escalates_stalls() -> None:
    probe = make_probe(gpu_util_pct=0, seconds_since_log=900)
    verdict = fallback_verdict(probe, assess(probe, POLICY))
    assert verdict.action == "escalate_to_kepler"
    assert verdict.symptom == "stalled"


def test_fallback_pauses_clean_exit() -> None:
    probe = make_probe(process_alive=False, gpu_util_pct=0)
    verdict = fallback_verdict(probe, assess(probe, POLICY))
    assert verdict.action == "pause_run"


def test_fallback_pauses_plateau() -> None:
    probe = make_probe(losses=(0.5,) * 8)
    verdict = fallback_verdict(probe, assess(probe, POLICY))
    assert verdict.action == "pause_run"


def test_fallback_keeps_healthy_runs() -> None:
    probe = make_probe()
    verdict = fallback_verdict(probe, assess(probe, POLICY))
    assert verdict.action == "keep_running"
