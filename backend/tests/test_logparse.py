import pytest

from guard.logparse import detect_error, extract_losses, parse_probe_output
from tests.factories import NOW

pytestmark = pytest.mark.unit

LOG = """\
step=1 loss=2.31
step=2 loss=1.92 lr=0.001
epoch 1 | train_loss: 1.50
step=4 loss=nan
"""


def test_extract_losses_reads_common_formats() -> None:
    losses = extract_losses(LOG)
    assert losses[:3] == (2.31, 1.92, 1.50)


def test_extract_losses_skips_nan_values() -> None:
    assert len(extract_losses(LOG)) == 3


def test_extract_losses_limits_to_last_n() -> None:
    log = "\n".join(f"loss={i}" for i in range(100))
    assert extract_losses(log, limit=5) == (95.0, 96.0, 97.0, 98.0, 99.0)


@pytest.mark.parametrize(
    ("log", "expected"),
    [
        ("torch.OutOfMemoryError: CUDA out of memory. Tried to allocate", "oom"),
        ("step=4 loss=nan", "nan_loss"),
        ("Traceback (most recent call last):\n  File x", "crash"),
        ("step=1 loss=0.5", None),
    ],
)
def test_detect_error(log: str, expected: str | None) -> None:
    assert detect_error(log) == expected


def test_parse_probe_output() -> None:
    stdout = "87, 10240\n---\nalive\n---\n42\n---\nstep=1 loss=1.5\nstep=2 loss=1.2\n"
    probe = parse_probe_output(stdout, NOW)
    assert probe.gpu_util_pct == 87.0
    assert probe.gpu_mem_mb == 10240.0
    assert probe.process_alive is True
    assert probe.seconds_since_log == 42.0
    assert probe.losses == (1.5, 1.2)
    assert probe.error_hint is None


def test_parse_probe_output_handles_missing_gpu_and_log() -> None:
    stdout = "\n---\ndead\n---\n-1\n---\n"
    probe = parse_probe_output(stdout, NOW)
    assert probe.gpu_util_pct == 0.0
    assert probe.process_alive is False
    assert probe.seconds_since_log == 0.0
    assert probe.losses == ()


def test_parse_probe_output_rejects_garbage() -> None:
    with pytest.raises(ValueError, match="sections"):
        parse_probe_output("nonsense", NOW)


def test_parse_probe_output_tolerates_separator_lines_in_log() -> None:
    stdout = "50, 100\n---\nalive\n---\n3\n---\nepoch 1\n---\nstep=1 loss=0.5\n"
    probe = parse_probe_output(stdout, NOW)
    assert probe.losses == (0.5,)
    assert "---" in probe.log_tail


def test_parse_probe_output_tolerates_na_gpu_values() -> None:
    probe = parse_probe_output("[N/A], [N/A]\n---\nalive\n---\n3\n---\n", NOW)
    assert probe.gpu_util_pct == 0.0
    assert probe.gpu_mem_mb == 0.0
