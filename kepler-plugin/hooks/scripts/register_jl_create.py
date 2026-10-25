#!/usr/bin/env python3
"""PostToolUse hook: after `jl create`, register the new GPU with LeaseGuard.

Reads the machine id from the command output (`jl create --json` prints JSON
with `machine_id`), then POSTs it to `${LEASEGUARD_URL}/api/v1/runs`.
Fails open: missing env vars, unparseable output or network errors exit 0.
Never prints the API key.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from typing import Any, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from jl_command import (  # noqa: E402
    bash_command,
    emit,
    instance_name,
    is_jl_create,
    read_hook_input,
)

MACHINE_ID_TEXT = re.compile(r"machine[ _-]?id\W{0,5}(\d+)", re.IGNORECASE)
TIMEOUT_SECONDS = 8


def find_machine_id(value: Any) -> Optional[int]:
    """Search parsed JSON (dicts/lists) for a positive integer machine_id."""
    if isinstance(value, dict):
        candidate = value.get("machine_id")
        if isinstance(candidate, int) and candidate > 0:
            return candidate
        if isinstance(candidate, str) and candidate.isdigit():
            return int(candidate)
        values = value.values()
    elif isinstance(value, list):
        values = value
    else:
        return None
    for item in values:
        found = find_machine_id(item)
        if found:
            return found
    return None


def machine_id_from_output(stdout: str) -> Optional[int]:
    try:
        found = find_machine_id(json.loads(stdout))
        if found:
            return found
    except (json.JSONDecodeError, ValueError):
        pass
    match = MACHINE_ID_TEXT.search(stdout)
    return int(match.group(1)) if match else None


def tool_stdout(payload: dict[str, Any]) -> str:
    response = payload.get("tool_response")
    if isinstance(response, dict):
        stdout = response.get("stdout")
        return stdout if isinstance(stdout, str) else ""
    return response if isinstance(response, str) else ""


def register(base_url: str, api_key: str, machine_id: int, name: str) -> str:
    body = json.dumps({"machine_id": machine_id, "name": name}).encode()
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/v1/runs",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "X-API-Key": api_key},
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as res:
            result = json.load(res)
        run_id = (result.get("data") or {}).get("run_id", "unknown")
        return f"LeaseGuard is now guarding machine {machine_id} as {run_id}."
    except urllib.error.HTTPError as error:
        if error.code == 409:
            return f"Machine {machine_id} was already guarded by LeaseGuard."
        return f"LeaseGuard registration for machine {machine_id} failed (HTTP {error.code}); register it from the dashboard."
    except (urllib.error.URLError, TimeoutError, ValueError):
        return f"LeaseGuard was unreachable; register machine {machine_id} from the dashboard."


def main() -> int:
    payload = read_hook_input()
    command = bash_command(payload)
    if not is_jl_create(command):
        return 0
    base_url = os.environ.get("LEASEGUARD_URL", "")
    api_key = os.environ.get("LEASEGUARD_API_KEY", "")
    if not base_url or not api_key:
        return 0

    machine_id = machine_id_from_output(tool_stdout(payload))
    if machine_id is None:
        message = "LeaseGuard could not read a machine id from `jl create` output (use --json); register it from the dashboard."
    else:
        message = register(base_url, api_key, machine_id, instance_name(command) or f"jl-{machine_id}")

    emit({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": message}})
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:  # fail open
        sys.exit(0)
