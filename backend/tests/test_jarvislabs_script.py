import subprocess  # noqa: S404 - runs a local sh to validate the generated script

import pytest

from providers.jarvislabs import _remote_path, build_probe_script

pytestmark = pytest.mark.unit


def test_remote_path_expands_home() -> None:
    assert _remote_path("~/train.log") == '"$HOME/train.log"'


def test_remote_path_quotes_absolute() -> None:
    assert _remote_path("/data/my log.txt") == "'/data/my log.txt'"


def test_probe_script_produces_four_sections(tmp_path) -> None:  # noqa: ANN001
    log = tmp_path / "train.log"
    log.write_text("step=1 loss=1.0\n")
    pid = tmp_path / "train.pid"
    pid.write_text("1\n")
    script = build_probe_script(str(log), str(pid))
    out = subprocess.run(["sh", "-c", script], capture_output=True, text=True, check=True)  # noqa: S603,S607
    sections = out.stdout.split("---\n")
    assert len(sections) == 4
    assert "loss=1.0" in sections[3]


@pytest.mark.parametrize("path", ["~/$(reboot)", "~/a`id`", '~/x"y', "~/a b"])
def test_remote_path_rejects_shell_metacharacters(path: str) -> None:
    with pytest.raises(ValueError, match="unsafe"):
        _remote_path(path)
