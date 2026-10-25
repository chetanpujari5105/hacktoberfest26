"""Gemma 4 function-calling tools and parsing of the model's decision."""

from __future__ import annotations

import json
import re
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from guard.models import Verdict, VerdictAction


class PauseArgs(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class KeepArgs(BaseModel):
    reason: str = Field(min_length=1, max_length=500)
    recheck_minutes: int = Field(default=10, ge=1, le=240)


class EscalateArgs(BaseModel):
    reason: str = Field(min_length=1, max_length=500)
    symptom: str = Field(default="unknown", min_length=1, max_length=40)


ARG_MODELS: dict[VerdictAction, type[BaseModel]] = {
    "pause_run": PauseArgs,
    "keep_running": KeepArgs,
    "escalate_to_kepler": EscalateArgs,
}

DESCRIPTIONS: dict[VerdictAction, str] = {
    "pause_run": "Training has converged or finished cleanly. Checkpoint and pause the GPU.",
    "keep_running": "Training is still making real progress. Leave it running.",
    "escalate_to_kepler": (
        "Something is broken (stalled process, NaN loss, out-of-memory, crash). "
        "Do NOT pause; hand off to the Kepler SRE agent to diagnose."
    ),
}


def _schema(action: VerdictAction) -> dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": action,
            "description": DESCRIPTIONS[action],
            "parameters": ARG_MODELS[action].model_json_schema(),
        },
    }


TOOLS: list[dict[str, Any]] = [_schema(a) for a in ARG_MODELS]


def parse_tool_call(name: str, arguments: str) -> Verdict | None:
    """Validate a tool call; return None if the name or arguments are invalid."""
    model = ARG_MODELS.get(name)  # type: ignore[call-overload]
    if model is None:
        return None
    try:
        raw = json.loads(arguments or "{}")
        if not isinstance(raw, dict):
            return None
        args = model.model_validate(raw)
    except (json.JSONDecodeError, ValidationError):
        return None
    data = args.model_dump()
    return Verdict(
        action=name,  # type: ignore[arg-type]
        reason=data["reason"],
        symptom=data.get("symptom"),
        recheck_minutes=data.get("recheck_minutes"),
        source="gemma",
    )


JSON_BLOCK = re.compile(r"\{.*\}", re.S)


def parse_content_fallback(content: str) -> Verdict | None:
    """Some servers lack tool-call parsing; accept ``{"tool": ..., "arguments": {...}}`` text."""
    match = JSON_BLOCK.search(content or "")
    if not match:
        return None
    try:
        payload = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, dict):
        return None
    return parse_tool_call(str(payload.get("tool", "")), json.dumps(payload.get("arguments", {})))
