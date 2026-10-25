"""Temporal worker: runs the guard workflows and all activities.

Run: ``python worker.py``
"""

from __future__ import annotations

import asyncio
import logging

from temporalio.client import Client
from temporalio.common import WorkflowIDConflictPolicy
from temporalio.worker import Worker

from config import Settings, get_settings
from guard.activities import GuardActivities
from guard.models import WalletInput
from guard.notify import build_notifier
from guard.temporal_client import build_service, connect
from guard.workflows import RunGuardWorkflow, WalletGuardWorkflow
from llm.judge import GemmaJudge, build_judge
from logsetup import configure_logging
from providers.factory import build_provider

logger = logging.getLogger("leaseguard.worker")
WALLET_WORKFLOW_ID = "wallet-guard"


def make_judge(settings: Settings) -> GemmaJudge:
    if settings.llm == "off":
        return GemmaJudge(None, "")
    base_url, api_key, model = settings.llm_endpoint
    logger.info("Gemma judge: %s via %s", model, base_url)
    return build_judge(base_url, api_key, model, settings.llm_timeout_s)


async def ensure_wallet_guard(client: Client, settings: Settings) -> None:
    await client.start_workflow(
        WalletGuardWorkflow.run,
        WalletInput(
            warn_threshold=settings.wallet_warn_inr,
            critical_threshold=settings.wallet_critical_inr,
            interval_s=settings.wallet_interval_s,
        ),
        id=WALLET_WORKFLOW_ID,
        task_queue=settings.task_queue,
        id_conflict_policy=WorkflowIDConflictPolicy.USE_EXISTING,
    )


async def main() -> None:
    configure_logging()
    settings = get_settings()
    client = await connect(settings)
    service = build_service(client, settings)
    activities = GuardActivities(
        provider=build_provider(settings),
        judge=make_judge(settings).judge,
        notifier=build_notifier(settings.telegram_bot_token, settings.telegram_group_id),
        pause_all=service.pause_all,
    )
    worker = Worker(
        client,
        task_queue=settings.task_queue,
        workflows=[RunGuardWorkflow, WalletGuardWorkflow],
        activities=activities.all(),
    )
    await ensure_wallet_guard(client, settings)
    logger.info("worker started (provider=%s, queue=%s)", settings.provider, settings.task_queue)
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
