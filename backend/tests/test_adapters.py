"""Telegram notifier and Jarvislabs provider against faked transports."""

import json
from types import SimpleNamespace
from typing import Any

import httpx
import pytest

from config import Settings
from guard.models import Button, Notification
from guard.notify import LogNotifier, TelegramNotifier, build_notifier
from providers.factory import build_provider
from providers.fake import FakeProvider
from providers.jarvislabs import JarvislabsProvider, RemoteCommandError

pytestmark = pytest.mark.unit


# ── Telegram ─────────────────────────────────────────────────────────────


async def test_telegram_sends_inline_keyboard() -> None:
    seen: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(json.loads(request.content))
        return httpx.Response(200, json={"ok": True})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    notifier = TelegramNotifier("TOKEN", "-100", client)
    await notifier.send(Notification(text="hi", buttons=(Button(label="Go", data="pause:run-1"),)))
    assert seen[0]["chat_id"] == "-100"
    assert seen[0]["reply_markup"]["inline_keyboard"][0][0]["callback_data"] == "pause:run-1"


async def test_telegram_error_raises_without_leaking_token() -> None:
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(403)))
    notifier = TelegramNotifier("SECRET-TOKEN", "-100", client)
    with pytest.raises(RuntimeError) as info:
        await notifier.send(Notification(text="hi"))
    assert "SECRET-TOKEN" not in str(info.value)


async def test_build_notifier_falls_back_to_log() -> None:
    notifier = build_notifier("", "")
    assert isinstance(notifier, LogNotifier)
    await notifier.send(Notification(text="logged"))


# ── Jarvislabs provider ──────────────────────────────────────────────────


class FakeProcess:
    def __init__(self, payload: dict[str, Any] | str) -> None:
        self._out = payload if isinstance(payload, str) else json.dumps(payload)

    async def communicate(self) -> tuple[bytes, bytes]:
        return self._out.encode(), b""

    def kill(self) -> None:
        pass


def _provider(monkeypatch: pytest.MonkeyPatch, outputs: list[Any]) -> tuple[Any, list[tuple]]:
    calls: list[tuple] = []

    async def fake_exec(*args: Any, **_: Any) -> FakeProcess:
        calls.append(args)
        return FakeProcess(outputs.pop(0))

    monkeypatch.setattr("asyncio.create_subprocess_exec", fake_exec)
    instances = SimpleNamespace(
        pause=lambda mid: calls.append(("pause", mid)),
        resume=lambda mid, gpu_type=None: SimpleNamespace(machine_id=mid + 1),
    )
    account = SimpleNamespace(balance=lambda: SimpleNamespace(balance=30.0, grants=5.0))
    fake_client = SimpleNamespace(instances=instances, account=account)
    monkeypatch.setattr("jarvislabs.Client", lambda api_key: fake_client)
    provider = JarvislabsProvider(
        "key", train_log="~/train.log", train_pid="~/train.pid",
        ckpt_flag="~/ckpt.flag", ckpt_done="~/ckpt.done",
    )  # fmt: skip
    return provider, calls


async def test_probe_parses_remote_output(monkeypatch: pytest.MonkeyPatch) -> None:
    stdout = "55, 4096\n---\nalive\n---\n12\n---\nstep=1 loss=0.9\n"
    provider, calls = _provider(monkeypatch, [{"exit_code": 0, "stdout": stdout}])
    probe = await provider.probe(321)
    assert probe.gpu_util_pct == 55.0
    assert probe.losses == (0.9,)
    assert calls[0][:5] == ("jl", "exec", "321", "--json", "--")


async def test_checkpoint_commands(monkeypatch: pytest.MonkeyPatch) -> None:
    outputs = [{"exit_code": 0, "stdout": ""}, {"exit_code": 0, "stdout": "yes\n"}]
    provider, calls = _provider(monkeypatch, outputs)
    await provider.request_checkpoint(1)
    assert await provider.checkpoint_ready(1) is True
    assert "touch" in calls[0][-1]


@pytest.mark.parametrize(
    "output",
    [{"error": "Instance not running"}, {"exit_code": 255, "stderr": "ssh failed"}, "not json"],
)
async def test_exec_failures_raise_for_retry(monkeypatch: pytest.MonkeyPatch, output: Any) -> None:
    provider, _ = _provider(monkeypatch, [output])
    with pytest.raises(RemoteCommandError):
        await provider.probe(1)


async def test_lifecycle_calls_use_sdk(monkeypatch: pytest.MonkeyPatch) -> None:
    provider, calls = _provider(monkeypatch, [])
    await provider.pause(10)
    assert ("pause", 10) in calls
    assert await provider.resume(10, "A5000") == 11
    assert await provider.balance() == 35.0


def test_factory_selects_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = build_provider(Settings(provider="fake", llm="off", _env_file=None))
    assert isinstance(fake, FakeProvider)
    _provider(monkeypatch, [])
    real = build_provider(
        Settings(provider="jarvislabs", jl_api_key="k", llm="off", _env_file=None)
    )
    assert isinstance(real, JarvislabsProvider)


def test_settings_require_credentials() -> None:
    with pytest.raises(ValueError, match="JL_API_KEY"):
        Settings(provider="jarvislabs", jl_api_key="", llm="off", _env_file=None)
    with pytest.raises(ValueError, match="LLM_API_KEY"):
        Settings(provider="fake", llm="remote", jl_api_key="", _env_file=None)


def test_llm_endpoint_selection() -> None:
    local = Settings(provider="fake", llm="local", _env_file=None)
    assert local.llm_endpoint[0] == "http://localhost:11434/v1"
    remote = Settings(provider="fake", llm="remote", jl_api_key="jl", _env_file=None)
    assert remote.llm_endpoint == ("https://models.jarvislabs.net/v1", "jl", "gemma-4-31b-it")


async def test_wait_checkpoint_heartbeats_during_slow_exec(monkeypatch: pytest.MonkeyPatch) -> None:
    import asyncio

    from guard import activities as acts_module
    from guard.activities import GuardActivities
    from guard.models import CheckpointRequest

    beats: list[int] = []
    monkeypatch.setattr(acts_module.activity, "heartbeat", lambda *a: beats.append(1))
    monkeypatch.setattr(acts_module, "HEARTBEAT_EVERY_S", 0.01)

    class SlowProvider(FakeProvider):
        async def checkpoint_ready(self, machine_id: int) -> bool:
            await asyncio.sleep(0.1)  # slower than the heartbeat interval
            return True

    acts = GuardActivities(SlowProvider({}), lambda _: None, LogNotifier())  # type: ignore[arg-type]
    assert await acts.wait_checkpoint(CheckpointRequest(machine_id=1, timeout_s=10)) is True
    assert len(beats) >= 3
