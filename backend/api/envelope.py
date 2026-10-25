"""Consistent ``{success, data, error}`` envelope and exception mapping."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from guard.service import RunAlreadyGuardedError, RunNotFoundError, RunUnavailableError

logger = logging.getLogger(__name__)


def ok(data: Any) -> dict[str, Any]:
    return {"success": True, "data": jsonable_encoder(data), "error": None}


def fail(status: int, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status, content={"success": False, "data": None, "error": message}
    )


def install_handlers(app: FastAPI) -> None:
    @app.exception_handler(RunNotFoundError)
    async def _not_found(_: Request, exc: RunNotFoundError) -> JSONResponse:
        return fail(404, f"Run not found: {exc}")

    @app.exception_handler(RunAlreadyGuardedError)
    async def _conflict(_: Request, exc: RunAlreadyGuardedError) -> JSONResponse:
        return fail(409, f"Machine is already guarded as {exc}")

    @app.exception_handler(RunUnavailableError)
    async def _unavailable(_: Request, exc: RunUnavailableError) -> JSONResponse:
        return fail(503, f"Worker unavailable for {exc}; try again shortly")

    @app.exception_handler(RequestValidationError)
    async def _invalid(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else {}
        where = ".".join(str(p) for p in first.get("loc", ()) if p != "body")
        return fail(422, f"Invalid request: {where} {first.get('msg', '')}".strip())

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return fail(exc.status_code, str(exc.detail))

    @app.exception_handler(Exception)
    async def _unexpected(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error on %s %s", request.method, request.url.path)
        return fail(500, "Internal error")
