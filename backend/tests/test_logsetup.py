import io
import logging

import httpx
import pytest

from logsetup import configure_logging

pytestmark = pytest.mark.unit


def test_configure_logging_hides_telegram_token() -> None:
    buffer = io.StringIO()
    configure_logging(stream=buffer)
    transport = httpx.MockTransport(lambda _: httpx.Response(200))
    httpx.Client(transport=transport).post("https://api.telegram.org/botSECRET123/sendMessage")
    logging.getLogger("leaseguard").info("still logging")
    output = buffer.getvalue()
    assert "SECRET123" not in output
    assert "still logging" in output
