"""Gemma 4 judge: loss-curve image + GPU stats + log tail -> a function call."""

from __future__ import annotations

import base64
import logging
from typing import Any

from openai import AsyncOpenAI, BadRequestError

from guard.chart import render_loss_chart
from guard.models import JudgeRequest, Verdict
from llm.tools import TOOLS, parse_content_fallback, parse_tool_call

logger = logging.getLogger(__name__)
LOG_LINES_FOR_PROMPT = 50

SYSTEM_PROMPT = """You are LeaseGuard, a GPU cost guard for ML training runs.
You are shown a training run's loss curve (image), GPU stats and the end of its log.
Decide exactly one action by calling one tool:
- pause_run: training converged (loss flat) or finished cleanly. Saves money.
- keep_running: loss is still clearly improving.
- escalate_to_kepler: something is BROKEN (stalled process, NaN loss, CUDA out of memory,
  crash/traceback). Never pause broken runs; the SRE agent needs the process alive.
Keep the reason to one short sentence a human can read on their phone.
If you cannot call tools, reply ONLY with JSON:
{"tool": "<name>", "arguments": {"reason": "...", ...}}"""


def _summary(req: JudgeRequest) -> str:
    probe = req.probe
    log_tail = "\n".join(probe.log_tail.splitlines()[-LOG_LINES_FOR_PROMPT:])
    recent = ", ".join(f"{v:.4g}" for v in probe.losses[-12:]) or "none"
    return (
        f"Run: {req.run_name}\n"
        f"Rule signals: {', '.join(req.suspicion.signals) or 'none'}\n"
        f"GPU utilisation: {probe.gpu_util_pct:.0f}%  memory: {probe.gpu_mem_mb:.0f} MB\n"
        f"Process alive: {probe.process_alive}\n"
        f"Seconds since last log line: {probe.seconds_since_log:.0f}\n"
        f"Detected error: {probe.error_hint or 'none'}\n"
        f"Recent losses: {recent}\n"
        f"--- log tail ---\n{log_tail}"
    )


def build_messages(req: JudgeRequest, with_image: bool) -> list[dict[str, Any]]:
    content: list[dict[str, Any]] = [{"type": "text", "text": _summary(req)}]
    png = render_loss_chart(req.probe.losses) if with_image else None
    if png:
        data_url = "data:image/png;base64," + base64.b64encode(png).decode()
        content.append({"type": "image_url", "image_url": {"url": data_url}})
    return [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": content}]


def _parse(response: Any) -> Verdict | None:
    message = response.choices[0].message
    for call in message.tool_calls or []:
        verdict = parse_tool_call(call.function.name, call.function.arguments)
        if verdict:
            return verdict
    return parse_content_fallback(message.content or "")


class GemmaJudge:
    def __init__(self, client: AsyncOpenAI | None, model: str) -> None:
        self._client = client
        self._model = model

    async def _ask(self, req: JudgeRequest, with_image: bool) -> Verdict | None:
        assert self._client is not None
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=build_messages(req, with_image),
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.1,
        )
        return _parse(response)

    async def judge(self, req: JudgeRequest) -> Verdict | None:
        """Return Gemma's verdict, or None so the caller can fall back to rules."""
        if self._client is None:
            return None
        try:
            try:
                return await self._ask(req, with_image=True)
            except BadRequestError:
                logger.warning("Gemma rejected the image request; retrying text-only")
                return await self._ask(req, with_image=False)
        except Exception:  # judge must never crash the guard; rules take over
            logger.exception("Gemma judge failed")
            return None


def build_judge(base_url: str, api_key: str, model: str, timeout_s: float) -> GemmaJudge:
    client = AsyncOpenAI(base_url=base_url, api_key=api_key, timeout=timeout_s, max_retries=1)
    return GemmaJudge(client, model)
