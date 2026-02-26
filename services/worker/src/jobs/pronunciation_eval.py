"""Pronunciation evaluation worker job -- 3-stage AI pipeline.

Processes pronunciation recordings through:

1. **Whisper STT** -- Transcribe the learner's audio to text using the
   HuggingFace Whisper endpoint.
2. **Wav2Vec2 phoneme alignment** -- Compare phoneme-level pronunciations
   against the target text.
3. **Gemini Flash multimodal** -- Evaluate prosody, fluency, and overall
   pronunciation quality using the audio and transcription.

Status transitions:
  pending -> processing -> completed | failed

Registered as the ``pronunciation_eval`` job type in the worker registry.
"""

from __future__ import annotations

import logging
import time
from datetime import UTC, datetime
from typing import Any

from services.shared.ai.gemini import GeminiClient
from services.shared.ai.huggingface import HuggingFaceClient
from services.worker.src.config import get_worker_settings
from services.worker.src.main import register_job

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _resolve_audio_url(
    supabase_admin: Any, storage_path: str
) -> str:
    """Generate a signed URL for a Supabase Storage audio file.

    The signed URL is valid for 1 hour -- long enough for the entire
    evaluation pipeline to complete.
    """
    try:
        result = supabase_admin.storage.from_("audio").create_signed_url(
            storage_path, expires_in=3600
        )
        if isinstance(result, dict):
            return str(result.get("signedURL") or result.get("signed_url", ""))
        if hasattr(result, "data"):
            data = result.data
            if isinstance(data, dict):
                return str(data.get("signedURL", ""))
            return str(getattr(data, "signed_url", ""))
        return str(result)
    except Exception:
        logger.exception("Failed to create signed URL for %s", storage_path)
        raise


async def _update_status(
    supabase_admin: Any,
    evaluation_id: str,
    status_val: str,
    extra_fields: dict[str, Any] | None = None,
) -> None:
    """Update the pronunciation_scores row status and optional extra fields."""
    update_data: dict[str, Any] = {"status": status_val}
    if extra_fields:
        update_data.update(extra_fields)
    if status_val in ("completed", "failed"):
        update_data["completed_at"] = datetime.now(UTC).isoformat()

    await (
        supabase_admin.table("pronunciation_scores")
        .update(update_data)
        .eq("id", evaluation_id)
        .execute()
    )


# ---------------------------------------------------------------------------
# Stage 1: Whisper STT
# ---------------------------------------------------------------------------


async def _stage_whisper_stt(
    hf_client: HuggingFaceClient, audio_url: str
) -> dict[str, Any]:
    """Transcribe audio using Whisper and return the result with timing."""
    start = time.monotonic()
    try:
        transcription = await hf_client.transcribe(audio_url)
        latency_ms = int((time.monotonic() - start) * 1000)
        logger.info(
            "Whisper STT completed in %dms: %s",
            latency_ms,
            transcription[:80],
        )
        return {
            "transcription": transcription,
            "confidence": 0.90,  # Whisper does not expose per-segment confidence
            "latency_ms": latency_ms,
        }
    except Exception:
        latency_ms = int((time.monotonic() - start) * 1000)
        logger.exception("Whisper STT failed after %dms", latency_ms)
        raise


# ---------------------------------------------------------------------------
# Stage 2: Wav2Vec2 phoneme alignment
# ---------------------------------------------------------------------------


