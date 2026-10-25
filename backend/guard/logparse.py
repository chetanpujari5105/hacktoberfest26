"""Parse the output of the remote probe script into a ``Probe``."""

from __future__ import annotations

import math
import re
from datetime import datetime

from guard.models import Probe

LOSS_PATTERN = re.compile(r"loss\s*[=:]\s*([-+]?(?:\d+\.?\d*(?:[eE][-+]?\d+)?|nan|inf))", re.I)
SECTION_SPLIT = re.compile(r"^---$", re.M)
ERROR_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("oom", re.compile(r"out of memory|OutOfMemoryError", re.I)),
    ("nan_loss", re.compile(r"loss\s*[=:]\s*nan", re.I)),
    ("crash", re.compile(r"Traceback \(most recent call last\)")),
)
DEFAULT_LOSS_LIMIT = 60


def extract_losses(log: str, limit: int = DEFAULT_LOSS_LIMIT) -> tuple[float, ...]:
    values = (float(m) for m in LOSS_PATTERN.findall(log))
    finite = tuple(v for v in values if math.isfinite(v))
    return finite[-limit:]


def detect_error(log: str) -> str | None:
    for name, pattern in ERROR_PATTERNS:
        if pattern.search(log):
            return name
    return None


def _number(text: str) -> float:
    """nvidia-smi prints ``[N/A]`` on some GPUs/drivers; treat anything non-numeric as 0."""
    try:
        return float(text.strip())
    except ValueError:
        return 0.0


def _parse_gpu(line: str) -> tuple[float, float]:
    parts = line.strip().split(",")
    if len(parts) < 2:
        return 0.0, 0.0
    return _number(parts[0]), _number(parts[1])


def parse_probe_output(stdout: str, at: datetime) -> Probe:
    """Sections: ``gpu_util, mem_mb`` / ``alive|dead`` / seconds since log write / log tail."""
    # maxsplit: the log tail itself may contain "---" lines
    sections = SECTION_SPLIT.split(stdout, maxsplit=3)
    if len(sections) != 4:
        raise ValueError(f"expected 4 probe sections, got {len(sections)}")
    gpu_line, alive, age, log_tail = sections
    util, mem = _parse_gpu(gpu_line)
    age_s = _number(age) if age.strip() else -1.0
    log = log_tail.strip("\n")
    return Probe(
        at=at,
        gpu_util_pct=util,
        gpu_mem_mb=mem,
        process_alive=alive.strip() == "alive",
        losses=extract_losses(log),
        log_tail=log[-4000:],
        seconds_since_log=max(age_s, 0.0),
        error_hint=detect_error(log),
    )
