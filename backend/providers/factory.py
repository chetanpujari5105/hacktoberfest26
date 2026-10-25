from __future__ import annotations

from config import Settings
from providers.base import GpuProvider
from providers.fake import FakeProvider, parse_scenarios


def build_provider(settings: Settings) -> GpuProvider:
    if settings.provider == "fake":
        return FakeProvider(parse_scenarios(settings.fake_scenarios))
    from providers.jarvislabs import JarvislabsProvider

    return JarvislabsProvider(
        settings.jl_api_key,
        train_log=settings.train_log,
        train_pid=settings.train_pid,
        ckpt_flag=settings.ckpt_flag,
        ckpt_done=settings.ckpt_done,
    )
