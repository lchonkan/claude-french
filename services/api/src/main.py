"""FastAPI application entry point for the French Learning Platform API.

Responsibilities:
- Health-check endpoint (``GET /health``)
- CORS middleware (permissive in development, restrictive in production)
- Lifespan event to initialise and tear down the async Supabase client
- Router registration for all feature modules under ``/api/v1``
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import acreate_client

from services.api.src.config import Settings, get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialise shared resources on startup; clean up on shutdown."""
    settings = get_settings()

    # Async Supabase client (used for auth verification and data access)
    supabase = await acreate_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
    )
    app.state.supabase = supabase

    # Service-role client for privileged operations (AI logging, admin)
    supabase_admin = await acreate_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )
    app.state.supabase_admin = supabase_admin

    # Store settings on app state for easy access in dependencies
    app.state.settings = settings

    logger.info(
        "French Learning API started (environment=%s, port=%d)",
        settings.ENVIRONMENT,
        settings.PORT,
    )

    yield

    # Shutdown: close Supabase clients if they expose a close method
    for client in (supabase, supabase_admin):
        close = getattr(client, "aclose", None) or getattr(client, "close", None)
        if callable(close):
            try:
                await close()
            except Exception:
                logger.exception("Error closing Supabase client")

    logger.info("French Learning API shut down.")


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    """Build and return the configured FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="French Learning Platform API",
        description="Backend API for the hybrid AI French learning platform.",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
    )

    # -- CORS ------------------------------------------------------------
    if settings.is_development:
        # Permissive CORS for local development
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        # Production: restrict to known origins (extend as needed)
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[
                "https://frenchlearning.app",
                "https://www.frenchlearning.app",
            ],
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type"],
        )

    # -- Health check ----------------------------------------------------

    @app.get("/health", tags=["infrastructure"])
    async def health_check() -> dict[str, str]:
        """Liveness / readiness probe."""
        return {"status": "ok", "service": "french-learning-api"}

    # -- Register routers ------------------------------------------------
    _register_routers(app)

    # -- Global exception handler ----------------------------------------

    @app.exception_handler(Exception)
    async def _global_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled exception on %s %s", request.method, request.url)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error."},
        )

    return app


def _register_routers(app: FastAPI) -> None:
    """Import and mount all API v1 route modules.

    Each module is expected to expose an ``router`` attribute
    (``fastapi.APIRouter``).  Modules that do not yet exist are
    skipped with a warning so the application can start incrementally.
    """
    route_modules = [
        ("services.api.src.routes.vocabulary", "vocabulary", ["vocabulary"]),
        ("services.api.src.routes.lessons", "lessons", ["lessons"]),
        ("services.api.src.routes.grammar", "grammar", ["grammar"]),
        ("services.api.src.routes.conversation", "conversation", ["conversation"]),
        ("services.api.src.routes.writing", "writing", ["writing"]),
        ("services.api.src.routes.pronunciation", "pronunciation", ["pronunciation"]),
        ("services.api.src.routes.listening", "listening", ["listening"]),
        ("services.api.src.routes.progress", "progress", ["progress"]),
        ("services.api.src.routes.exams", "exams", ["exams"]),
        ("services.api.src.routes.cultural", "cultural", ["cultural"]),
        ("services.api.src.routes.admin", "admin", ["admin"]),
    ]

    import importlib

    for module_path, prefix, tags in route_modules:
        try:
            mod = importlib.import_module(module_path)
            router = getattr(mod, "router", None)
            if router is None:
                logger.warning("Module %s has no 'router' attribute.", module_path)
                continue
            app.include_router(router, prefix=f"/api/v1/{prefix}", tags=tags)
            logger.debug("Registered router: /api/v1/%s", prefix)
        except ModuleNotFoundError:
            logger.warning(
                "Route module %s not found -- skipping. "
                "Create it when you implement this feature.",
                module_path,
            )
        except Exception:
            logger.exception("Failed to register router from %s", module_path)


# ---------------------------------------------------------------------------
# Module-level app instance (used by uvicorn)
# ---------------------------------------------------------------------------

app = create_app()


if __name__ == "__main__":
    import uvicorn

    _settings = get_settings()
    uvicorn.run(
        "services.api.src.main:app",
        host=_settings.HOST,
        port=_settings.PORT,
        reload=_settings.is_development,
        log_level="info",
    )
