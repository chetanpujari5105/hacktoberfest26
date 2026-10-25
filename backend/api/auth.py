"""Pure-ASGI API-key guard for /api/v1 and /mcp (works with streaming MCP responses)."""

from __future__ import annotations

import hmac
import json

from starlette.types import ASGIApp, Receive, Scope, Send

PROTECTED_PREFIXES = ("/api/v1", "/mcp")
HEADER = b"x-api-key"


class ApiKeyMiddleware:
    def __init__(self, app: ASGIApp, api_key: str) -> None:
        if not api_key:
            raise ValueError("BACKEND_API_KEY must be set")
        self._app = app
        self._key = api_key.encode()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not scope["path"].startswith(PROTECTED_PREFIXES):
            await self._app(scope, receive, send)
            return
        supplied = dict(scope.get("headers", [])).get(HEADER, b"")
        if hmac.compare_digest(supplied, self._key):
            await self._app(scope, receive, send)
            return
        body = json.dumps({"success": False, "data": None, "error": "Unauthorized"}).encode()
        await send(
            {
                "type": "http.response.start",
                "status": 401,
                "headers": [(b"content-type", b"application/json")],
            }
        )
        await send({"type": "http.response.body", "body": body})
