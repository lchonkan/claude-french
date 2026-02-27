"""Application configuration for the French Learning Platform API service.

Uses pydantic-settings to load configuration from environment variables
(or a .env file).  A module-level singleton is exposed via ``get_settings()``
so the same ``Settings`` instance is reused across the application lifetime.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """Validated configuration sourced from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # -- Supabase --------------------------------------------------------
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # -- Hugging Face ----------------------------------------------------
    HF_API_TOKEN: str
    HF_INFERENCE_ENDPOINT_WHISPER: str = ""
    HF_INFERENCE_ENDPOINT_MISTRAL: str = ""

    # -- Google Gemini ---------------------------------------------------
    GOOGLE_GEMINI_API_KEY: str

    # -- Google Cloud Tasks ----------------------------------------------
    GOOGLE_CLOUD_PROJECT: str = ""
    CLOUD_TASKS_QUEUE: str = "ai-jobs"
    CLOUD_TASKS_LOCATION: str = "europe-west1"
    WORKER_SERVICE_URL: str = "http://localhost:8001"

    # -- Server ----------------------------------------------------------
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # -- Derived helpers -------------------------------------------------
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the singleton ``Settings`` instance.

    The first call reads from the environment / .env file; subsequent calls
    return the cached result.
    """
    return Settings()  # type: ignore[call-arg]
