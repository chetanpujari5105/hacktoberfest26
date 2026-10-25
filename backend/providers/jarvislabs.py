"""Real provider: Jarvislabs SDK for lifecycle calls, ``jl exec`` for remote probes."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import shlex
from datetime import UTC, datetime

from guard.logparse import parse_probe_output
from guard.models import InstanceInfo, Probe

logger = logging.getLogger(__name__)
EXEC_TIMEOUT_S = 60
LOG_TAIL_LINES = 200


class RemoteCommandError(RuntimeError):
    """``jl exec`` failed; Temporal retries the activity."""


SAFE_HOME_RELATIVE = re.compile(r"^[A-Za-z0-9._/-]+$")


def _remote_path(path: str) -> str:
    """Quote a path for sh, keeping ``~/`` expandable as ``$HOME/``.

    Home-relative paths go inside double quotes (so ``$HOME`` expands), where
    ``$``, backticks and backslashes would stay live, so only plain characters
    are allowed. Absolute paths are fully single-quoted by shlex.
    """
    if path.startswith("~/"):
        rest = path[2:]
        if not SAFE_HOME_RELATIVE.fullmatch(rest):
            raise ValueError(f"unsafe characters in remote path: {path!r}")
        return f'"$HOME/{rest}"'
    return shlex.quote(path)


def build_probe_script(log: str, pid: str) -> str:
    log_q, pid_q = _remote_path(log), _remote_path(pid)
    return "; ".join(
        [
            "nvidia-smi --query-gpu=utilization.gpu,memory.used "
            "--format=csv,noheader,nounits 2>/dev/null | head -n1",
            "echo ---",
            f'if [ -f {pid_q} ] && kill -0 "$(cat {pid_q})" 2>/dev/null; '
            "then echo alive; else echo dead; fi",
            "echo ---",
            # GNU stat first, BSD stat as fallback; an empty mtime must not abort sh
            f"m=$(stat -c %Y {log_q} 2>/dev/null || stat -f %m {log_q} 2>/dev/null)",
            'if [ -n "$m" ]; then echo $(( $(date +%s) - m )); else echo -1; fi',
            "echo ---",
            f"tail -n {LOG_TAIL_LINES} {log_q} 2>/dev/null; true",
        ]
    )


class JarvislabsProvider:
    def __init__(
        self,
        api_key: str,
        *,
        train_log: str,
        train_pid: str,
        ckpt_flag: str,
        ckpt_done: str,
    ) -> None:
        from jarvislabs import Client  # imported lazily so tests don't need credentials

        self._client = Client(api_key=api_key)
        self._probe_script = build_probe_script(train_log, train_pid)
        self._flag = _remote_path(ckpt_flag)
        self._done = _remote_path(ckpt_done)

    async def _exec(self, machine_id: int, script: str) -> str:
        proc = await asyncio.create_subprocess_exec(
            "jl",
            "exec",
            str(machine_id),
            "--json",
            "--",
            "sh",
            "-lc",
            script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            out, err = await asyncio.wait_for(proc.communicate(), EXEC_TIMEOUT_S)
        except TimeoutError as exc:
            proc.kill()
            raise RemoteCommandError(f"jl exec timed out on {machine_id}") from exc
        try:
            payload = json.loads(out.decode() or "{}")
        except json.JSONDecodeError as exc:
            raise RemoteCommandError(f"jl exec returned non-JSON: {err.decode()[:200]}") from exc
        if "error" in payload or payload.get("exit_code", 1) != 0:
            detail = payload.get("error") or payload.get("stderr", "")[:200]
            raise RemoteCommandError(f"jl exec failed on {machine_id}: {detail}")
        return str(payload.get("stdout", ""))

    async def probe(self, machine_id: int) -> Probe:
        stdout = await self._exec(machine_id, self._probe_script)
        return parse_probe_output(stdout, datetime.now(UTC))

    async def request_checkpoint(self, machine_id: int) -> None:
        await self._exec(machine_id, f"rm -f {self._done}; touch {self._flag}")

    async def checkpoint_ready(self, machine_id: int) -> bool:
        out = await self._exec(machine_id, f"[ -f {self._done} ] && echo yes || echo no")
        return out.strip() == "yes"

    async def pause(self, machine_id: int) -> None:
        await asyncio.to_thread(self._client.instances.pause, machine_id)
        logger.info("paused machine %s", machine_id)

    async def resume(self, machine_id: int, gpu_type: str | None) -> int:
        instance = await asyncio.to_thread(
            self._client.instances.resume, machine_id, gpu_type=gpu_type
        )
        logger.info("resumed %s as %s", machine_id, instance.machine_id)
        return int(instance.machine_id)

    async def list_instances(self) -> list[InstanceInfo]:
        instances = await asyncio.to_thread(self._client.instances.list)
        return [
            InstanceInfo(
                machine_id=int(i.machine_id),
                name=i.name or f"machine-{i.machine_id}",
                gpu_type=i.gpu_type,
                gpu_count=i.num_gpus or 1,
                provider_status=i.status,
            )
            for i in instances
            if i.status == "Running"
        ]

    async def balance(self) -> float:
        result = await asyncio.to_thread(self._client.account.balance)
        return float(result.balance) + float(result.grants)
