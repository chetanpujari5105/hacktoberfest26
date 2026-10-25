"""Outbound notifications (Telegram group shared with Kepler's bot)."""

from __future__ import annotations

import logging
from typing import Protocol

import httpx

from guard.models import Notification

logger = logging.getLogger(__name__)
TELEGRAM_API = "https://api.telegram.org"
SEND_TIMEOUT_S = 10.0


class Notifier(Protocol):
    async def send(self, notification: Notification) -> None: ...


class LogNotifier:
    """Used when Telegram is not configured (local dev, tests)."""

    async def send(self, notification: Notification) -> None:
        labels = ", ".join(b.label for b in notification.buttons)
        logger.info("notify: %s [%s]", notification.text, labels)


class TelegramNotifier:
    def __init__(self, token: str, chat_id: str, client: httpx.AsyncClient | None = None) -> None:
        self._url = f"{TELEGRAM_API}/bot{token}/sendMessage"
        self._chat_id = chat_id
        self._client = client or httpx.AsyncClient(timeout=SEND_TIMEOUT_S)

    async def send(self, notification: Notification) -> None:
        payload: dict[str, object] = {"chat_id": self._chat_id, "text": notification.text}
        if notification.buttons:
            row = [{"text": b.label, "callback_data": b.data} for b in notification.buttons]
            payload["reply_markup"] = {"inline_keyboard": [row]}
        response = await self._client.post(self._url, json=payload)
        if response.status_code != httpx.codes.OK:
            # Raise so the Temporal activity retries; never log the token-bearing URL.
            raise RuntimeError(f"Telegram sendMessage failed with HTTP {response.status_code}")


def build_notifier(token: str, chat_id: str) -> Notifier:
    if token and chat_id:
        return TelegramNotifier(token, chat_id)
    logger.warning("Telegram not configured; notifications go to the log")
    return LogNotifier()
