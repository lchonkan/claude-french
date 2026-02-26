# ruff: noqa: B008
"""Pronunciation API routes for the French Learning Platform.

Endpoints:
- GET  /exercises              -- List pronunciation exercises by CEFR level
- POST /upload                 -- Generate a signed upload URL for Supabase Storage
- POST /evaluate               -- Create evaluation, dispatch async pipeline
- GET  /evaluations/{id}       -- Poll evaluation status
- GET  /history                -- User's pronunciation history with pagination
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from services.api.src.middleware.auth import UserInfo, get_current_user
from services.shared.models.vocabulary import CEFRLevel

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class PronunciationExerciseOut(BaseModel):
    """A pronunciation exercise with reference audio and phonetic guide."""

    id: str
    target_text: str
    phonetic_ipa: str
    reference_audio_url: str
    cefr_level: str
    focus_phonemes: list[str]
    recommended_speed: float = 0.75


class ExercisesListResponse(BaseModel):
    """List of pronunciation exercises."""

    exercises: list[PronunciationExerciseOut]


class UploadRequest(BaseModel):
    """Request to generate a signed upload URL."""

    exercise_id: str = Field(
        min_length=1, description="UUID of the pronunciation exercise"
    )
    file_name: str = Field(
        min_length=1, description="Original file name (e.g. recording.wav)"
    )
    content_type: str = Field(
        default="audio/wav",
        description="MIME type of the audio file",
    )


class UploadResponse(BaseModel):
    """Signed upload URL and storage path."""

    upload_url: str
    storage_path: str
    expires_in_seconds: int = 300


class EvaluateRequest(BaseModel):
    """Request to start a pronunciation evaluation."""

    exercise_id: str = Field(
        min_length=1, description="UUID of the pronunciation exercise"
    )
    audio_storage_path: str = Field(
        min_length=1, description="Path in Supabase Storage"
    )
    target_text: str = Field(
        min_length=1, description="Expected French text"
    )


class EvaluateResponse(BaseModel):
    """Response after creating an evaluation job."""

    evaluation_id: str
    status: str = "pending"
    pipeline_steps: list[str] = [
        "stt",
        "phoneme_alignment",
        "multimodal_evaluation",
    ]
    estimated_completion_seconds: int = 8


class PhonemeDetailOut(BaseModel):
    """Per-phoneme accuracy data."""

    target: str
    actual: str
    score: float
    issue: str | None = None


class PipelineSTTResult(BaseModel):
    """STT stage result."""

    transcription: str
    confidence: float
    ai_platform: str = "huggingface"
    latency_ms: int


class PipelinePhonemeResult(BaseModel):
    """Phoneme alignment stage result."""

    phonemes: list[PhonemeDetailOut]
    phoneme_accuracy_score: float
    ai_platform: str = "huggingface"
    latency_ms: int


class PipelineMultimodalResult(BaseModel):
    """Multimodal evaluation stage result."""

    prosody_score: float
    fluency_score: float
    overall_score: float
    improvement_suggestions_es: list[str]
    ai_platform: str = "gemini"
    latency_ms: int


class PipelineResults(BaseModel):
    """Combined pipeline results."""

    stt: PipelineSTTResult | None = None
    phoneme_alignment: PipelinePhonemeResult | None = None
    multimodal_evaluation: PipelineMultimodalResult | None = None


class EvaluationDetailResponse(BaseModel):
    """Full evaluation result for polling."""

    evaluation_id: str
    status: str
    target_text: str
    transcription: str | None = None
    pipeline_results: PipelineResults | None = None
    total_latency_ms: int | None = None
    xp_awarded: int | None = None


class HistoryAttempt(BaseModel):
    """Summary of a past pronunciation attempt."""

    id: str
    target_text: str
    overall_score: float | None
    phoneme_accuracy_score: float | None
    created_at: str


class HistoryResponse(BaseModel):
    """Paginated pronunciation history."""

    attempts: list[HistoryAttempt]
    total: int


# ---------------------------------------------------------------------------
# Predefined pronunciation exercises per CEFR level
# ---------------------------------------------------------------------------

_EXERCISES: list[dict[str, Any]] = [
    # A1 exercises
    {
        "id": "a1-001",
        "target_text": "Bonjour, je m'appelle Marie.",
        "phonetic_ipa": "/b\u0254\u0303.\u0292u\u0281, \u0292\u0259 ma.p\u025bl ma.\u0281i/",
        "reference_audio_url": "/storage/v1/audio/ref/a1-bonjour-marie.wav",
        "cefr_level": "A1",
        "focus_phonemes": ["\u0254\u0303", "\u0292", "\u0281"],
        "recommended_speed": 0.75,
    },
    {
        "id": "a1-002",
        "target_text": "Comment allez-vous ?",
        "phonetic_ipa": "/k\u0254.m\u0251\u0303 a.le vu/",
        "reference_audio_url": "/storage/v1/audio/ref/a1-comment-allez-vous.wav",
        "cefr_level": "A1",
        "focus_phonemes": ["\u0254", "\u0251\u0303"],
        "recommended_speed": 0.75,
    },
    {
        "id": "a1-003",
        "target_text": "Je voudrais un croissant, s'il vous pla\u00eet.",
        "phonetic_ipa": "/\u0292\u0259 vu.d\u0281\u025b \u0153\u0303 k\u0281wa.s\u0251\u0303, sil vu pl\u025b/",
        "reference_audio_url": "/storage/v1/audio/ref/a1-croissant.wav",
        "cefr_level": "A1",
        "focus_phonemes": ["\u0281", "\u0153\u0303", "\u0251\u0303"],
        "recommended_speed": 0.75,
    },
    {
        "id": "a1-004",
        "target_text": "Merci beaucoup.",
        "phonetic_ipa": "/m\u025b\u0281.si bo.ku/",
        "reference_audio_url": "/storage/v1/audio/ref/a1-merci.wav",
        "cefr_level": "A1",
        "focus_phonemes": ["\u0281", "u"],
        "recommended_speed": 0.75,
    },
    {
        "id": "a1-005",
        "target_text": "O\u00f9 est la gare, s'il vous pla\u00eet ?",
        "phonetic_ipa": "/u \u025b la \u0261a\u0281, sil vu pl\u025b/",
        "reference_audio_url": "/storage/v1/audio/ref/a1-ou-est-la-gare.wav",
        "cefr_level": "A1",
        "focus_phonemes": ["u", "\u025b", "\u0281"],
        "recommended_speed": 0.75,
    },
    # A2 exercises
    {
        "id": "a2-001",
        "target_text": "Je suis all\u00e9 au march\u00e9 ce matin.",
        "phonetic_ipa": "/\u0292\u0259 s\u0265i a.le o ma\u0281.\u0283e s\u0259 ma.t\u025b\u0303/",
        "reference_audio_url": "/storage/v1/audio/ref/a2-marche.wav",
        "cefr_level": "A2",
        "focus_phonemes": ["\u0265i", "\u0283", "\u025b\u0303"],
        "recommended_speed": 0.8,
    },
    {
        "id": "a2-002",
        "target_text": "Il fait un temps magnifique aujourd'hui.",
        "phonetic_ipa": "/il f\u025b \u0153\u0303 t\u0251\u0303 ma.\u0272i.fik o.\u0292u\u0281.d\u0265i/",
        "reference_audio_url": "/storage/v1/audio/ref/a2-temps.wav",
        "cefr_level": "A2",
        "focus_phonemes": ["\u025b", "\u0153\u0303", "\u0272"],
        "recommended_speed": 0.8,
    },
    {
        "id": "a2-003",
        "target_text": "Est-ce que vous pourriez m'aider ?",
        "phonetic_ipa": "/\u025bs k\u0259 vu pu.\u0281je m\u025b.de/",
        "reference_audio_url": "/storage/v1/audio/ref/a2-pourriez.wav",
        "cefr_level": "A2",
        "focus_phonemes": ["\u0281", "je", "\u025b"],
        "recommended_speed": 0.8,
    },
    # B1 exercises
    {
        "id": "b1-001",
        "target_text": "Je pense que la situation \u00e9conomique va s'am\u00e9liorer.",
        "phonetic_ipa": "/\u0292\u0259 p\u0251\u0303s k\u0259 la si.t\u0265a.sj\u0254\u0303 e.k\u0254.n\u0254.mik va sa.me.lj\u0254.\u0281e/",
        "reference_audio_url": "/storage/v1/audio/ref/b1-situation.wav",
        "cefr_level": "B1",
        "focus_phonemes": ["\u0251\u0303", "\u0254\u0303", "\u0281"],
        "recommended_speed": 0.85,
    },
    {
        "id": "b1-002",
        "target_text": "Pourriez-vous me recommander un bon restaurant ?",
        "phonetic_ipa": "/pu.\u0281je vu m\u0259 \u0281\u0259.k\u0254.m\u0251\u0303.de \u0153\u0303 b\u0254\u0303 \u0281\u025bs.to.\u0281\u0251\u0303/",
        "reference_audio_url": "/storage/v1/audio/ref/b1-restaurant.wav",
        "cefr_level": "B1",
        "focus_phonemes": ["\u0281", "\u0254\u0303", "\u0251\u0303"],
        "recommended_speed": 0.85,
    },
    # B2 exercises
    {
        "id": "b2-001",
        "target_text": "La politique environnementale doit \u00eatre renforc\u00e9e pour pr\u00e9server notre plan\u00e8te.",
        "phonetic_ipa": "/la p\u0254.li.tik \u0251\u0303.vi.\u0281\u0254n.m\u0251\u0303.tal dwa \u025bt\u0281 \u0281\u0251\u0303.f\u0254\u0281.se pu\u0281 p\u0281e.z\u025b\u0281.ve n\u0254t\u0281 pla.n\u025bt/",
        "reference_audio_url": "/storage/v1/audio/ref/b2-environnement.wav",
        "cefr_level": "B2",
        "focus_phonemes": ["\u0281", "\u0254\u0303", "\u0251\u0303", "\u025b"],
        "recommended_speed": 0.9,
    },
    # C1 exercises
    {
        "id": "c1-001",
        "target_text": "L'esth\u00e9tique architecturale parisienne refl\u00e8te une synth\u00e8se harmonieuse d'\u00e9poques successives.",
        "phonetic_ipa": "/l\u025bs.te.tik a\u0281.\u0283i.t\u025bk.ty.\u0281al pa.\u0281i.zj\u025bn \u0281\u0259.fl\u025bt yn s\u025b\u0303.t\u025bz a\u0281.m\u0254.nj\u00f8z de.p\u0254k sy.k.s\u025b.siv/",
        "reference_audio_url": "/storage/v1/audio/ref/c1-esthetique.wav",
        "cefr_level": "C1",
        "focus_phonemes": ["\u0281", "\u0283", "y", "\u00f8"],
        "recommended_speed": 1.0,
    },
    # C2 exercises
    {
        "id": "c2-001",
        "target_text": "L'effervescence intellectuelle des caf\u00e9s litt\u00e9raires illustre l'h\u00e9ritage culturel inextinguible de la France.",
        "phonetic_ipa": "/l\u025b.f\u025b\u0281.v\u025b.s\u0251\u0303s \u025b\u0303.t\u025b.l\u025bk.ty.\u025bl de ka.fe li.te.\u0281\u025b\u0281 i.lyst\u0281 le.\u0281i.ta\u0292 kyl.ty.\u0281\u025bl in.\u025bks.t\u025b\u0303.\u0261ibl d\u0259 la f\u0281\u0251\u0303s/",
        "reference_audio_url": "/storage/v1/audio/ref/c2-effervescence.wav",
        "cefr_level": "C2",
        "focus_phonemes": ["\u0281", "\u0251\u0303", "y", "\u025b\u0303"],
        "recommended_speed": 1.0,
    },
]


# ---------------------------------------------------------------------------
# Helper: get Supabase client from request
# ---------------------------------------------------------------------------


def _get_supabase(request: Request) -> Any:
    """Extract the Supabase client from app state."""
    supabase = getattr(request.app.state, "supabase", None)
    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database client not available.",
        )
    return supabase


def _get_supabase_admin(request: Request) -> Any:
    """Extract the service-role Supabase client from app state."""
    supabase_admin = getattr(request.app.state, "supabase_admin", None)
    if supabase_admin is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin database client not available.",
        )
    return supabase_admin


def _get_settings(request: Request) -> Any:
    """Extract the application settings from app state."""
    settings = getattr(request.app.state, "settings", None)
    if settings is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application settings not available.",
        )
    return settings


# ---------------------------------------------------------------------------
# GET /exercises -- List pronunciation exercises by CEFR level
# ---------------------------------------------------------------------------


@router.get(
    "/exercises",
    response_model=dict[str, ExercisesListResponse],
)
async def list_exercises(
    request: Request,
    cefr_level: CEFRLevel = Query(
        ..., description="CEFR level filter"
    ),
    limit: int = Query(
        default=10, ge=1, le=50, description="Maximum exercises to return"
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """List pronunciation exercises filtered by CEFR level.

    Returns predefined phrases with IPA transcription, reference audio,
    and focus phonemes for the given CEFR level.
    """
    filtered = [
        PronunciationExerciseOut(**ex)
        for ex in _EXERCISES
        if ex["cefr_level"] == cefr_level.value
    ][:limit]

    return {"data": ExercisesListResponse(exercises=filtered)}


# ---------------------------------------------------------------------------
# POST /upload -- Generate signed upload URL for Supabase Storage
# ---------------------------------------------------------------------------


@router.post(
    "/upload",
    response_model=dict[str, UploadResponse],
)
async def generate_upload_url(
    request: Request,
    body: UploadRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Generate a signed upload URL for direct client-to-storage upload.

    The audio file is stored under ``{user_id}/{date}/{file_name}`` in
    the ``audio`` bucket.
    """
    supabase_admin = _get_supabase_admin(request)
    now = datetime.now(UTC)
    date_str = now.strftime("%Y-%m-%d")

    storage_path = f"{user.id}/{date_str}/{body.file_name}"

    try:
        # Create a signed upload URL using the service-role client
        result = supabase_admin.storage.from_("audio").create_signed_upload_url(
            storage_path
        )

        # The result structure depends on the Supabase client version
        if isinstance(result, dict):
            signed_url = result.get("signedURL") or result.get("signed_url", "")
        elif hasattr(result, "signed_url"):
            signed_url = result.signed_url
        elif hasattr(result, "data"):
            data = result.data
            signed_url = (
                data.get("signedURL", "")
                if isinstance(data, dict)
                else getattr(data, "signed_url", "")
            )
        else:
            signed_url = str(result)

        return {
            "data": UploadResponse(
                upload_url=signed_url,
                storage_path=storage_path,
                expires_in_seconds=300,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to generate signed upload URL")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate upload URL.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /evaluate -- Create evaluation, dispatch async pipeline
# ---------------------------------------------------------------------------


@router.post(
    "/evaluate",
    response_model=dict[str, EvaluateResponse],
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_evaluation(
    request: Request,
    body: EvaluateRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Start a pronunciation evaluation.

    Creates a ``pronunciation_scores`` record with status ``pending`` and
    dispatches the async 3-stage pipeline via Cloud Tasks (or the local
    worker in development mode).
    """
    supabase_admin = _get_supabase_admin(request)
    settings = _get_settings(request)

    try:
        # 1. Create the pronunciation_scores record
        insert_result = await (
            supabase_admin.table("pronunciation_scores")
            .insert({
                "user_id": user.id,
                "target_text": body.target_text,
                "audio_url": body.audio_storage_path,
                "status": "pending",
            })
            .execute()
        )

        if not insert_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create evaluation record.",
            )

        evaluation_id = insert_result.data[0]["id"]

        # 2. Dispatch the async pronunciation evaluation job
        job_payload = {
            "evaluation_id": evaluation_id,
            "user_id": user.id,
            "target_text": body.target_text,
            "audio_storage_path": body.audio_storage_path,
        }

        if (
            settings.GOOGLE_CLOUD_PROJECT
            and settings.ENVIRONMENT != "development"
        ):
            # Production: dispatch via Cloud Tasks
            await _dispatch_cloud_task(settings, job_payload)
        else:
            # Development: dispatch via HTTP to the local worker
            import httpx

            async with httpx.AsyncClient(timeout=5.0) as client:
                try:
                    await client.post(
                        f"{settings.WORKER_SERVICE_URL}/jobs/pronunciation_eval",
                        json={"payload": job_payload, "user_id": user.id},
                    )
                except Exception:
                    logger.warning(
                        "Failed to dispatch to local worker; "
                        "job will be picked up via polling."
                    )

        return {
            "data": EvaluateResponse(
                evaluation_id=evaluation_id,
                status="pending",
                estimated_completion_seconds=8,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create pronunciation evaluation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create evaluation.",
        ) from exc


async def _dispatch_cloud_task(settings: Any, payload: dict[str, Any]) -> None:
    """Dispatch a pronunciation evaluation job to Google Cloud Tasks."""
    try:
        from google.cloud import tasks_v2

        client = tasks_v2.CloudTasksClient()
        parent = client.queue_path(
            settings.GOOGLE_CLOUD_PROJECT,
            settings.CLOUD_TASKS_LOCATION,
            settings.CLOUD_TASKS_QUEUE,
        )

        import json

        task = tasks_v2.Task(
            http_request=tasks_v2.HttpRequest(
                http_method=tasks_v2.HttpMethod.POST,
                url=f"{settings.WORKER_SERVICE_URL}/jobs/pronunciation_eval",
                headers={"Content-Type": "application/json"},
                body=json.dumps(
                    {"payload": payload, "user_id": payload["user_id"]}
                ).encode(),
            )
        )

        client.create_task(parent=parent, task=task)
    except Exception:
        logger.exception("Failed to dispatch Cloud Tasks job")
        raise


# ---------------------------------------------------------------------------
# GET /evaluations/{id} -- Poll evaluation status
# ---------------------------------------------------------------------------


@router.get(
    "/evaluations/{evaluation_id}",
    response_model=dict[str, EvaluationDetailResponse],
)
async def get_evaluation(
    request: Request,
    evaluation_id: UUID,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Get pronunciation evaluation result.

    Clients should poll this endpoint until ``status`` is ``completed``
    or ``failed``.
    """
    supabase = _get_supabase(request)

    try:
        result = await (
            supabase.table("pronunciation_scores")
            .select("*")
            .eq("id", str(evaluation_id))
            .eq("user_id", user.id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evaluation {evaluation_id} not found.",
            )

        row = result.data[0]

        # Build pipeline results if evaluation is completed
        pipeline_results: PipelineResults | None = None
        total_latency_ms: int | None = None

        if row["status"] == "completed":
            phoneme_alignment_data = row.get("phoneme_alignment") or {}
            improvement_data = row.get("improvement_suggestions") or {}

            stt_result = PipelineSTTResult(
                transcription=row.get("transcription") or "",
                confidence=phoneme_alignment_data.get("stt_confidence", 0.0),
                latency_ms=phoneme_alignment_data.get("stt_latency_ms", 0),
            )

            phonemes_raw = phoneme_alignment_data.get("phonemes", [])
            phoneme_result = PipelinePhonemeResult(
                phonemes=[
                    PhonemeDetailOut(
                        target=p.get("target", ""),
                        actual=p.get("actual", ""),
                        score=p.get("score", 0.0),
                        issue=p.get("issue"),
                    )
                    for p in phonemes_raw
                ],
                phoneme_accuracy_score=row.get("phoneme_accuracy_score") or 0.0,
                latency_ms=phoneme_alignment_data.get(
                    "phoneme_latency_ms", 0
                ),
            )

            multimodal_result = PipelineMultimodalResult(
                prosody_score=row.get("prosody_score") or 0.0,
                fluency_score=row.get("fluency_score") or 0.0,
                overall_score=row.get("overall_score") or 0.0,
                improvement_suggestions_es=(
                    improvement_data.get("suggestions", [])
                    if isinstance(improvement_data, dict)
                    else improvement_data
                    if isinstance(improvement_data, list)
                    else []
                ),
                latency_ms=phoneme_alignment_data.get(
                    "gemini_latency_ms", 0
                ),
            )

            pipeline_results = PipelineResults(
                stt=stt_result,
                phoneme_alignment=phoneme_result,
                multimodal_evaluation=multimodal_result,
            )

            total_latency_ms = (
                stt_result.latency_ms
                + phoneme_result.latency_ms
                + multimodal_result.latency_ms
            )

        return {
            "data": EvaluationDetailResponse(
                evaluation_id=str(row["id"]),
                status=row["status"],
                target_text=row["target_text"],
                transcription=row.get("transcription"),
                pipeline_results=pipeline_results,
                total_latency_ms=total_latency_ms,
                xp_awarded=15 if row["status"] == "completed" else None,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get evaluation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve evaluation.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /history -- User's pronunciation history with pagination
# ---------------------------------------------------------------------------


@router.get(
    "/history",
    response_model=dict[str, HistoryResponse],
)
async def get_history(
    request: Request,
    limit: int = Query(
        default=10, ge=1, le=50, description="Page size"
    ),
    offset: int = Query(
        default=0, ge=0, description="Pagination offset"
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """List past pronunciation attempts for the authenticated user."""
    supabase = _get_supabase(request)

    try:
        # Fetch with count
        result = await (
            supabase.table("pronunciation_scores")
            .select(
                "id, target_text, overall_score, phoneme_accuracy_score, created_at",
                count="exact",
            )
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        rows = result.data or []
        total = result.count if result.count is not None else len(rows)

        attempts = [
            HistoryAttempt(
                id=str(row["id"]),
                target_text=row["target_text"],
                overall_score=row.get("overall_score"),
                phoneme_accuracy_score=row.get("phoneme_accuracy_score"),
                created_at=row["created_at"],
            )
            for row in rows
        ]

        return {
            "data": HistoryResponse(attempts=attempts, total=total)
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get pronunciation history")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pronunciation history.",
        ) from exc
