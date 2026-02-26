# ruff: noqa: B008
"""Lessons API routes for the French Learning Platform.

Endpoints:
- GET  /                                  -- List lessons by module and level
- GET  /{lesson_id}                       -- Get lesson with exercises
- POST /{lesson_id}/exercises/{eid}/submit -- Submit exercise answer
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from services.api.src.middleware.auth import UserInfo, get_current_user
from services.shared.models.lesson import (
    ExerciseType,
    Lesson,
    LessonExercise,
    Module,
)
from services.shared.models.vocabulary import CEFRLevel

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class LessonSummary(BaseModel):
    """Lesson summary returned in list endpoints."""

    id: UUID
    module: Module
    cefr_level: CEFRLevel
    title_es: str
    title_fr: str
    description_es: str | None = None
    order_index: int
    exercise_count: int = 0


class LessonListResponse(BaseModel):
    """Paginated list of lesson summaries."""

    lessons: list[LessonSummary]
    total: int


class LessonDetailResponse(BaseModel):
    """Full lesson with exercises."""

    id: UUID
    module: Module
    cefr_level: CEFRLevel
    title_es: str
    title_fr: str
    description_es: str | None = None
    content: dict[str, Any]
    order_index: int
    exercises: list[LessonExercise]


class ExerciseSubmitRequest(BaseModel):
    """Client request submitting an answer."""

    answer: str | list[str] | dict[str, Any] = Field(
        description="User's answer in the format expected by the exercise type"
    )


class MasteryUpdate(BaseModel):
    """Mastery change returned after exercise submission."""

    skill: str
    new_mastery_percentage: float


class ExerciseSubmitResponse(BaseModel):
    """Server response after evaluating an exercise submission."""

    correct: bool
    user_answer: str | list[str] | dict[str, Any] | None = None
    correct_answer: str | None = None
    feedback_es: str
    error_type: str | None = None
    error_category: str | None = None
    xp_awarded: int = 0
    mastery_update: MasteryUpdate | None = None


# ---------------------------------------------------------------------------
# Helpers
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
    """Extract the service-role Supabase client for privileged writes."""
    supabase_admin = getattr(request.app.state, "supabase_admin", None)
    if supabase_admin is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin database client not available.",
        )
    return supabase_admin


# ---------------------------------------------------------------------------
# Exercise evaluation helpers
# ---------------------------------------------------------------------------


def _normalize(value: str) -> str:
    """Normalize a string for comparison: strip, lowercase."""
    return value.strip().lower()


def _check_answer(
    exercise_type: str,
    content: dict[str, Any],
    answer: str | list[str] | dict[str, Any],
) -> tuple[bool, str | None, str]:
    """Evaluate a user answer against the exercise content.

    Returns (is_correct, correct_answer_str, feedback_es).
    """
    if exercise_type == ExerciseType.FILL_BLANK:
        correct = str(content.get("correct_answer", ""))
        user_str = str(answer) if not isinstance(answer, dict) else ""
        is_correct = _normalize(user_str) == _normalize(correct)
        hint = content.get("hint", "")

        if is_correct:
            feedback = f"Correcto! La respuesta es '{correct}'."
        else:
            feedback = (
                f"Incorrecto. La respuesta correcta es '{correct}'."
            )
            if hint:
                feedback += f" Pista: {hint}"
        return is_correct, correct, feedback

    elif exercise_type == ExerciseType.MULTIPLE_CHOICE:
        correct = str(content.get("correct_answer", ""))
        user_str = str(answer) if not isinstance(answer, dict) else ""
        is_correct = _normalize(user_str) == _normalize(correct)
        explanation = content.get("explanation_es", "")

        if is_correct:
            feedback = f"Correcto! {explanation}" if explanation else "Correcto!"
        else:
            feedback = f"Incorrecto. La respuesta correcta es '{correct}'."
            if explanation:
                feedback += f" {explanation}"
        return is_correct, correct, feedback

    elif exercise_type == ExerciseType.CONJUGATE:
        expected: dict[str, str] = content.get("expected", {})
        user_dict = answer if isinstance(answer, dict) else {}

        # Check each form
        correct_count = 0
        total = len(expected)
        mistakes: list[str] = []

        for pronoun, correct_form in expected.items():
            user_form = str(user_dict.get(pronoun, ""))
            if _normalize(user_form) == _normalize(correct_form):
                correct_count += 1
            else:
                mistakes.append(
                    f"'{pronoun}': esperado '{correct_form}', escribiste '{user_form}'"
                )

        is_correct = correct_count == total
        correct_str = ", ".join(
            f"{k}: {v}" for k, v in expected.items()
        )

        if is_correct:
            feedback = "Perfecto! Todas las conjugaciones son correctas."
        else:
            feedback = (
                f"Obtuviste {correct_count}/{total} correctas. "
                f"Errores: {'; '.join(mistakes[:3])}"
            )
        return is_correct, correct_str, feedback

    elif exercise_type == ExerciseType.ERROR_CORRECT:
        correct_word = str(content.get("correct_word", ""))
        user_str = str(answer) if not isinstance(answer, dict) else ""
        is_correct = _normalize(user_str) == _normalize(correct_word)
        explanation = content.get("explanation_es", "")
        error_word = content.get("error_word", "")

        if is_correct:
            feedback = f"Correcto! '{error_word}' debe ser '{correct_word}'."
            if explanation:
                feedback += f" {explanation}"
        else:
            feedback = (
                f"Incorrecto. El error era '{error_word}' "
                f"y la correccion es '{correct_word}'."
            )
            if explanation:
                feedback += f" {explanation}"
        return is_correct, correct_word, feedback

    elif exercise_type == ExerciseType.REORDER:
        correct_order: list[str] = content.get("correct_order", [])
        user_list = answer if isinstance(answer, list) else str(answer).split()
        is_correct = [_normalize(w) for w in user_list] == [
            _normalize(w) for w in correct_order
        ]
        correct_str = " ".join(correct_order)

        if is_correct:
            feedback = f"Correcto! La oracion es: {correct_str}"
        else:
            feedback = f"Incorrecto. El orden correcto es: {correct_str}"
        return is_correct, correct_str, feedback

    else:
        # Open-ended or unknown type: mark as correct with neutral feedback
        return True, None, "Respuesta registrada."


# ---------------------------------------------------------------------------
# Error pattern tracking
# ---------------------------------------------------------------------------


async def _track_error_pattern(
    supabase_admin: Any,
    user_id: str,
    exercise_type: str,
    content: dict[str, Any],
    cefr_level: str,
    user_answer: str | list[str] | dict[str, Any],
) -> None:
    """Upsert an error pattern record when a user answers incorrectly.

    Uses the service-role client to bypass RLS for the upsert.
    """
    try:
        # Determine error_type and error_category
        error_type = "grammar"  # Default for grammar exercises
        error_category = content.get("error_type", exercise_type)

        # For conjugation mistakes, refine the category
        if exercise_type == ExerciseType.CONJUGATE:
            error_category = "verb_conjugation"
        elif exercise_type == ExerciseType.ERROR_CORRECT:
            error_category = content.get(
                "error_type", "error_correction"
            )

        # Build example record
        example = {
            "user_answer": str(user_answer)[:200],
            "correct_answer": str(
                content.get(
                    "correct_answer",
                    content.get("correct_word", ""),
                )
            )[:200],
            "timestamp": datetime.now(UTC).isoformat(),
        }

        # Try to fetch existing pattern
        existing = await (
            supabase_admin.table("error_patterns")
            .select("id, occurrence_count, examples")
            .eq("user_id", user_id)
            .eq("error_type", error_type)
            .eq("error_category", error_category)
            .eq("cefr_level", cefr_level)
            .execute()
        )

        if existing.data:
            # Update: increment count, append example
            row = existing.data[0]
            examples = row.get("examples", [])
            # Keep last 10 examples
            examples.append(example)
            if len(examples) > 10:
                examples = examples[-10:]

            await (
                supabase_admin.table("error_patterns")
                .update(
                    {
                        "occurrence_count": int(
                            row["occurrence_count"]
                        )
                        + 1,
                        "last_occurrence_at": datetime.now(
                            UTC
                        ).isoformat(),
                        "examples": examples,
                    }
                )
                .eq("id", row["id"])
                .execute()
            )
        else:
            # Insert new pattern
            await (
                supabase_admin.table("error_patterns")
                .insert(
                    {
                        "user_id": user_id,
                        "error_type": error_type,
                        "error_category": error_category,
                        "cefr_level": cefr_level,
                        "occurrence_count": 1,
                        "last_occurrence_at": datetime.now(
                            UTC
                        ).isoformat(),
                        "examples": [example],
                    }
                )
                .execute()
            )
    except Exception:
        # Error tracking is non-critical; log and continue
        logger.exception("Failed to track error pattern")


# ---------------------------------------------------------------------------
# Mastery update helper
# ---------------------------------------------------------------------------


async def _update_mastery(
    supabase_admin: Any,
    user_id: str,
    skill: str,
    cefr_level: str,
    is_correct: bool,
    score: float,
) -> MasteryUpdate | None:
    """Update skill_mastery after an exercise attempt.

    Returns the mastery update record or None on failure.
    """
    try:
        result = await (
            supabase_admin.table("skill_mastery")
            .select("*")
            .eq("user_id", user_id)
            .eq("skill", skill)
            .eq("cefr_level", cefr_level)
            .execute()
        )

        now = datetime.now(UTC).isoformat()
        new_result = {"score": score, "timestamp": now}

        if result.data:
            row = result.data[0]
            total_ex = int(row["total_exercises"]) + 1
            total_correct = int(row["total_correct"]) + (
                1 if is_correct else 0
            )
            # Rolling mastery: weighted average of last results
            exercise_results = row.get("exercise_results", [])
            exercise_results.append(new_result)
            # Keep last 50 results
            if len(exercise_results) > 50:
                exercise_results = exercise_results[-50:]
            recent_scores = [
                r["score"] for r in exercise_results[-20:]
            ]
            mastery_pct = round(
                (sum(recent_scores) / len(recent_scores)) * 100, 1
            )

            await (
                supabase_admin.table("skill_mastery")
                .update(
                    {
                        "total_exercises": total_ex,
                        "total_correct": total_correct,
                        "mastery_percentage": mastery_pct,
                        "exercise_results": exercise_results,
                    }
                )
                .eq("id", row["id"])
                .execute()
            )
            return MasteryUpdate(
                skill=skill,
                new_mastery_percentage=mastery_pct,
            )
        else:
            # Create initial mastery record
            mastery_pct = 100.0 if is_correct else 0.0
            await (
                supabase_admin.table("skill_mastery")
                .insert(
                    {
                        "user_id": user_id,
                        "skill": skill,
                        "cefr_level": cefr_level,
                        "mastery_percentage": mastery_pct,
                        "total_exercises": 1,
                        "total_correct": 1 if is_correct else 0,
                        "exercise_results": [new_result],
                    }
                )
                .execute()
            )
            return MasteryUpdate(
                skill=skill,
                new_mastery_percentage=mastery_pct,
            )
    except Exception:
        logger.exception("Failed to update mastery")
        return None


# ---------------------------------------------------------------------------
# GET / -- List lessons
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=dict[str, LessonListResponse],
)
async def list_lessons(
    request: Request,
    module: Module = Query(
        ..., description="Module filter (grammar, vocabulary, ...)"
    ),
    cefr_level: CEFRLevel = Query(
        ..., description="CEFR level filter"
    ),
    limit: int = Query(
        default=20, ge=1, le=100, description="Page size"
    ),
    offset: int = Query(
        default=0, ge=0, description="Pagination offset"
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """List lessons for a given module and CEFR level, ordered by index."""
    supabase = _get_supabase(request)

    try:
        # Fetch lessons
        result = await (
            supabase.table("lessons")
            .select("*", count="exact")
            .eq("module", module.value)
            .eq("cefr_level", cefr_level.value)
            .eq("is_active", True)
            .order("order_index")
            .range(offset, offset + limit - 1)
            .execute()
        )

        lessons_data = result.data or []
        total = (
            result.count
            if result.count is not None
            else len(lessons_data)
        )

        # Get exercise counts per lesson
        lesson_ids = [row["id"] for row in lessons_data]
        exercise_counts: dict[str, int] = {}

        if lesson_ids:
            ex_result = await (
                supabase.table("lesson_exercises")
                .select("lesson_id", count="exact")
                .in_("lesson_id", lesson_ids)
                .execute()
            )
            # Count exercises per lesson from returned rows
            for row in ex_result.data or []:
                lid = row["lesson_id"]
                exercise_counts[lid] = exercise_counts.get(lid, 0) + 1

        summaries = [
            LessonSummary(
                id=row["id"],
                module=row["module"],
                cefr_level=row["cefr_level"],
                title_es=row["title_es"],
                title_fr=row["title_fr"],
                description_es=row.get("description_es"),
                order_index=row["order_index"],
                exercise_count=exercise_counts.get(row["id"], 0),
            )
            for row in lessons_data
        ]

        return {
            "data": LessonListResponse(
                lessons=summaries,
                total=total,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to list lessons")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve lessons.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /{lesson_id} -- Get lesson with exercises
# ---------------------------------------------------------------------------


@router.get(
    "/{lesson_id}",
    response_model=dict[str, LessonDetailResponse],
)
async def get_lesson(
    request: Request,
    lesson_id: UUID,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Get a single lesson with all its exercises."""
    supabase = _get_supabase(request)

    try:
        # Fetch lesson
        lesson_result = await (
            supabase.table("lessons")
            .select("*")
            .eq("id", str(lesson_id))
            .execute()
        )

        if not lesson_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lesson {lesson_id} not found.",
            )

        lesson_row = lesson_result.data[0]

        # Fetch exercises
        exercises_result = await (
            supabase.table("lesson_exercises")
            .select("*")
            .eq("lesson_id", str(lesson_id))
            .order("order_index")
            .execute()
        )

        exercises = [
            LessonExercise(
                id=row["id"],
                lesson_id=row["lesson_id"],
                exercise_type=row["exercise_type"],
                prompt_es=row["prompt_es"],
                content=row["content"],
                difficulty_tier=row["difficulty_tier"],
                order_index=row["order_index"],
            )
            for row in (exercises_result.data or [])
        ]

        return {
            "data": LessonDetailResponse(
                id=lesson_row["id"],
                module=lesson_row["module"],
                cefr_level=lesson_row["cefr_level"],
                title_es=lesson_row["title_es"],
                title_fr=lesson_row["title_fr"],
                description_es=lesson_row.get("description_es"),
                content=lesson_row.get("content", {}),
                order_index=lesson_row["order_index"],
                exercises=exercises,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get lesson")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve lesson.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /{lesson_id}/exercises/{exercise_id}/submit -- Submit answer
# ---------------------------------------------------------------------------


@router.post(
    "/{lesson_id}/exercises/{exercise_id}/submit",
    response_model=dict[str, ExerciseSubmitResponse],
)
async def submit_exercise(
    request: Request,
    lesson_id: UUID,
    exercise_id: UUID,
    body: ExerciseSubmitRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Submit an exercise answer, receive feedback, and track errors."""
    supabase = _get_supabase(request)
    supabase_admin = _get_supabase_admin(request)

    try:
        # Fetch exercise and verify it belongs to the lesson
        ex_result = await (
            supabase.table("lesson_exercises")
            .select("*")
            .eq("id", str(exercise_id))
            .eq("lesson_id", str(lesson_id))
            .execute()
        )

        if not ex_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Exercise {exercise_id} not found "
                    f"in lesson {lesson_id}."
                ),
            )

        exercise = ex_result.data[0]
        exercise_type = exercise["exercise_type"]
        content = exercise.get("content", {})

        # Fetch lesson to determine module and CEFR level
        lesson_result = await (
            supabase.table("lessons")
            .select("module, cefr_level")
            .eq("id", str(lesson_id))
            .execute()
        )
        lesson_data = (
            lesson_result.data[0] if lesson_result.data else {}
        )
        module = lesson_data.get("module", "grammar")
        cefr_level = lesson_data.get("cefr_level", "A1")

        # Determine skill from module
        skill = module if module != "cultural" else "vocabulary"

        # Check the answer
        is_correct, correct_answer, feedback_es = _check_answer(
            exercise_type, content, body.answer
        )

        # Score for mastery tracking
        score = 1.0 if is_correct else 0.0

        # XP: award 10 for correct, 0 for incorrect
        xp_awarded = 10 if is_correct else 0

        # Update mastery
        mastery_update = await _update_mastery(
            supabase_admin,
            user.id,
            skill,
            cefr_level,
            is_correct,
            score,
        )

        # Track error pattern on incorrect answers
        error_type_str: str | None = None
        error_category_str: str | None = None

        if not is_correct:
            error_type_str = "grammar"
            error_category_str = content.get(
                "error_type", exercise_type
            )
            await _track_error_pattern(
                supabase_admin,
                user.id,
                exercise_type,
                content,
                cefr_level,
                body.answer,
            )

        return {
            "data": ExerciseSubmitResponse(
                correct=is_correct,
                user_answer=body.answer if not is_correct else None,
                correct_answer=correct_answer,
                feedback_es=feedback_es,
                error_type=error_type_str,
                error_category=error_category_str,
                xp_awarded=xp_awarded,
                mastery_update=mastery_update,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to submit exercise")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process exercise submission.",
        ) from exc
