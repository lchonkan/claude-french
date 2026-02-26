"""Difficulty recalibration worker job.

Fetches a user's mastery data and error patterns, sends them to Gemini Flash
for analysis, and updates exercise difficulty tiers accordingly.

Registered as the ``difficulty_recalibration`` job type in the worker registry.
"""

from __future__ import annotations

import logging
from typing import Any

from services.shared.ai.gemini import GeminiClient
from services.shared.ai.schemas import DifficultyAdjustment
from services.worker.src.config import get_worker_settings
from services.worker.src.main import register_job

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _fetch_mastery_data(
    supabase_admin: Any, user_id: str, skill: str
) -> list[dict[str, Any]]:
    """Fetch skill_mastery rows for a user, optionally filtered by skill."""
    query = (
        supabase_admin.table("skill_mastery")
        .select("*")
        .eq("user_id", user_id)
    )
    if skill and skill != "all":
        query = query.eq("skill", skill)

    result = await query.execute()
    return result.data or []


async def _fetch_error_patterns(
    supabase_admin: Any, user_id: str, skill: str
) -> list[dict[str, Any]]:
    """Fetch error_patterns for a user, optionally filtered by error type.

    When skill is ``"grammar"`` we filter by ``error_type = 'grammar'``, etc.
    """
    query = (
        supabase_admin.table("error_patterns")
        .select("*")
        .eq("user_id", user_id)
        .order("occurrence_count", desc=True)
        .limit(50)
    )
    # Map skill to error_type_enum values
    skill_error_map = {
        "grammar": "grammar",
        "vocabulary": "vocabulary",
        "pronunciation": "pronunciation",
        "writing": "spelling",
    }
    error_type = skill_error_map.get(skill)
    if error_type:
        query = query.eq("error_type", error_type)

    result = await query.execute()
    return result.data or []


async def _update_exercise_difficulty(
    supabase_admin: Any,
    skill: str,
    current_tier: int,
    new_tier: int,
) -> int:
    """Update difficulty_tier on lesson_exercises for a given skill.

    Only updates exercises that match the current tier for the corresponding
    module.  Returns the number of rows updated.
    """
    # Map skill to module name
    module = skill if skill != "conversation" else "conversation"

    # Fetch matching exercises
    result = await (
        supabase_admin.table("lesson_exercises")
        .select("id, lesson_id, difficulty_tier")
        .eq("difficulty_tier", current_tier)
        .execute()
    )

    exercises = result.data or []

    # Filter to exercises that belong to lessons of the matching module
    if not exercises:
        return 0

    lesson_ids = list({ex["lesson_id"] for ex in exercises})
    lessons_result = await (
        supabase_admin.table("lessons")
        .select("id, module")
        .in_("id", lesson_ids)
        .eq("module", module)
        .execute()
    )
    matching_lesson_ids = {
        row["id"] for row in (lessons_result.data or [])
    }

    # Update only exercises in matching lessons
    updated = 0
    for ex in exercises:
        if ex["lesson_id"] in matching_lesson_ids:
            await (
                supabase_admin.table("lesson_exercises")
                .update({"difficulty_tier": new_tier})
                .eq("id", ex["id"])
                .execute()
            )
            updated += 1

    return updated


# ---------------------------------------------------------------------------
# Job handler
# ---------------------------------------------------------------------------


@register_job("difficulty_recalibration")
async def handle_difficulty_recalibration(
    supabase_admin: Any, payload: dict[str, Any]
) -> None:
    """Recalibrate exercise difficulty for a user.

    Expected payload keys:
    - ``user_id`` (str): The user UUID.
    - ``skill`` (str): The skill to recalibrate (e.g. ``"grammar"``),
      or ``"all"`` for all skills.
    """
    user_id = payload.get("user_id")
    skill = payload.get("skill", "all")

    if not user_id:
        logger.error("difficulty_recalibration: missing user_id in payload")
        return

    logger.info(
        "Starting difficulty recalibration for user=%s skill=%s",
        user_id,
        skill,
    )

    # 1. Fetch mastery data
    mastery_rows = await _fetch_mastery_data(
        supabase_admin, user_id, skill
    )
    if not mastery_rows:
        logger.info(
            "No mastery data found for user=%s skill=%s, skipping.",
            user_id,
            skill,
        )
        return

    # 2. Fetch error patterns
    error_rows = await _fetch_error_patterns(
        supabase_admin, user_id, skill
    )

    # 3. Build analysis payload for Gemini
    mastery_summary = []
    for row in mastery_rows:
        mastery_summary.append(
            {
                "skill": row.get("skill"),
                "cefr_level": row.get("cefr_level"),
                "mastery_percentage": row.get("mastery_percentage"),
                "total_exercises": row.get("total_exercises"),
                "total_correct": row.get("total_correct"),
                "recent_results": (
                    row.get("exercise_results", [])[-10:]
                ),
            }
        )

    error_summary = []
    for row in error_rows:
        error_summary.append(
            {
                "error_type": row.get("error_type"),
                "error_category": row.get("error_category"),
                "cefr_level": row.get("cefr_level"),
                "occurrence_count": row.get("occurrence_count"),
                "last_occurrence_at": row.get("last_occurrence_at"),
            }
        )

    analysis_data = {
        "user_id": user_id,
        "mastery": mastery_summary,
        "error_patterns": error_summary,
    }

    # 4. Call Gemini Flash for analysis
    settings = get_worker_settings()
    gemini = GeminiClient(api_key=settings.GOOGLE_GEMINI_API_KEY)

    try:
        adjustment: DifficultyAdjustment = (
            await gemini.recalibrate_difficulty(analysis_data)
        )
    except Exception:
        logger.exception(
            "Gemini recalibration failed for user=%s", user_id
        )
        return

    # 5. Apply recommended adjustments
    if not adjustment.adjustments:
        logger.info(
            "No difficulty adjustments recommended for user=%s",
            user_id,
        )
        return

    for adj in adjustment.adjustments:
        if adj.current_difficulty == adj.recommended_difficulty:
            continue

        updated = await _update_exercise_difficulty(
            supabase_admin,
            adj.skill,
            adj.current_difficulty,
            adj.recommended_difficulty,
        )

        logger.info(
            "Updated %d exercises for skill=%s: tier %d -> %d (reason: %s)",
            updated,
            adj.skill,
            adj.current_difficulty,
            adj.recommended_difficulty,
            adj.reason,
        )

    logger.info(
        "Difficulty recalibration complete for user=%s: %d adjustments applied.",
        user_id,
        len(adjustment.adjustments),
    )
