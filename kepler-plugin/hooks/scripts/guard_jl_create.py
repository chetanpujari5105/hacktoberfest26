#!/usr/bin/env python3
"""PreToolUse hook: ask before `jl create`, because a new GPU starts unguarded.

Fails open: any error or unrelated command exits 0 with no output.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from jl_command import bash_command, emit, is_jl_create, read_hook_input  # noqa: E402

REASON_AUTO = (
    "This GPU will not be guarded by LeaseGuard until registered — LeaseGuard "
    "will auto-register it after creation because LEASEGUARD_URL is set. "
    "Tip: add --json so the machine id can be read."
)
REASON_MANUAL = (
    "This GPU will not be guarded by LeaseGuard until registered — LeaseGuard "
    "will auto-register it after creation if LEASEGUARD_URL is set (it is not set now, "
    "so register it from the LeaseGuard dashboard)."
)


def main() -> int:
    command = bash_command(read_hook_input())
    if not is_jl_create(command):
        return 0
    auto = bool(os.environ.get("LEASEGUARD_URL") and os.environ.get("LEASEGUARD_API_KEY"))
    emit(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "ask",
                "permissionDecisionReason": REASON_AUTO if auto else REASON_MANUAL,
            }
        }
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:  # fail open: never block the user's command on a hook bug
        sys.exit(0)
