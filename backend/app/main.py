"""Castle Spa & Massage API.

Run locally:  uvicorn app.main:app --reload
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .db import init_db
from .routers import admin, public

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("castle")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title="Castle Spa & Massage API", lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )

    @app.exception_handler(RequestValidationError)
    async def _validation(_req: Request, exc: RequestValidationError):
        # one readable sentence per field instead of pydantic's raw structure
        fields = {}
        for err in exc.errors():
            loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
            fields[".".join(loc) or "request"] = err.get("msg", "Invalid value").removeprefix("Value error, ")
        return JSONResponse(status_code=422, content={"detail": "Please check the highlighted fields", "fields": fields})

    @app.exception_handler(Exception)
    async def _unhandled(_req: Request, exc: Exception):
        # log the real error, never leak it (DB paths, SQL) to the browser
        log.exception("unhandled error", exc_info=exc)
        return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again or call us."})

    app.include_router(public.router)
    app.include_router(admin.router)
    app.include_router(admin.guarded)
    return app


app = create_app()
