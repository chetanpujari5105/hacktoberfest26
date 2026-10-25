"""Telegram link status for the dashboard (bot username looked up once via getMe)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from config import Settings

logger = logging.getLogger(__name__)
TELEGRAM_API = "https://api.telegram.org"
_usernames: dict[str, str | None] = {}


async def _bot_username(token: str) -> str | None:
    if token in _usernames:
        return _usernames[token]
    username: str | None = None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{TELEGRAM_API}/bot{token}/getMe")
        if response.status_code == httpx.codes.OK:
            username = response.json().get("result", {}).get("username")
    except httpx.HTTPError:
        logger.warning("Telegram getMe failed")  # never log the URL: it holds the token
    _usernames[token] = username
    return username


async def telegram_status(settings: Settings) -> dict[str, Any]:
    token = settings.telegram_bot_token
    username = await _bot_username(token) if token else None
    return {
        "linked": bool(token and settings.telegram_group_id),
        "username": username,
        "link_url": f"https://t.me/{username}" if username else None,
    }
