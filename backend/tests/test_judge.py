from types import SimpleNamespace
from typing import Any

import pytest

from guard.chart import render_loss_chart
from guard.models import JudgeRequest, Suspicion
from llm.judge import GemmaJudge
from tests.factories import make_probe

pytestmark = pytest.mark.unit
REQUEST = JudgeRequest(
    run_name="demo",
    probe=make_probe(losses=(0.5,) * 8),
    suspicion=Suspicion(suspicious=True, signals=("loss_plateau",)),
)


def _message(tool: tuple[str, str] | None = None, content: str | None = None) -> Any:
    calls = None
    if tool:
        calls = [SimpleNamespace(function=SimpleNamespace(name=tool[0], arguments=tool[1]))]
    msg = SimpleNamespace(tool_calls=calls, content=content)
    return SimpleNamespace(choices=[SimpleNamespace(message=msg)])


class StubCompletions:
    def __init__(self, responses: list[Any]) -> None:
        self.responses = responses
        self.calls: list[dict[str, Any]] = []

    async def create(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


def _client(*responses: Any) -> tuple[Any, StubCompletions]:
    completions = StubCompletions(list(responses))
    return SimpleNamespace(chat=SimpleNamespace(completions=completions)), completions


def test_render_loss_chart_returns_png() -> None:
    png = render_loss_chart((2.0, 1.0, 0.5, 0.5))
    assert png is not None
    assert png[:8] == b"\x89PNG\r\n\x1a\n"


def test_render_loss_chart_skips_empty() -> None:
    assert render_loss_chart(()) is None


async def test_judge_parses_tool_call_and_sends_image() -> None:
    client, completions = _client(_message(tool=("pause_run", '{"reason": "plateau at 0.5"}')))
    verdict = await GemmaJudge(client, "gemma").judge(REQUEST)
    assert verdict is not None
    assert verdict.action == "pause_run"
    content = completions.calls[0]["messages"][1]["content"]
    assert any(part["type"] == "image_url" for part in content)
    assert completions.calls[0]["tools"]


async def test_judge_falls_back_to_json_content() -> None:
    content = '{"tool": "escalate_to_kepler", "arguments": {"reason": "oom", "symptom": "oom"}}'
    client, _ = _client(_message(content=content))
    verdict = await GemmaJudge(client, "gemma").judge(REQUEST)
    assert verdict is not None
    assert verdict.action == "escalate_to_kepler"


async def test_judge_retries_without_image_on_error() -> None:
    from openai import BadRequestError

    error = BadRequestError(
        "image not supported",
        response=SimpleNamespace(request=None, status_code=400, headers={}),
        body=None,
    )
    client, completions = _client(error, _message(tool=("keep_running", '{"reason": "ok"}')))
    verdict = await GemmaJudge(client, "gemma").judge(REQUEST)
    assert verdict is not None
    assert verdict.action == "keep_running"
    retry_content = completions.calls[1]["messages"][1]["content"]
    assert all(part["type"] == "text" for part in retry_content)


async def test_judge_returns_none_on_garbage() -> None:
    client, _ = _client(_message(content="no idea"))
    assert await GemmaJudge(client, "gemma").judge(REQUEST) is None


async def test_judge_returns_none_on_connection_error() -> None:
    client, _ = _client(RuntimeError("connection refused"))
    assert await GemmaJudge(client, "gemma").judge(REQUEST) is None


async def test_disabled_judge_returns_none() -> None:
    assert await GemmaJudge(None, "gemma").judge(REQUEST) is None
