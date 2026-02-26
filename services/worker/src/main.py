"""Worker service entry point for the French Learning Platform.

This FastAPI application serves two purposes:

1. **Cloud Tasks HTTP handler** -- receives ``POST /jobs/{job_type}`` calls
   dispatched by Google Cloud Tasks and delegates to the appropriate job
   handler.

2. **Local polling mode** -- when started with ``--local``, the worker
   polls the ``async_jobs`` table in Supabase for pending jobs and
   processes them in-process.  This is intended for local development
   where Cloud Tasks is not available.

Health check is at ``GET /health``.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from supabase import acreate_client

from services.worker.src.config import WorkerSettings, get_worker_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Job type registry
# ---------------------------------------------------------------------------

# Map from job_type string to an async handler function.
# Each handler receives (supabase_admin_client, payload_dict) and returns None.
# New job types are registered in services/worker/src/jobs/*.py -- here we
# provide the dispatch skeleton.

_JOB_HANDLERS: dict[str, Any] = {}


def register_job(job_type: str):
    """Decorator to register an async job handler.

    Usage::

        @register_job("writing_eval")
        async def handle_writing_eval(client, payload):
            ...
    """

    def decorator(func):
        _JOB_HANDLERS[job_type] = func
        return func

    return decorator


# Import job modules to trigger registration.  Missing modules are OK
# during early development.
def _load_job_modules() -> None:
    import importlib

    job_module_names = [
        "services.worker.src.jobs.writing_eval",
        "services.worker.src.jobs.lesson_generation",
        "services.worker.src.jobs.cultural_content",
        "services.worker.src.jobs.difficulty_recalibration",
        "services.worker.src.jobs.difficulty_recal",
        "services.worker.src.jobs.pronunciation_eval",
    ]
    for name in job_module_names:
        try:
            importlib.import_module(name)
        except ModuleNotFoundError:
            logger.debug("Job module %s not found -- skipping.", name)
        except Exception:
            logger.exception("Failed to import job module %s", name)


_load_job_modules()


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialise service-role Supabase client and store on app state."""
    settings = get_worker_settings()

    supabase_admin = await acreate_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )
    app.state.supabase_admin = supabase_admin
    app.state.settings = settings

    logger.info(
        "Worker service started (environment=%s, port=%d)",
        settings.ENVIRONMENT,
        settings.PORT,
    )

    yield

    close = getattr(supabase_admin, "aclose", None) or getattr(
        supabase_admin, "close", None
    )
    if callable(close):
        try:
            await close()
        except Exception:
            logger.exception("Error closing Supabase client")

    logger.info("Worker service shut down.")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

def create_worker_app() -> FastAPI:
    """Build and return the worker FastAPI application."""
    app = FastAPI(
        title="French Learning Worker Service",
        description="Async job worker for AI evaluation tasks.",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
    )

    # -- Health check ----------------------------------------------------

    @app.get("/health", tags=["infrastructure"])
    async def health_check() -> dict[str, str]:
        return {"status": "ok", "service": "french-learning-worker"}

    # -- Cloud Tasks HTTP handler ----------------------------------------

    @app.post("/jobs/{job_type}", tags=["jobs"])
    async def handle_job(job_type: str, request: Request) -> JSONResponse:
        """Receive a job dispatched by Cloud Tasks (or manual HTTP call).

        The request body is a JSON object with at least a ``payload`` key.
        """
        handler = _JOB_HANDLERS.get(job_type)
        if handler is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown job type: {job_type}",
            )

        try:
            body = await request.json()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON body.",
            )

        payload: dict[str, Any] = body.get("payload", body)
        user_id: str | None = body.get("user_id")

        logger.info("Processing job %s for user %s", job_type, user_id)

        try:
            supabase_admin = request.app.state.supabase_admin
            await handler(supabase_admin, payload)
            return JSONResponse(
                status_code=200, content={"status": "completed", "job_type": job_type}
            )
        except Exception:
            logger.exception("Job %s failed", job_type)
            return JSONResponse(
                status_code=500,
                content={"status": "failed", "job_type": job_type},
            )

    return app


app = create_worker_app()


# ---------------------------------------------------------------------------
# Local polling mode
# ---------------------------------------------------------------------------

async def _poll_loop(settings: WorkerSettings) -> None:
    """Poll the ``async_jobs`` table for pending jobs and process them.

    Intended for local development only (``--local`` flag).
    """
    supabase_admin = await acreate_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )

    logger.info("Worker polling mode started. Checking for pending jobs...")

    while True:
        try:
            result = (
                await supabase_admin.table("async_jobs")
                .select("*")
                .eq("status", "pending")
                .order("created_at")
                .limit(10)
                .execute()
            )

            jobs = result.data or []
            for job in jobs:
                job_type = job.get("job_type", "")
                job_id = job.get("id")
                handler = _JOB_HANDLERS.get(job_type)

                if handler is None:
                    logger.warning("No handler for job type %s (id=%s)", job_type, job_id)
                    continue

                # Mark as processing
                await (
                    supabase_admin.table("async_jobs")
                    .update({"status": "processing"})
                    .eq("id", job_id)
                    .execute()
                )

                try:
                    payload = job.get("payload", "{}")
                    if isinstance(payload, str):
                        payload = json.loads(payload)
                    await handler(supabase_admin, payload)

                    await (
                        supabase_admin.table("async_jobs")
                        .update({"status": "completed"})
                        .eq("id", job_id)
                        .execute()
                    )
                    logger.info("Job %s (id=%s) completed.", job_type, job_id)
                except Exception:
                    logger.exception("Job %s (id=%s) failed.", job_type, job_id)
                    await (
                        supabase_admin.table("async_jobs")
                        .update({"status": "failed"})
                        .eq("id", job_id)
                        .execute()
                    )

        except Exception:
            logger.exception("Poll loop error")

        await asyncio.sleep(5)  # poll every 5 seconds


def _run_local() -> None:
    """Run the worker in local polling mode."""
    settings = get_worker_settings()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    asyncio.run(_poll_loop(settings))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="French Learning Worker Service")
    parser.add_argument(
        "--local",
        action="store_true",
        help="Run in local polling mode instead of HTTP server.",
    )
    args = parser.parse_args()

    if args.local:
        _run_local()
    else:
        import uvicorn

        _settings = get_worker_settings()
        uvicorn.run(
            "services.worker.src.main:app",
            host=_settings.HOST,
            port=_settings.PORT,
            reload=_settings.is_development,
            log_level="info",
        )
