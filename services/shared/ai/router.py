"""AI task router -- routes each task type to HuggingFace or Gemini.

Implements the platform routing strategy (FR-005) and the hybrid fallback
behaviour (FR-006):

(a) **Async tasks** (writing_eval, lesson_generation, cultural_content,
    difficulty_recalibration): on primary platform failure, queue the job
    to Cloud Tasks for retry and notify the learner when ready.

(b) **Sync tasks** (grammar_check, stt, text_generation): fall back to the
    other platform with a ``degraded_quality`` flag so callers can inform
    the learner.

(c) **Non-substitutable tasks** (pronunciation_analysis with multimodal
    input): return a structured "temporarily unavailable" response with
    alternative activity suggestions.

Health probes for each platform are exposed for the readiness check.
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Literal

from google.cloud import tasks_v2
from supabase import AsyncClient as AsyncSupabaseClient

from services.shared.ai.gemini import GeminiClient
from services.shared.ai.huggingface import HuggingFaceClient
from services.shared.ai.logger import log_ai_usage
from services.shared.ai.schemas import (
    ConversationEvaluation,
    CulturalContent,
    DifficultyAdjustment,
    GrammarError,
    LessonContent,
    PhonemeAlignment,
    PronunciationEvaluation,
    WritingEvaluation,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Enums & constants
# ---------------------------------------------------------------------------

class AITaskType(str, Enum):
    """All routable AI task types (mirrors ``ai_task_type_enum`` in the DB)."""

    GRAMMAR_CHECK = "grammar_check"
    STT = "stt"
    PHONEME_ALIGNMENT = "phoneme_alignment"
    EMBEDDING = "embedding"
    TEXT_GENERATION = "text_generation"
    WRITING_EVAL = "writing_eval"
    CONVERSATION = "conversation"
    PRONUNCIATION_ANALYSIS = "pronunciation_analysis"
    LESSON_GENERATION = "lesson_generation"
    DIFFICULTY_RECALIBRATION = "difficulty_recalibration"
    CULTURAL_CONTENT = "cultural_content"


class Platform(str, Enum):
    HUGGINGFACE = "huggingface"
    GEMINI = "gemini"


class FallbackCategory(str, Enum):
    """Determines fallback behaviour on primary platform failure."""

    ASYNC = "async"
    SYNC = "sync"
    NON_SUBSTITUTABLE = "non_substitutable"


@dataclass(frozen=True)
class RoutingEntry:
    """Mapping of a task type to its primary platform, model, and fallback."""

    primary: Platform
    model: str
    fallback_category: FallbackCategory
    fallback_platform: Platform | None = None


# Documented routing table (FR-005 / FR-008 / FR-009)
ROUTING_TABLE: dict[AITaskType, RoutingEntry] = {
    AITaskType.GRAMMAR_CHECK: RoutingEntry(
        primary=Platform.HUGGINGFACE,
        model="camembert-base + mistral-7b",
        fallback_category=FallbackCategory.SYNC,
        fallback_platform=Platform.GEMINI,
    ),
    AITaskType.STT: RoutingEntry(
        primary=Platform.HUGGINGFACE,
        model="whisper-large-v3-turbo",
        fallback_category=FallbackCategory.SYNC,
        fallback_platform=Platform.GEMINI,
    ),
    AITaskType.PHONEME_ALIGNMENT: RoutingEntry(
        primary=Platform.HUGGINGFACE,
        model="wav2vec2-large-xlsr-53-french",
        fallback_category=FallbackCategory.SYNC,
        fallback_platform=Platform.GEMINI,
    ),
    AITaskType.EMBEDDING: RoutingEntry(
        primary=Platform.HUGGINGFACE,
        model="paraphrase-multilingual-MiniLM-L12-v2",
        fallback_category=FallbackCategory.SYNC,
        fallback_platform=Platform.GEMINI,
    ),
    AITaskType.TEXT_GENERATION: RoutingEntry(
        primary=Platform.HUGGINGFACE,
        model="mistral-7b-instruct",
        fallback_category=FallbackCategory.SYNC,
        fallback_platform=Platform.GEMINI,
    ),
    AITaskType.WRITING_EVAL: RoutingEntry(
        primary=Platform.GEMINI,
        model="gemini-2.0-pro",
        fallback_category=FallbackCategory.ASYNC,
    ),
    AITaskType.CONVERSATION: RoutingEntry(
        primary=Platform.GEMINI,
        model="gemini-2.0-flash",
        fallback_category=FallbackCategory.SYNC,
        fallback_platform=Platform.HUGGINGFACE,
    ),
    AITaskType.PRONUNCIATION_ANALYSIS: RoutingEntry(
        primary=Platform.GEMINI,
        model="gemini-2.0-flash",
        fallback_category=FallbackCategory.NON_SUBSTITUTABLE,
    ),
    AITaskType.LESSON_GENERATION: RoutingEntry(
        primary=Platform.GEMINI,
        model="gemini-2.0-flash",
        fallback_category=FallbackCategory.ASYNC,
    ),
    AITaskType.DIFFICULTY_RECALIBRATION: RoutingEntry(
        primary=Platform.GEMINI,
        model="gemini-2.0-flash",
        fallback_category=FallbackCategory.ASYNC,
    ),
    AITaskType.CULTURAL_CONTENT: RoutingEntry(
        primary=Platform.GEMINI,
        model="gemini-2.0-flash",
        fallback_category=FallbackCategory.ASYNC,
    ),
}


# ---------------------------------------------------------------------------
# Result containers
# ---------------------------------------------------------------------------

@dataclass
class RouteResult:
    """Standard wrapper returned by every route call."""

    success: bool
    data: Any = None
    platform_used: Platform | None = None
    is_fallback: bool = False
    degraded_quality: bool = False
    error: str | None = None
    queued: bool = False
    suggestions: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

class AIRouter:
    """Central router that dispatches AI tasks to the correct platform.

    Parameters
    ----------
    hf_client:
        Initialized ``HuggingFaceClient``.
    gemini_client:
        Initialized ``GeminiClient``.
    supabase_client:
        Async Supabase client (service-role) for logging and job queueing.
    cloud_tasks_client:
        Google Cloud Tasks client for enqueueing async fallback jobs.
    cloud_tasks_queue_path:
        Fully-qualified Cloud Tasks queue path.
    worker_service_url:
        Base URL of the worker service for Cloud Tasks HTTP targets.
    """

    def __init__(
        self,
        *,
        hf_client: HuggingFaceClient,
        gemini_client: GeminiClient,
        supabase_client: AsyncSupabaseClient,
        cloud_tasks_client: tasks_v2.CloudTasksClient | None = None,
        cloud_tasks_queue_path: str = "",
        worker_service_url: str = "http://localhost:8001",
    ) -> None:
        self._hf = hf_client
        self._gemini = gemini_client
        self._supabase = supabase_client
        self._tasks_client = cloud_tasks_client
        self._queue_path = cloud_tasks_queue_path
        self._worker_url = worker_service_url

    # -- Health probes ---------------------------------------------------

    async def health_check_huggingface(self) -> bool:
        """Probe HuggingFace Inference Endpoints."""
        return await self._hf.health_check()

    async def health_check_gemini(self) -> bool:
        """Probe the Gemini API."""
        return await self._gemini.health_check()

    async def health_check_all(self) -> dict[str, bool]:
        """Return health status of both platforms."""
        hf_ok = await self.health_check_huggingface()
        gemini_ok = await self.health_check_gemini()
        return {"huggingface": hf_ok, "gemini": gemini_ok}

    # -- Generic dispatch ------------------------------------------------

    async def route(
        self,
        task_type: AITaskType,
        *,
        user_id: str | uuid.UUID | None = None,
        **kwargs: Any,
    ) -> RouteResult:
        """Route *task_type* to the appropriate platform.

        Handles fallback logic transparently.  Callers receive a
        ``RouteResult`` regardless of which code path was taken.

        Parameters
        ----------
        task_type:
            The AI task to execute.
        user_id:
            Optional learner ID for logging.
        **kwargs:
            Task-specific parameters forwarded to the underlying client method.
        """
        entry = ROUTING_TABLE[task_type]
        session_id = uuid.uuid4()
        start = time.monotonic()

        # Attempt primary platform
        try:
            data = await self._dispatch(entry.primary, task_type, **kwargs)
            latency_ms = int((time.monotonic() - start) * 1000)

            await log_ai_usage(
                self._supabase,
                session_id=session_id,
                user_id=user_id,
                platform=entry.primary.value,
                model_name=entry.model,
                task_type=task_type.value,
                latency_ms=latency_ms,
                success=True,
            )
            return RouteResult(
                success=True,
                data=data,
                platform_used=entry.primary,
            )

        except Exception as exc:
            primary_latency = int((time.monotonic() - start) * 1000)
            logger.warning(
                "Primary platform %s failed for %s: %s",
                entry.primary.value,
                task_type.value,
                exc,
            )
            await log_ai_usage(
                self._supabase,
                session_id=session_id,
                user_id=user_id,
                platform=entry.primary.value,
                model_name=entry.model,
                task_type=task_type.value,
                latency_ms=primary_latency,
                success=False,
                error_message=str(exc),
            )

            # -- Fallback logic ------------------------------------------
            return await self._handle_fallback(
                entry, task_type, session_id, user_id, kwargs, exc
            )

    # -- Fallback handling -----------------------------------------------

    async def _handle_fallback(
        self,
        entry: RoutingEntry,
        task_type: AITaskType,
        session_id: uuid.UUID,
        user_id: str | uuid.UUID | None,
        kwargs: dict[str, Any],
        original_error: Exception,
    ) -> RouteResult:
        """Apply the correct fallback strategy based on task category."""

        match entry.fallback_category:

            # (a) Async tasks: queue to Cloud Tasks
            case FallbackCategory.ASYNC:
                queued = await self._enqueue_job(task_type, kwargs, user_id)
                return RouteResult(
                    success=False,
                    queued=queued,
                    error=(
                        "Primary platform unavailable. Job queued -- "
                        "you will be notified when results are ready."
                    ),
                )

            # (b) Sync tasks: try the other platform
            case FallbackCategory.SYNC:
                if entry.fallback_platform is None:
                    return RouteResult(
                        success=False,
                        error=f"No fallback platform for {task_type.value}.",
                    )

                start = time.monotonic()
                try:
                    data = await self._dispatch(
                        entry.fallback_platform, task_type, **kwargs
                    )
                    latency_ms = int((time.monotonic() - start) * 1000)
                    await log_ai_usage(
                        self._supabase,
                        session_id=session_id,
                        user_id=user_id,
                        platform=entry.fallback_platform.value,
                        model_name=f"{entry.fallback_platform.value}-fallback",
                        task_type=task_type.value,
                        latency_ms=latency_ms,
                        success=True,
                        is_fallback=True,
                    )
                    return RouteResult(
                        success=True,
                        data=data,
                        platform_used=entry.fallback_platform,
                        is_fallback=True,
                        degraded_quality=True,
                    )
                except Exception as fallback_exc:
                    logger.error(
                        "Fallback platform %s also failed for %s: %s",
                        entry.fallback_platform.value,
                        task_type.value,
                        fallback_exc,
                    )
                    return RouteResult(
                        success=False,
                        error=(
                            f"Both platforms failed for {task_type.value}. "
                            f"Primary: {original_error}. "
                            f"Fallback: {fallback_exc}."
                        ),
                    )

            # (c) Non-substitutable tasks
            case FallbackCategory.NON_SUBSTITUTABLE:
                return RouteResult(
                    success=False,
                    error="This feature is temporarily unavailable.",
                    suggestions=[
                        "Try a vocabulary review session while we restore this feature.",
                        "Practice grammar exercises -- they use a different AI system.",
                        "Read a cultural note about Paris to keep learning.",
                    ],
                )

    # -- Platform dispatch -----------------------------------------------

    async def _dispatch(
        self, platform: Platform, task_type: AITaskType, **kwargs: Any
    ) -> Any:
        """Call the correct client method for *task_type* on *platform*."""

        if platform == Platform.HUGGINGFACE:
            return await self._dispatch_hf(task_type, **kwargs)
        return await self._dispatch_gemini(task_type, **kwargs)

    async def _dispatch_hf(
        self, task_type: AITaskType, **kwargs: Any
    ) -> Any:
        """Dispatch to a HuggingFace client method."""
        match task_type:
            case AITaskType.GRAMMAR_CHECK:
                errors = await self._hf.classify_grammar(kwargs["text"])
                if errors:
                    correction = await self._hf.generate_correction(
                        kwargs["text"], errors
                    )
                    return {"errors": errors, "correction": correction}
                return {"errors": [], "correction": kwargs["text"]}

            case AITaskType.STT:
                return await self._hf.transcribe(kwargs["audio_url"])

            case AITaskType.PHONEME_ALIGNMENT:
                return await self._hf.align_phonemes(
                    kwargs["audio_url"], kwargs["text"]
                )

            case AITaskType.EMBEDDING:
                return await self._hf.generate_embeddings(kwargs["texts"])

            case AITaskType.TEXT_GENERATION:
                return await self._hf.generate_text(
                    kwargs["prompt"], kwargs.get("system", "")
                )

            case AITaskType.CONVERSATION:
                # Fallback: use Mistral for conversation
                messages = kwargs.get("messages", [])
                scenario = kwargs.get("scenario", "")
                cefr_level = kwargs.get("cefr_level", "A1")
                history = "\n".join(
                    f"{m['role']}: {m['content']}" for m in messages
                )
                prompt = (
                    f"Continue this French conversation (scenario: {scenario}, "
                    f"level: {cefr_level}):\n{history}\nassistant:"
                )
                return await self._hf.generate_text(prompt)

            case _:
                raise ValueError(
                    f"Task {task_type.value} is not supported on HuggingFace."
                )

    async def _dispatch_gemini(
        self, task_type: AITaskType, **kwargs: Any
    ) -> Any:
        """Dispatch to a Gemini client method."""
        match task_type:
            case AITaskType.WRITING_EVAL:
                return await self._gemini.evaluate_writing(
                    kwargs["text"], kwargs["cefr_level"], kwargs["prompt"]
                )

            case AITaskType.CONVERSATION:
                return await self._gemini.converse(
                    kwargs["messages"],
                    kwargs["scenario"],
                    kwargs["cefr_level"],
                )

            case AITaskType.PRONUNCIATION_ANALYSIS:
                return await self._gemini.evaluate_pronunciation(
                    kwargs["audio_url"], kwargs["target_text"]
                )

            case AITaskType.LESSON_GENERATION:
                return await self._gemini.generate_lesson(
                    kwargs["module"], kwargs["cefr_level"], kwargs["topic"]
                )

            case AITaskType.CULTURAL_CONTENT:
                return await self._gemini.generate_cultural_content(
                    kwargs["cefr_level"], kwargs["category"]
                )

            case AITaskType.DIFFICULTY_RECALIBRATION:
                return await self._gemini.recalibrate_difficulty(
                    kwargs["mastery_data"]
                )

            case AITaskType.GRAMMAR_CHECK:
                # Fallback: use Gemini Flash for grammar checking
                text = kwargs["text"]
                prompt = (
                    "Analyze this French text for grammar errors. "
                    "Return JSON: {\"errors\": [{\"position\": int, "
                    "\"error_type\": str, \"original\": str, "
                    "\"correction\": str, \"explanation_es\": str}], "
                    f"\"correction\": \"corrected text\"}}\n\nText: {text}"
                )
                response = self._gemini._client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[
                        {"role": "user", "parts": [{"text": prompt}]}
                    ],
                    config=self._gemini._build_config(temperature=0.2),
                )
                return self._gemini._parse_json_response(response)

            case AITaskType.STT:
                # Fallback: use Gemini multimodal for STT
                audio_url = kwargs["audio_url"]
                prompt = (
                    "Transcribe the following French audio to text. "
                    "Return only the transcription, no JSON wrapper."
                )
                from google.genai import types as genai_types
                parts = [genai_types.Part(text=prompt)]
                if audio_url.startswith(("http://", "https://", "gs://")):
                    parts.append(
                        genai_types.Part(
                            file_data=genai_types.FileData(
                                file_uri=audio_url, mime_type="audio/webm"
                            )
                        )
                    )
                response = self._gemini._client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[{"role": "user", "parts": parts}],
                )
                return response.text or ""

            case AITaskType.TEXT_GENERATION:
                # Fallback: use Gemini Flash for text generation
                prompt = kwargs["prompt"]
                system = kwargs.get("system", "")
                full = f"{system}\n\n{prompt}" if system else prompt
                response = self._gemini._client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[{"role": "user", "parts": [{"text": full}]}],
                )
                return response.text or ""

            case _:
                raise ValueError(
                    f"Task {task_type.value} is not supported on Gemini."
                )

    # -- Cloud Tasks enqueue ---------------------------------------------

    async def _enqueue_job(
        self,
        task_type: AITaskType,
        payload: dict[str, Any],
        user_id: str | uuid.UUID | None,
    ) -> bool:
        """Enqueue an async job via Google Cloud Tasks.

        Falls back to direct DB insertion when Cloud Tasks client is
        unavailable (e.g. local development).
        """
        job_body = {
            "task_type": task_type.value,
            "user_id": str(user_id) if user_id else None,
            "payload": payload,
        }

        if self._tasks_client and self._queue_path:
            try:
                task = tasks_v2.Task(
                    http_request=tasks_v2.HttpRequest(
                        http_method=tasks_v2.HttpMethod.POST,
                        url=f"{self._worker_url}/jobs/{task_type.value}",
                        headers={"Content-Type": "application/json"},
                        body=json.dumps(job_body).encode(),
                    )
                )
                self._tasks_client.create_task(
                    parent=self._queue_path, task=task
                )
                logger.info("Enqueued Cloud Task for %s", task_type.value)
                return True
            except Exception:
                logger.exception("Failed to enqueue Cloud Task")

        # Fallback: write a pending job row for the local worker to poll.
        try:
            await self._supabase.table("async_jobs").insert(
                {
                    "job_type": task_type.value,
                    "user_id": str(user_id) if user_id else None,
                    "payload": json.dumps(payload),
                    "status": "pending",
                }
            ).execute()
            logger.info("Inserted pending job row for %s", task_type.value)
            return True
        except Exception:
            logger.exception("Failed to insert pending job row")
            return False
