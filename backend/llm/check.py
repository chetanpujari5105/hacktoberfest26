"""One-shot check of the configured Gemma endpoint (makes ONE paid request).

Run: ``uv run python -m llm.check``

Reports whether the endpoint answered with a native tool call, a JSON fallback,
or nothing usable, using a synthetic "converged" run with a loss-curve image.
"""

from __future__ import annotations

import asyncio
import sys
from datetime import UTC, datetime

from openai import AsyncOpenAI

from config import get_settings
from guard.models import JudgeRequest, Probe, Suspicion
from llm.judge import build_messages
from llm.tools import TOOLS, parse_content_fallback, parse_tool_call

PLATEAU = (2.0, 1.4, 1.0, 0.8, 0.62, 0.55, 0.512, 0.505, 0.503, 0.502, 0.502, 0.501)


def _request() -> JudgeRequest:
    log = "\n".join(f"step={(i + 1) * 100} loss={v}" for i, v in enumerate(PLATEAU))
    probe = Probe(
        at=datetime.now(UTC), gpu_util_pct=94, gpu_mem_mb=15200, process_alive=True,
        losses=PLATEAU, log_tail=log, seconds_since_log=3,
    )  # fmt: skip
    return JudgeRequest(
        run_name="check",
        probe=probe,
        suspicion=Suspicion(suspicious=True, signals=("loss_plateau",)),
    )


async def main() -> int:
    settings = get_settings()
    base_url, api_key, model = settings.llm_endpoint
    print(f"endpoint: {base_url}  model: {model}")
    client = AsyncOpenAI(base_url=base_url, api_key=api_key, timeout=settings.llm_timeout_s)
    for with_image in (True, False):
        try:
            response = await client.chat.completions.create(
                model=model, messages=build_messages(_request(), with_image), tools=TOOLS,
                tool_choice="auto", temperature=0.1,
            )  # fmt: skip
        except Exception as exc:  # report and try the next mode
            print(f"image={with_image}: request failed: {type(exc).__name__}: {exc}")
            continue
        message = response.choices[0].message
        calls = message.tool_calls or []
        if calls:
            verdict = parse_tool_call(calls[0].function.name, calls[0].function.arguments)
            print(f"image={with_image}: NATIVE tool call -> {verdict}")
        else:
            verdict = parse_content_fallback(message.content or "")
            mode = "JSON fallback" if verdict else "UNUSABLE reply"
            print(f"image={with_image}: {mode} -> {verdict or (message.content or '')[:200]}")
        if verdict:
            return 0
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
