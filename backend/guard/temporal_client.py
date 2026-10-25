from __future__ import annotations

from temporalio.client import Client
from temporalio.contrib.pydantic import pydantic_data_converter

from config import Settings
from guard.models import Policy
from guard.service import RunService


async def connect(settings: Settings) -> Client:
    """Connect to Temporal (dev server, or Temporal Cloud when an API key is set)."""
    return await Client.connect(
        settings.temporal_address,
        namespace=settings.temporal_namespace,
        api_key=settings.temporal_api_key or None,
        data_converter=pydantic_data_converter,
    )


def build_service(client: Client, settings: Settings) -> RunService:
    policy = Policy(
        probe_interval_s=settings.probe_interval_s,
        decision_timeout_s=settings.decision_timeout_s,
    )
    return RunService(client, settings.task_queue, settings.default_hourly_cost_inr, policy)
