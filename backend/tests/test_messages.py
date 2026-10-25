import pytest

from guard.messages import (
    button_data,
    looks_done,
    needs_triage,
    parse_button_data,
    paused,
    wallet_alert,
    wallet_level,
)
from guard.models import Policy, RunState, Verdict
from tests.factories import NOW

pytestmark = pytest.mark.unit
STATE = RunState(run_id="run-7", machine_id=7, name="llama", started_at=NOW, hourly_cost_inr=1.2)


def test_button_round_trip() -> None:
    assert parse_button_data(button_data("resume", "run-7", "A5000")) == (
        "resume",
        "run-7",
        "A5000",
    )
    assert parse_button_data(button_data("pause", "run-7")) == ("pause", "run-7", None)


@pytest.mark.parametrize("bad", ["", "pause", "pause::", "a:b:c:d"])
def test_parse_button_rejects_malformed(bad: str) -> None:
    with pytest.raises(ValueError, match="malformed"):
        parse_button_data(bad)


def test_button_data_fits_telegram_limit() -> None:
    longest = button_data("resolved", "run-" + "9" * 12, "RTX6000Ada")
    assert len(longest.encode()) <= 64


def test_messages_carry_actions() -> None:
    verdict = Verdict(action="pause_run", reason="flat", source="gemma")
    done = looks_done(STATE, verdict, Policy())
    assert {b.data for b in done.buttons} == {"pause:run-7", "keep:run-7"}
    triage = needs_triage(STATE, verdict.model_copy(update={"symptom": "oom"}))
    assert "/triage run-7" in triage.text
    assert "₹1.20/hour" in paused(STATE).text


@pytest.mark.parametrize(("balance", "level"), [(50.0, "ok"), (8.0, "warn"), (2.0, "critical")])
def test_wallet_level(balance: float, level: str) -> None:
    assert wallet_level(balance, warn=10, critical=3) == level


def test_wallet_alert_text() -> None:
    assert "critical" in wallet_alert(2.0, "critical").text
    assert "low" in wallet_alert(8.0, "warn").text


def test_action_failed_message() -> None:
    from guard.messages import action_failed

    note = action_failed(STATE, "resume", "GPU unavailable")
    assert "resume" in note.text
    assert "GPU unavailable" in note.text
