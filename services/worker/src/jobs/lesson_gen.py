"""Lesson generation worker job (T129).

Uses Gemini Flash to generate lesson content and exercises, then inserts
them into the ``lessons`` and ``lesson_exercises`` tables in Supabase.

Registered as the ``lesson_generation`` job type in the worker registry.

Expected payload:
    - ``module`` (str): One of the module_enum values (vocabulary, grammar, etc.)
    - ``cefr_level`` (str): CEFR level (A1, A2, B1, B2, C1, C2)
    - ``topic`` (str): Topic or grammar point for the lesson

The worker:
1. Calls Gemini Flash to generate structured lesson content
2. Determines the next order_index for the module/level combination
3. Inserts the lesson row into the ``lessons`` table
4. Inserts each exercise into the ``lesson_exercises`` table
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from services.shared.ai.gemini import GeminiClient
from services.shared.ai.schemas import LessonContent
from services.worker.src.config import get_worker_settings
from services.worker.src.main import register_job

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Exercise type mapping
# ---------------------------------------------------------------------------

# Map from Gemini-generated exercise type strings to the DB enum values
_EXERCISE_TYPE_MAP: dict[str, str] = {
    "fill_blank": "fill_blank",
    "fill_in_the_blank": "fill_blank",
    "fill-blank": "fill_blank",
    "multiple_choice": "multiple_choice",
    "multiple-choice": "multiple_choice",
    "reorder": "reorder",
    "sentence_reorder": "reorder",
    "conjugate": "conjugate",
    "conjugation": "conjugate",
    "error_correct": "error_correct",
    "error_correction": "error_correct",
    "open_ended": "open_ended",
    "open-ended": "open_ended",
}


def _normalize_exercise_type(raw: str) -> str:
    """Normalize an exercise type string to a valid DB enum value."""
    normalized = raw.strip().lower().replace(" ", "_")
    return _EXERCISE_TYPE_MAP.get(normalized, "multiple_choice")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_next_order_index(
    supabase_admin: Any, module: str, cefr_level: str
) -> int:
    """Determine the next available order_index for a module/level pair."""
    result = await (
        supabase_admin.table("lessons")
        .select("order_index")
        .eq("module", module)
        .eq("cefr_level", cefr_level)
        .order("order_index", desc=True)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if rows:
        return int(rows[0]["order_index"]) + 1
    return 1


# ---------------------------------------------------------------------------
# Job handler
# ---------------------------------------------------------------------------


@register_job("lesson_generation")
async def handle_lesson_generation(
    supabase_admin: Any, payload: dict[str, Any]
) -> None:
    """Generate a lesson using Gemini Flash and store it in the database.

    Expected payload keys:
    - ``module`` (str): Module type (vocabulary, grammar, writing, etc.)
    - ``cefr_level`` (str): CEFR level (A1, A2, B1, B2, C1, C2)
    - ``topic`` (str): Topic or grammar point for the lesson
    """
    module = payload.get("module")
    cefr_level = payload.get("cefr_level")
    topic = payload.get("topic")

    if not all([module, cefr_level, topic]):
        logger.error(
            "lesson_generation: missing required fields in payload. "
            "Expected module, cefr_level, topic. Got: %s",
            list(payload.keys()),
        )
        return

    logger.info(
        "Starting lesson generation: module=%s, level=%s, topic=%s",
        module,
        cefr_level,
        topic,
    )

    # 1. Call Gemini Flash to generate the lesson
    settings = get_worker_settings()
    gemini = GeminiClient(api_key=settings.GOOGLE_GEMINI_API_KEY)

    try:
        lesson_content: LessonContent = await gemini.generate_lesson(
            module=module,
            cefr_level=cefr_level,
            topic=topic,
        )
    except Exception:
        logger.exception(
            "Gemini lesson generation failed for module=%s, level=%s, topic=%s",
            module,
            cefr_level,
            topic,
        )
        return

    # 2. Determine the next order index
    try:
        order_index = await _get_next_order_index(
            supabase_admin, module, cefr_level
        )
    except Exception:
        logger.exception("Failed to determine next order_index")
        order_index = 1

    # 3. Insert the lesson row
    now = datetime.now(UTC).isoformat()

    lesson_data: dict[str, Any] = {
        "module": module,
        "cefr_level": cefr_level,
        "title_es": lesson_content.title_es,
        "title_fr": lesson_content.title_fr,
        "description_es": lesson_content.description_es,
        "content": (
            lesson_content.content
            if isinstance(lesson_content.content, dict)
            else {"raw": str(lesson_content.content)}
        ),
        "order_index": order_index,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    try:
        lesson_result = await (
            supabase_admin.table("lessons")
            .insert(lesson_data)
            .execute()
        )
        if not lesson_result.data:
            logger.error("Failed to insert lesson: no data returned.")
            return
        lesson_row = lesson_result.data[0]
        lesson_id = lesson_row["id"]
    except Exception:
        logger.exception("Failed to insert lesson into database")
        return

    logger.info(
        "Lesson created: id=%s, title_fr=%s, title_es=%s",
        lesson_id,
        lesson_content.title_fr,
        lesson_content.title_es,
    )

    # 4. Insert exercises
    exercises = lesson_content.exercises or []
    inserted_count = 0

    for idx, exercise in enumerate(exercises):
        # Handle both dict and object exercise formats
        if isinstance(exercise, dict):
            ex_type = exercise.get("type", "multiple_choice")
            prompt_es = exercise.get("prompt_es", "")
            ex_content = {
                k: v
                for k, v in exercise.items()
                if k not in ("type", "prompt_es")
            }
        else:
            ex_type = getattr(exercise, "type", "multiple_choice")
            prompt_es = getattr(exercise, "prompt_es", "")
            ex_content = (
                exercise.__dict__
                if hasattr(exercise, "__dict__")
                else {"raw": str(exercise)}
            )

        exercise_data: dict[str, Any] = {
            "lesson_id": lesson_id,
            "exercise_type": _normalize_exercise_type(str(ex_type)),
            "prompt_es": prompt_es or f"Ejercicio {idx + 1}",
            "content": ex_content,
            "difficulty_tier": min(max((idx // 2) + 1, 1), 3),
            "order_index": idx + 1,
        }

        try:
            await (
                supabase_admin.table("lesson_exercises")
                .insert(exercise_data)
                .execute()
            )
            inserted_count += 1
        except Exception:
            logger.exception(
                "Failed to insert exercise %d for lesson %s",
                idx + 1,
                lesson_id,
            )

    logger.info(
        "Lesson generation complete: lesson_id=%s, exercises=%d/%d inserted.",
        lesson_id,
        inserted_count,
        len(exercises),
    )
