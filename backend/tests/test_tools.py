import json

import pytest

from llm.tools import TOOLS, parse_content_fallback, parse_tool_call

pytestmark = pytest.mark.unit


def test_tool_schemas_cover_all_actions() -> None:
    names = {t["function"]["name"] for t in TOOLS}
    assert names == {"pause_run", "keep_running", "escalate_to_kepler"}


def test_parse_pause_call() -> None:
    verdict = parse_tool_call("pause_run", json.dumps({"reason": "converged"}))
    assert verdict is not None
    assert verdict.action == "pause_run"
    assert verdict.reason == "converged"
    assert verdict.source == "gemma"


def test_parse_keep_call_with_recheck() -> None:
    verdict = parse_tool_call(
        "keep_running", '{"reason": "still improving", "recheck_minutes": 15}'
    )
    assert verdict is not None
    assert verdict.recheck_minutes == 15


def test_parse_escalate_call() -> None:
    args = '{"reason": "CUDA OOM at step 400", "symptom": "oom"}'
    verdict = parse_tool_call("escalate_to_kepler", args)
    assert verdict is not None
    assert verdict.symptom == "oom"


@pytest.mark.parametrize(
    ("name", "args"),
    [
        ("delete_everything", '{"reason": "x"}'),
        ("pause_run", "not json"),
        ("pause_run", "{}"),
        ("keep_running", '{"reason": "x", "recheck_minutes": -3}'),
        ("pause_run", '["reason"]'),
    ],
)
def test_parse_rejects_invalid_calls(name: str, args: str) -> None:
    assert parse_tool_call(name, args) is None


def test_content_fallback_parses_json_block() -> None:
    content = 'Sure.\n```json\n{"tool": "pause_run", "arguments": {"reason": "done"}}\n```'
    verdict = parse_content_fallback(content)
    assert verdict is not None
    assert verdict.action == "pause_run"


def test_content_fallback_returns_none_for_prose() -> None:
    assert parse_content_fallback("I think it is fine") is None
