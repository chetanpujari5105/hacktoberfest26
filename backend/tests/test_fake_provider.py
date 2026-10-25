import pytest

from config import Settings
from guard.models import Policy
from guard.rules import assess
from providers.fake import FakeProvider, parse_scenarios

pytestmark = pytest.mark.unit
POLICY = Policy()


def test_parse_scenarios() -> None:
    assert parse_scenarios("101=converge, 102=oom,bad,103=stall") == {
        101: "converge",
        102: "oom",
        103: "stall",
    }


async def _probe_n(provider: FakeProvider, machine_id: int, n: int):  # noqa: ANN202
    probe = None
    for _ in range(n):
        probe = await provider.probe(machine_id)
    return probe


async def test_converge_scenario_eventually_plateaus() -> None:
    provider = FakeProvider({1: "converge"})
    first = await provider.probe(1)
    assert assess(first, POLICY).suspicious is False
    late = await _probe_n(provider, 1, 15)
    assert "loss_plateau" in assess(late, POLICY).signals


async def test_oom_scenario_crashes() -> None:
    provider = FakeProvider({2: "oom"})
    late = await _probe_n(provider, 2, 6)
    assert late.error_hint == "oom"
    assert late.process_alive is False


async def test_stall_scenario_goes_quiet() -> None:
    provider = FakeProvider({3: "stall"})
    late = await _probe_n(provider, 3, 6)
    assert "stalled" in assess(late, POLICY).signals


async def test_checkpoint_pause_resume_cycle() -> None:
    provider = FakeProvider({1: "converge"})
    assert await provider.checkpoint_ready(1) is False
    await provider.request_checkpoint(1)
    assert await provider.checkpoint_ready(1) is True
    await provider.pause(1)
    new_id = await provider.resume(1, "A5000")
    assert new_id != 1
    resumed = await provider.probe(new_id)
    assert resumed.process_alive is True
    assert resumed.error_hint is None


async def test_resumed_ids_default_to_healthy_after_restart() -> None:
    fresh_worker = FakeProvider({})
    late = await _probe_n(fresh_worker, 1101, 16)
    assert assess(late, POLICY).suspicious is False


async def test_balance_stays_above_wallet_thresholds() -> None:
    # Otherwise the wallet guard pauses every scripted run in the fake demo.
    assert await FakeProvider({}).balance() > Settings.model_fields["wallet_warn_inr"].default