async def _stage_phoneme_alignment(
    hf_client: HuggingFaceClient,
    audio_url: str,
    target_text: str,
) -> dict[str, Any]:
    """Align phonemes from the learner audio against the target text.

    Returns per-phoneme accuracy breakdown and an aggregate score.
    """
    start = time.monotonic()
    try:
        alignment = await hf_client.align_phonemes(audio_url, target_text)
        latency_ms = int((time.monotonic() - start) * 1000)

        phonemes_data = []
        total_score = 0.0
        for p in alignment.phonemes:
            phonemes_data.append({
                "target": p.expected,
                "actual": p.actual,
                "score": p.score,
                "timestamp_start": p.timestamp_start,
                "timestamp_end": p.timestamp_end,
            })
            total_score += p.score

        phoneme_accuracy = (
            total_score / len(alignment.phonemes)
            if alignment.phonemes
            else 0.0
        )

        logger.info(
            "Wav2Vec2 phoneme alignment completed in %dms: "
            "%d phonemes, accuracy=%.2f",
            latency_ms,
            len(phonemes_data),
            phoneme_accuracy,
        )

        return {
            "phonemes": phonemes_data,
            "phoneme_accuracy_score": round(phoneme_accuracy, 4),
            "latency_ms": latency_ms,
        }
    except Exception:
        latency_ms = int((time.monotonic() - start) * 1000)
        logger.exception(
            "Wav2Vec2 phoneme alignment failed after %dms", latency_ms
        )
        raise


# ---------------------------------------------------------------------------
# Stage 3: Gemini Flash multimodal evaluation
# ---------------------------------------------------------------------------


async def _stage_gemini_multimodal(
    gemini_client: GeminiClient,
    audio_url: str,
    target_text: str,
) -> dict[str, Any]:
    """Evaluate prosody, fluency, and overall quality using Gemini Flash.

    Gemini receives both the audio file and the target text for a holistic
    pronunciation assessment.
    """
    start = time.monotonic()
    try:
        evaluation = await gemini_client.evaluate_pronunciation(
            audio_url, target_text
        )
        latency_ms = int((time.monotonic() - start) * 1000)

        logger.info(
            "Gemini multimodal evaluation completed in %dms: "
            "prosody=%.2f fluency=%.2f overall=%.2f",
            latency_ms,
            evaluation.prosody_score,
            evaluation.fluency_score,
            evaluation.overall_score,
        )

        return {
            "prosody_score": evaluation.prosody_score,
            "fluency_score": evaluation.fluency_score,
            "overall_score": evaluation.overall_score,
            "suggestions": evaluation.suggestions,
            "latency_ms": latency_ms,
        }
    except Exception:
        latency_ms = int((time.monotonic() - start) * 1000)
        logger.exception(
            "Gemini multimodal evaluation failed after %dms", latency_ms
        )
        raise


# ---------------------------------------------------------------------------
# Job handler
# ---------------------------------------------------------------------------


