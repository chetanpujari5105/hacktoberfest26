"""FastAPI app: REST API for the dashboard + MCP server for Kepler.

Run: ``uvicorn api.main:build --factory --host 0.0.0.0 --port 8000``
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastmcp.utilities.lifespan import combine_lifespans

from api.auth import ApiKeyMiddleware
from api.envelope import install_handlers
from api.mcp import build_mcp
from api.routes_runs import router
from config import Settings, get_settings
from guard.service import RunService
from guard.temporal_client import build_service, connect
from logsetup import configure_logging
from providers.base import GpuProvider
from providers.factory import build_provider

logger = logging.getLogger(__name__)


def create_app(
    settings: Settings,
    service: RunService | None = None,
    provider: GpuProvider | None = None,
) -> FastAPI:
    holder: dict[str, RunService] = {"service": service} if service is not None else {}
    mcp_app = build_mcp(lambda: holder["service"]).http_app(path="/")

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        if "service" not in holder:
            holder["service"] = build_service(await connect(settings), settings)
            app.state.service = holder["service"]
        logger.info("LeaseGuard API ready (provider=%s, llm=%s)", settings.provider, settings.llm)
        yield

    # No public /docs or /openapi.json: they would expose the API surface without the key.
    app = FastAPI(
        title="LeaseGuard",
        lifespan=combine_lifespans(lifespan, mcp_app.lifespan),
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.state.settings = settings
    app.state.service = service
    app.state.provider = provider or build_provider(settings)
    install_handlers(app)
    app.include_router(router)
    app.mount("/mcp", mcp_app)
    app.add_middleware(ApiKeyMiddleware, api_key=settings.backend_api_key)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


def build() -> FastAPI:
    """uvicorn factory: ``uvicorn api.main:build --factory``."""
    configure_logging()
    return create_app(get_settings())
