"""Writing evaluation worker job.

Receives a writing evaluation ID, fetches the submission from the database,
calls Gemini Pro for structured CEFR evaluation (grammar, vocabulary,
coherence, task_completion scores), and stores results with status update.

Registered as the ``writing_eval`` job type in the worker registry.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from services.shared.ai.gemini import GeminiClient
from services.shared.ai.schemas import WritingEvaluation
from services.worker.src.config import get_worker_settings
from services.worker.src.main import register_job

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _fetch_evaluation(
    supabase_admin: Any, evaluation_id: str
) -> dict[str, Any] | None:
    """Fetch a writing evaluation row by ID using the service-role client."""
    result = await (
        supabase_admin.table("writing_evaluations")
        .select("*")
        .eq("id", evaluation_id)
        .execute()
    )
    rows = result.data or []
    return rows[0] if rows else None


async def _update_status(
    supabase_admin: Any,
    evaluation_id: str,
    status: str,
    extra: dict[str, Any] | None = None,
) -> None:
    """Update the status (and optional extra fields) on a writing evaluation."""
    data: dict[str, Any] = {"status": status}
    if extra:
        data.update(extra)

    await (
        supabase_admin.table("writing_evaluations")
        .update(data)
        .eq("id", evaluation_id)
        .execute()
    )


# ---------------------------------------------------------------------------
# Job handler
# ---------------------------------------------------------------------------


@register_job("writing_eval")
async def handle_writing_eval(
    supabase_admin: Any, payload: dict[str, Any]
) -> None:
    """Evaluate a writing submission using Gemini Pro.

    Expected payload keys:
    - ``evaluation_id`` (str): The UUID of the writing_evaluations row.
    """
    evaluation_id = payload.get("evaluation_id")

    if not evaluation_id:
        logger.error("writing_eval: missing evaluation_id in payload")
        return

    logger.info("Starting writing evaluation for id=%s", evaluation_id)

    # 1. Fetch the submission from the database
    evaluation = await _fetch_evaluation(supabase_admin, evaluation_id)

    if evaluation is None:
        logger.error(
            "writing_eval: evaluation %s not found in database",
            evaluation_id,
        )
        return

    current_status = evaluation.get("status", "pending")
    if current_status not in ("pending", "processing"):
        logger.info(
            "writing_eval: evaluation %s already has status=%s, skipping.",
            evaluation_id,
            current_status,
        )
        return

    # 2. Update status to 'processing'
    await _update_status(supabase_admin, evaluation_id, "processing")

    # 3. Extract fields needed for evaluation
    submitted_text: str = evaluation.get("submitted_text", "")
    prompt_text: str = evaluation.get("prompt_text", "")
    cefr_level: str = evaluation.get("cefr_level", "A1")

    if not submitted_text.strip():
        logger.warning(
            "writing_eval: evaluation %s has empty submitted_text, marking failed.",
            evaluation_id,
        )
        await _update_status(
            supabase_admin,
            evaluation_id,
            "failed",
            {"feedback_es": "El texto enviado esta vacio."},
        )
        return

    # 4. Call Gemini Pro for structured CEFR evaluation
    settings = get_worker_settings()
    gemini = GeminiClient(api_key=settings.GOOGLE_GEMINI_API_KEY)

    try:
        result: WritingEvaluation = await gemini.evaluate_writing(
            text=submitted_text,
            cefr_level=cefr_level,
            prompt=prompt_text,
        )
    except Exception:
        logger.exception(
            "Gemini writing evaluation failed for id=%s", evaluation_id
        )
        await _update_status(
            supabase_admin,
            evaluation_id,
            "failed",
            {
                "feedback_es": (
                    "La evaluacion no se pudo completar en este momento. "
                    "Por favor intenta de nuevo mas tarde."
                ),
                "completed_at": datetime.now(UTC).isoformat(),
            },
        )
        return

    # 5. Store results and update status to 'completed'
    now = datetime.now(UTC).isoformat()

    # Build the evaluation_json with full detail data
    evaluation_json: dict[str, Any] = {
        "grammar_score": result.grammar_score,
        "vocabulary_score": result.vocabulary_score,
        "coherence_score": result.coherence_score,
        "task_completion_score": result.task_completion_score,
        "overall_cefr": result.overall_cefr,
        "feedback_es": result.feedback_es,
        "details": [
            {
                "position": d.position,
                "error_type": d.error_type,
                "original": d.original,
                "correction": d.correction,
                "explanation_es": d.explanation_es,
            }
            for d in result.details
        ],
    }

    update_data: dict[str, Any] = {
        "grammar_score": result.grammar_score,
        "vocabulary_score": result.vocabulary_score,
        "coherence_score": result.coherence_score,
        "task_completion_score": result.task_completion_score,
        "overall_cefr_score": result.overall_cefr,
        "feedback_es": result.feedback_es,
        "evaluation_json": evaluation_json,
        "ai_platform": "gemini",
        "completed_at": now,
    }

    await _update_status(
        supabase_admin, evaluation_id, "completed", update_data
    )

    logger.info(
        "Writing evaluation completed for id=%s: grammar=%.2f vocab=%.2f "
        "coherence=%.2f task=%.2f overall_cefr=%s",
        evaluation_id,
        result.grammar_score,
        result.vocabulary_score,
        result.coherence_score,
        result.task_completion_score,
        result.overall_cefr,
    )
