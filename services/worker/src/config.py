"""Configuration for the French Learning Platform async worker service.

A subset of the API configuration -- the worker does not need the Supabase
anon key (it uses the service-role key exclusively) and does not serve
public traffic, so CORS-related settings are omitted.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class WorkerSettings(BaseSettings):
    """Validated configuration for the worker service."""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # -- Supabase --------------------------------------------------------
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # -- Hugging Face ----------------------------------------------------
    HF_API_TOKEN: str
    HF_INFERENCE_ENDPOINT_WHISPER: str = ""
    HF_INFERENCE_ENDPOINT_MISTRAL: str = ""

    # -- Google Gemini ---------------------------------------------------
    GOOGLE_GEMINI_API_KEY: str

    # -- Google Cloud Tasks (read-only; worker receives, does not enqueue)
    GOOGLE_CLOUD_PROJECT: str = ""

    # -- Server ----------------------------------------------------------
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # -- Derived helpers -------------------------------------------------
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache(maxsize=1)
def get_worker_settings() -> WorkerSettings:
    """Return the singleton ``WorkerSettings`` instance."""
    return WorkerSettings()  # type: ignore[call-arg]
