"""Logging setup shared by the API, worker and bot entry points."""

from __future__ import annotations

import logging
from typing import TextIO

# httpx/httpcore log full request URLs at INFO, and the Telegram Bot API puts the
# bot token in the URL path, so these loggers must stay at WARNING.
NOISY_LOGGERS = ("httpx", "httpcore", "telegram.ext._updater", "apscheduler")
FORMAT = "%(asctime)s %(levelname)s %(name)s %(message)s"


def configure_logging(level: int = logging.INFO, stream: TextIO | None = None) -> None:
    logging.basicConfig(level=level, format=FORMAT, stream=stream, force=True)
    for name in NOISY_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)
