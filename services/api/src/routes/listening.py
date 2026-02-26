# ruff: noqa: B008
"""Listening Comprehension API routes for the French Learning Platform.

Endpoints:
- GET  /exercises                         -- List listening exercises by CEFR level
- GET  /exercises/{exercise_id}           -- Get exercise detail with questions
- POST /exercises/{exercise_id}/submit    -- Submit answers to comprehension questions
- POST /exercises/{exercise_id}/transcript -- Reveal transcript (tracked for analytics)
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from services.api.src.middleware.auth import UserInfo, get_current_user
from services.shared.models.lesson import ExerciseType, Module
from services.shared.models.vocabulary import CEFRLevel

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class ListeningExerciseSummary(BaseModel):
    """Summary of a listening exercise for list views."""

    id: UUID
    title_es: str
    title_fr: str
    description_es: str | None = None
    cefr_level: CEFRLevel
    order_index: int
    duration_seconds: int | None = None
    question_count: int = 0


class ListeningExerciseListResponse(BaseModel):
    """Paginated list of listening exercise summaries."""

    exercises: list[ListeningExerciseSummary]
    total: int


class AudioSegment(BaseModel):
    """A timed segment within a listening exercise audio."""

    id: str
    start: float
    end: float
    text_fr: str
    speaker: str | None = None


class ComprehensionQuestion(BaseModel):
    """A comprehension question for a listening exercise."""

    id: UUID
    question_fr: str
    question_es: str
    options: list[str]
    order_index: int
    difficulty_tier: int = 1


class ListeningExerciseDetailResponse(BaseModel):
    """Full listening exercise detail (without transcript by default)."""

    id: UUID
    title_es: str
    title_fr: str
    description_es: str | None = None
    cefr_level: CEFRLevel
    order_index: int
    audio_url: str
    duration_seconds: int | None = None
    segments: list[AudioSegment]
    questions: list[ComprehensionQuestion]


class AnswerSubmission(BaseModel):
    """A single question answer."""

    question_id: UUID
    answer: str


class SubmitAnswersRequest(BaseModel):
    """Client request submitting answers to comprehension questions."""

    answers: list[AnswerSubmission] = Field(
        min_length=1,
        description="List of answers to comprehension questions",
    )


class QuestionFeedback(BaseModel):
    """Feedback for a single question after submission."""

    question_id: UUID
    correct: bool
    user_answer: str
    correct_answer: str
    explanation_es: str


class MasteryUpdate(BaseModel):
    """Mastery change returned after exercise submission."""

    skill: str
    new_mastery_percentage: float


class SubmitAnswersResponse(BaseModel):
    """Server response after evaluating comprehension question submissions."""

    score: float = Field(
        ge=0.0, le=1.0, description="Score as fraction (correct / total)"
    )
    correct_count: int
    total_count: int
    feedback: list[QuestionFeedback]
    xp_awarded: int = 0
    mastery_update: MasteryUpdate | None = None


class TranscriptResponse(BaseModel):
    """Full transcript for a listening exercise."""

    exercise_id: UUID
    dialogue_text_fr: str
    dialogue_text_es: str
    segments: list[AudioSegment]


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
# Mastery update helper
# ---------------------------------------------------------------------------


async def _update_mastery(
    supabase_admin: Any,
    user_id: str,
    cefr_level: str,
    is_correct: bool,
    score: float,
) -> MasteryUpdate | None:
    """Update skill_mastery for listening after an exercise attempt."""
    skill = "listening"
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
            exercise_results = row.get("exercise_results", [])
            exercise_results.append(new_result)
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
            mastery_pct = round(score * 100, 1)
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
        logger.exception("Failed to update listening mastery")
        return None


# ---------------------------------------------------------------------------
# GET /exercises -- List listening exercises
# ---------------------------------------------------------------------------


@router.get(
    "/exercises",
    response_model=dict[str, ListeningExerciseListResponse],
)
async def list_listening_exercises(
    request: Request,
    cefr_level: CEFRLevel = Query(
        default=CEFRLevel.A1, description="CEFR level filter"
    ),
    limit: int = Query(
        default=20, ge=1, le=100, description="Page size"
    ),
    offset: int = Query(
        default=0, ge=0, description="Pagination offset"
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """List listening exercises for a given CEFR level, ordered by index."""
    supabase = _get_supabase(request)

    try:
        result = await (
            supabase.table("lessons")
            .select("*", count="exact")
            .eq("module", Module.LISTENING.value)
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

        # Get question counts per exercise
        lesson_ids = [row["id"] for row in lessons_data]
        question_counts: dict[str, int] = {}

        if lesson_ids:
            ex_result = await (
                supabase.table("lesson_exercises")
                .select("lesson_id", count="exact")
                .in_("lesson_id", lesson_ids)
                .execute()
            )
            for row in ex_result.data or []:
                lid = row["lesson_id"]
                question_counts[lid] = question_counts.get(lid, 0) + 1

        summaries = [
            ListeningExerciseSummary(
                id=row["id"],
                title_es=row["title_es"],
                title_fr=row["title_fr"],
                description_es=row.get("description_es"),
                cefr_level=row["cefr_level"],
                order_index=row["order_index"],
                duration_seconds=row.get("content", {}).get(
                    "duration_seconds"
                ),
                question_count=question_counts.get(row["id"], 0),
            )
            for row in lessons_data
        ]

        return {
            "data": ListeningExerciseListResponse(
                exercises=summaries,
                total=total,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to list listening exercises")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve listening exercises.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /exercises/{exercise_id} -- Get exercise detail with questions
# ---------------------------------------------------------------------------


@router.get(
    "/exercises/{exercise_id}",
    response_model=dict[str, ListeningExerciseDetailResponse],
)
async def get_listening_exercise(
    request: Request,
    exercise_id: UUID,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Get a listening exercise with audio segments and comprehension questions.

    Returns the audio URL, timed segments for replay, and questions --
    but NOT the full transcript text. The transcript must be explicitly
    requested via the /transcript endpoint so usage can be tracked.
    """
    supabase = _get_supabase(request)

    try:
        # Fetch the lesson
        lesson_result = await (
            supabase.table("lessons")
            .select("*")
            .eq("id", str(exercise_id))
            .eq("module", Module.LISTENING.value)
            .execute()
        )

        if not lesson_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Listening exercise {exercise_id} not found.",
            )

        lesson = lesson_result.data[0]
        content = lesson.get("content", {})

        # Parse segments
        raw_segments = content.get("segments", [])
        segments = [
            AudioSegment(
                id=seg["id"],
                start=seg["start"],
                end=seg["end"],
                text_fr=seg["text_fr"],
                speaker=seg.get("speaker"),
            )
            for seg in raw_segments
        ]

        # Fetch comprehension questions
        questions_result = await (
            supabase.table("lesson_exercises")
            .select("*")
            .eq("lesson_id", str(exercise_id))
            .order("order_index")
            .execute()
        )

        questions = []
        for row in questions_result.data or []:
            q_content = row.get("content", {})
            questions.append(
                ComprehensionQuestion(
                    id=row["id"],
                    question_fr=q_content.get("question_fr", ""),
                    question_es=q_content.get("question_es", ""),
                    options=q_content.get("options", []),
                    order_index=row["order_index"],
                    difficulty_tier=row.get("difficulty_tier", 1),
                )
            )

        return {
            "data": ListeningExerciseDetailResponse(
                id=lesson["id"],
                title_es=lesson["title_es"],
                title_fr=lesson["title_fr"],
                description_es=lesson.get("description_es"),
                cefr_level=lesson["cefr_level"],
                order_index=lesson["order_index"],
                audio_url=content.get("audio_url", ""),
                duration_seconds=content.get("duration_seconds"),
                segments=segments,
                questions=questions,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get listening exercise")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve listening exercise.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /exercises/{exercise_id}/submit -- Submit answers
# ---------------------------------------------------------------------------


@router.post(
    "/exercises/{exercise_id}/submit",
    response_model=dict[str, SubmitAnswersResponse],
)
async def submit_listening_answers(
    request: Request,
    exercise_id: UUID,
    body: SubmitAnswersRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Submit answers to comprehension questions and receive feedback."""
    supabase = _get_supabase(request)
    supabase_admin = _get_supabase_admin(request)

    try:
        # Verify the exercise exists and is a listening exercise
        lesson_result = await (
            supabase.table("lessons")
            .select("id, cefr_level")
            .eq("id", str(exercise_id))
            .eq("module", Module.LISTENING.value)
            .execute()
        )

        if not lesson_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Listening exercise {exercise_id} not found.",
            )

        cefr_level = lesson_result.data[0]["cefr_level"]

        # Fetch all questions for this exercise
        questions_result = await (
            supabase.table("lesson_exercises")
            .select("*")
            .eq("lesson_id", str(exercise_id))
            .order("order_index")
            .execute()
        )

        if not questions_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No questions found for this exercise.",
            )

        # Build a lookup of questions by ID
        questions_by_id: dict[str, dict[str, Any]] = {
            row["id"]: row for row in questions_result.data
        }

        # Evaluate each submitted answer
        feedback_list: list[QuestionFeedback] = []
        correct_count = 0

        for submission in body.answers:
            question_id_str = str(submission.question_id)
            question = questions_by_id.get(question_id_str)

            if question is None:
                # Skip unknown question IDs
                continue

            q_content = question.get("content", {})
            correct_answer = q_content.get("correct_answer", "")
            explanation = q_content.get("explanation_es", "")

            is_correct = (
                submission.answer.strip().lower()
                == correct_answer.strip().lower()
            )

            if is_correct:
                correct_count += 1

            feedback_list.append(
                QuestionFeedback(
                    question_id=submission.question_id,
                    correct=is_correct,
                    user_answer=submission.answer,
                    correct_answer=correct_answer,
                    explanation_es=explanation,
                )
            )

        total_count = len(feedback_list)
        score = correct_count / total_count if total_count > 0 else 0.0

        # XP: award based on score
        xp_awarded = correct_count * 10

        # Update listening mastery
        mastery_update = await _update_mastery(
            supabase_admin,
            user.id,
            cefr_level,
            score >= 0.5,
            score,
        )

        return {
            "data": SubmitAnswersResponse(
                score=round(score, 2),
                correct_count=correct_count,
                total_count=total_count,
                feedback=feedback_list,
                xp_awarded=xp_awarded,
                mastery_update=mastery_update,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to submit listening answers")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process answer submissions.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /exercises/{exercise_id}/transcript -- Reveal transcript
# ---------------------------------------------------------------------------


@router.post(
    "/exercises/{exercise_id}/transcript",
    response_model=dict[str, TranscriptResponse],
)
async def reveal_transcript(
    request: Request,
    exercise_id: UUID,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Reveal the full transcript for a listening exercise.

    This is tracked separately for analytics so we can measure how
    often learners rely on the transcript versus pure listening.
    """
    supabase = _get_supabase(request)
    supabase_admin = _get_supabase_admin(request)

    try:
        # Fetch the lesson
        lesson_result = await (
            supabase.table("lessons")
            .select("*")
            .eq("id", str(exercise_id))
            .eq("module", Module.LISTENING.value)
            .execute()
        )

        if not lesson_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Listening exercise {exercise_id} not found.",
            )

        lesson = lesson_result.data[0]
        content = lesson.get("content", {})

        # Parse segments
        raw_segments = content.get("segments", [])
        segments = [
            AudioSegment(
                id=seg["id"],
                start=seg["start"],
                end=seg["end"],
                text_fr=seg["text_fr"],
                speaker=seg.get("speaker"),
            )
            for seg in raw_segments
        ]

        # Track transcript reveal for analytics (non-critical)
        try:
            await (
                supabase_admin.table("ai_model_usage_logs")
                .insert(
                    {
                        "user_id": user.id,
                        "ai_platform": "huggingface",
                        "task_type": "lesson_generation",
                        "input_data": {
                            "action": "transcript_reveal",
                            "exercise_id": str(exercise_id),
                            "cefr_level": lesson["cefr_level"],
                        },
                        "output_data": {"revealed": True},
                        "latency_ms": 0,
                        "token_count": 0,
                    }
                )
                .execute()
            )
        except Exception:
            logger.warning(
                "Failed to log transcript reveal for exercise %s",
                exercise_id,
            )

        return {
            "data": TranscriptResponse(
                exercise_id=lesson["id"],
                dialogue_text_fr=content.get("dialogue_text_fr", ""),
                dialogue_text_es=content.get("dialogue_text_es", ""),
                segments=segments,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to reveal transcript")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve transcript.",
        ) from exc
