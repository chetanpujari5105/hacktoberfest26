"""Shared helpers for the LeaseGuard hooks (python3 stdlib only)."""

from __future__ import annotations

import json
import re
import shlex
import sys
from typing import Any, Optional

JL_CREATE = re.compile(r"(^|[\s;&|(])jl\s+create(\s|$)")


def read_hook_input() -> dict[str, Any]:
    """Parse the hook JSON from stdin; an unreadable payload yields {}."""
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def bash_command(payload: dict[str, Any]) -> str:
    if payload.get("tool_name") != "Bash":
        return ""
    tool_input = payload.get("tool_input")
    command = tool_input.get("command") if isinstance(tool_input, dict) else None
    return command if isinstance(command, str) else ""


def is_jl_create(command: str) -> bool:
    return bool(JL_CREATE.search(command))


def instance_name(command: str) -> Optional[str]:
    """Value of --name / -n in a `jl create` command, if present."""
    try:
        tokens = shlex.split(command)
    except ValueError:
        return None
    for i, token in enumerate(tokens):
        if token in ("--name", "-n") and i + 1 < len(tokens):
            return tokens[i + 1]
        if token.startswith("--name="):
            return token.split("=", 1)[1]
    return None


def emit(output: dict[str, Any]) -> None:
    json.dump(output, sys.stdout)
    sys.stdout.write("\n")