@register_job("pronunciation_eval")
async def handle_pronunciation_eval(
    supabase_admin: Any, payload: dict[str, Any]
) -> None:
    """Execute the 3-stage pronunciation evaluation pipeline.

    Expected payload keys:
    - ``evaluation_id`` (str): UUID of the pronunciation_scores row.
    - ``user_id`` (str): The user UUID.
    - ``target_text`` (str): The expected French text.
    - ``audio_storage_path`` (str): Path in Supabase Storage bucket.
    """
    evaluation_id = payload.get("evaluation_id")
    user_id = payload.get("user_id")
    target_text = payload.get("target_text", "")
    audio_storage_path = payload.get("audio_storage_path", "")

    if not evaluation_id or not user_id or not audio_storage_path:
        logger.error(
            "pronunciation_eval: missing required fields in payload: %s",
            payload,
        )
        return

    logger.info(
        "Starting pronunciation evaluation pipeline: "
        "evaluation_id=%s user_id=%s",
        evaluation_id,
        user_id,
    )

    # Mark as processing
    await _update_status(supabase_admin, evaluation_id, "processing")

    # Initialize AI clients
    settings = get_worker_settings()
    hf_client = HuggingFaceClient(
        api_token=settings.HF_API_TOKEN,
        whisper_endpoint=settings.HF_INFERENCE_ENDPOINT_WHISPER,
    )
    gemini_client = GeminiClient(api_key=settings.GOOGLE_GEMINI_API_KEY)

    # Resolve audio URL from Supabase Storage
    try:
        audio_url = await _resolve_audio_url(
            supabase_admin, audio_storage_path
        )
    except Exception:
        await _update_status(supabase_admin, evaluation_id, "failed")
        logger.error(
            "Could not resolve audio URL for evaluation %s", evaluation_id
        )
        return

    # ---- Stage 1: Whisper STT ----
    try:
        stt_result = await _stage_whisper_stt(hf_client, audio_url)
    except Exception:
        await _update_status(
            supabase_admin,
            evaluation_id,
            "failed",
            {"transcription": None},
        )
        return

    # ---- Stage 2: Wav2Vec2 phoneme alignment ----
    try:
        phoneme_result = await _stage_phoneme_alignment(
            hf_client, audio_url, target_text
        )
    except Exception:
        # Partial failure: save STT result but mark as failed
        await _update_status(
            supabase_admin,
            evaluation_id,
            "failed",
            {"transcription": stt_result["transcription"]},
        )
        return

    # ---- Stage 3: Gemini multimodal evaluation ----
    try:
        gemini_result = await _stage_gemini_multimodal(
            gemini_client, audio_url, target_text
        )
    except Exception:
        # Partial failure: save STT + phoneme results but mark as failed
        await _update_status(
            supabase_admin,
            evaluation_id,
            "failed",
            {
                "transcription": stt_result["transcription"],
                "phoneme_alignment": {
                    "phonemes": phoneme_result["phonemes"],
                    "stt_confidence": stt_result["confidence"],
                    "stt_latency_ms": stt_result["latency_ms"],
                    "phoneme_latency_ms": phoneme_result["latency_ms"],
                },
                "phoneme_accuracy_score": phoneme_result[
                    "phoneme_accuracy_score"
                ],
            },
        )
        return

    # ---- All stages complete: save full results ----
    phoneme_alignment_json = {
        "phonemes": phoneme_result["phonemes"],
        "stt_confidence": stt_result["confidence"],
        "stt_latency_ms": stt_result["latency_ms"],
        "phoneme_latency_ms": phoneme_result["latency_ms"],
        "gemini_latency_ms": gemini_result["latency_ms"],
    }

    improvement_suggestions_json = {
        "suggestions": gemini_result["suggestions"],
    }

    await _update_status(
        supabase_admin,
        evaluation_id,
        "completed",
        {
            "transcription": stt_result["transcription"],
            "phoneme_alignment": phoneme_alignment_json,
            "phoneme_accuracy_score": phoneme_result[
                "phoneme_accuracy_score"
            ],
            "prosody_score": gemini_result["prosody_score"],
            "fluency_score": gemini_result["fluency_score"],
            "overall_score": gemini_result["overall_score"],
            "improvement_suggestions": improvement_suggestions_json,
        },
    )

    total_latency = (
        stt_result["latency_ms"]
        + phoneme_result["latency_ms"]
        + gemini_result["latency_ms"]
    )

    logger.info(
        "Pronunciation evaluation completed: evaluation_id=%s "
        "overall_score=%.2f total_latency=%dms",
        evaluation_id,
        gemini_result["overall_score"],
        total_latency,
    )

    # ---- Log AI model usage ----
    try:
        log_entries = [
            {
                "session_id": evaluation_id,
                "user_id": user_id,
                "platform": "huggingface",
                "model_name": "whisper-large-v3-turbo",
                "task_type": "stt",
                "latency_ms": stt_result["latency_ms"],
                "success": True,
                "is_fallback": False,
            },
            {
                "session_id": evaluation_id,
                "user_id": user_id,
                "platform": "huggingface",
                "model_name": "wav2vec2-large-xlsr-53-french",
                "task_type": "phoneme_alignment",
                "latency_ms": phoneme_result["latency_ms"],
                "success": True,
                "is_fallback": False,
            },
            {
                "session_id": evaluation_id,
                "user_id": user_id,
                "platform": "gemini",
                "model_name": "gemini-2.0-flash",
                "task_type": "pronunciation_analysis",
                "latency_ms": gemini_result["latency_ms"],
                "success": True,
                "is_fallback": False,
            },
        ]

        for entry in log_entries:
            await (
                supabase_admin.table("ai_model_usage_logs")
                .insert(entry)
                .execute()
            )
    except Exception:
        # AI usage logging is non-critical; do not fail the job
        logger.warning(
            "Failed to log AI model usage for evaluation %s",
            evaluation_id,
        )
