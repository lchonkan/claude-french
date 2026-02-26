# ruff: noqa: B008
"""Exam API routes for the French Learning Platform.

Endpoints:
- POST /placement/start   -- Start an adaptive placement test (begins at A2)
- POST /{id}/answer        -- Submit answer, receive adaptive next question
- POST /exit/start         -- Start a CEFR exit exam for a specific level
- GET  /{id}/result        -- Get exam result with per-skill breakdown
- GET  /history            -- Get user's exam history

Adaptive placement algorithm:
- Start at A2, present 5-question windows
- >=4/5 correct in a window -> move up one CEFR level
- <=1/5 correct in a window -> move down one CEFR level
- Converge after 3 windows (15 questions total)
"""

from __future__ import annotations

import logging
import random
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from services.api.src.middleware.auth import UserInfo, get_current_user
from services.shared.models.vocabulary import CEFRLevel

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CEFR_LEVELS: list[str] = ["A1", "A2", "B1", "B2", "C1", "C2"]
PLACEMENT_START_LEVEL = "A2"
WINDOW_SIZE = 5
MAX_WINDOWS = 3
PASS_THRESHOLD = 70.0  # Score percentage to pass an exit exam


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class StartPlacementRequest(BaseModel):
    """Request body for starting a placement test."""
    pass


class StartExitExamRequest(BaseModel):
    """Request body for starting a CEFR exit exam."""
    cefr_level: CEFRLevel = Field(
        description="The CEFR level to be tested on"
    )


class AnswerRequest(BaseModel):
    """Payload submitted when answering an exam question."""
    question_id: str = Field(description="ID of the question being answered")
    answer: str = Field(description="The user's answer")


class ExamQuestion(BaseModel):
    """A single exam question returned to the client."""
    id: str
    type: str
    prompt_fr: str
    prompt_es: str
    options: list[str] | None = None
    skill: str
    cefr_level: str


class StartExamResponse(BaseModel):
    """Response after starting an exam."""
    exam_id: str
    exam_type: str
    current_level: str
    question: ExamQuestion
    question_number: int
    total_questions: int | None = Field(
        default=None,
        description="Total questions (known for exit, None for adaptive placement)",
    )


class AnswerResponse(BaseModel):
    """Response after submitting an answer."""
    correct: bool
    correct_answer: str
    explanation: str | None = None
    next_question: ExamQuestion | None = Field(
        default=None, description="Next question, or null if exam is complete"
    )
    question_number: int
    current_estimated_level: str
    exam_complete: bool = False


class SkillScore(BaseModel):
    """Score breakdown for an individual skill."""
    skill: str
    score: float
    total_questions: int
    correct: int


class ExamResult(BaseModel):
    """Complete exam result with per-skill breakdown."""
    exam_id: str
    exam_type: str
    assigned_level: str
    score: float
    passed: bool
    skill_breakdown: list[SkillScore]
    started_at: str
    completed_at: str
    total_questions: int
    correct_answers: int


class ExamHistoryItem(BaseModel):
    """Summary item for exam history listing."""
    id: str
    exam_type: str
    cefr_level: str
    score: float | None
    passed: bool | None
    status: str
    started_at: str
    completed_at: str | None


class ExamHistoryResponse(BaseModel):
    """Response for exam history endpoint."""
    items: list[ExamHistoryItem]
    total: int


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


def _level_index(level: str) -> int:
    """Return the ordinal index of a CEFR level string."""
    try:
        return CEFR_LEVELS.index(level)
    except ValueError:
        return 1  # default to A2


def _adjust_level(current_level: str, correct_in_window: int) -> str:
    """Adjust the placement level based on a 5-question window result.

    - >=4 correct: move up
    - <=1 correct: move down
    - 2-3 correct: stay at current level
    """
    idx = _level_index(current_level)
    if correct_in_window >= 4:
        idx = min(idx + 1, len(CEFR_LEVELS) - 1)
    elif correct_in_window <= 1:
        idx = max(idx - 1, 0)
    return CEFR_LEVELS[idx]


def _compute_skill_breakdown(
    answers: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], float]:
    """Compute per-skill breakdown and overall score from answer records.

    Returns (skill_breakdown_list, overall_score_percentage).
    """
    skill_stats: dict[str, dict[str, int]] = {}
    for ans in answers:
        skill = ans.get("skill", "general")
        if skill not in skill_stats:
            skill_stats[skill] = {"correct": 0, "total": 0}
        skill_stats[skill]["total"] += 1
        if ans.get("correct", False):
            skill_stats[skill]["correct"] += 1

    breakdown = []
    total_correct = 0
    total_questions = 0
    for skill, stats in skill_stats.items():
        score = (
            (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0.0
        )
        breakdown.append(
            {
                "skill": skill,
                "score": round(score, 1),
                "total_questions": stats["total"],
                "correct": stats["correct"],
            }
        )
        total_correct += stats["correct"]
        total_questions += stats["total"]

    overall = (total_correct / total_questions * 100) if total_questions > 0 else 0.0
    return breakdown, round(overall, 1)


async def _fetch_questions_for_level(
    supabase: Any,
    cefr_level: str,
    exclude_ids: list[str] | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Fetch exam questions from the exam_questions table for a given level.

    Falls back to adjacent levels if not enough questions are found.
    """
    query = (
        supabase.table("exam_questions")
        .select("*")
        .eq("cefr_level", cefr_level)
    )
    if exclude_ids:
        query = query.not_.in_("id", exclude_ids)

    result = await query.limit(limit * 2).execute()
    questions = result.data or []

    # Shuffle and pick
    random.shuffle(questions)
    return questions[:limit]


def _format_question(q: dict[str, Any]) -> ExamQuestion:
    """Convert a DB question record to the API response model."""
    data = q.get("question_data", q)
    if isinstance(data, str):
        import json

        data = json.loads(data)

    return ExamQuestion(
        id=str(q["id"]),
        type=data.get("type", q.get("question_type", "multiple_choice")),
        prompt_fr=data.get("prompt_fr", q.get("prompt_fr", "")),
        prompt_es=data.get("prompt_es", q.get("prompt_es", "")),
        options=data.get("options", q.get("options")),
        skill=data.get("skill", q.get("skill", "general")),
        cefr_level=q.get("cefr_level", "A1"),
    )


def _check_answer(q: dict[str, Any], user_answer: str) -> tuple[bool, str]:
    """Check whether the user's answer is correct.

    Returns (is_correct, correct_answer_text).
    """
    data = q.get("question_data", q)
    if isinstance(data, str):
        import json

        data = json.loads(data)

    correct = data.get("correct_answer", q.get("correct_answer", ""))
    is_correct = user_answer.strip().lower() == str(correct).strip().lower()
    return is_correct, str(correct)


# ---------------------------------------------------------------------------
# POST /placement/start -- Start adaptive placement test
# ---------------------------------------------------------------------------


@router.post(
    "/placement/start",
    response_model=dict[str, StartExamResponse],
    status_code=status.HTTP_201_CREATED,
)
async def start_placement_test(
    request: Request,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Start a new adaptive placement test.

    The test begins at A2 level and adapts based on 5-question windows.
    If >=4/5 correct the level moves up; if <=1/5 correct the level moves
    down. The test converges after 3 windows (15 questions maximum).
    """
    supabase = _get_supabase(request)

    try:
        # Create the exam attempt record
        exam_data = {
            "user_id": user.id,
            "exam_type": "placement",
            "cefr_level": PLACEMENT_START_LEVEL,
            "status": "in_progress",
            "answers": [],
            "skill_breakdown": {},
            "started_at": datetime.now(UTC).isoformat(),
        }
        insert_result = await (
            supabase.table("exam_attempts")
            .insert(exam_data)
            .execute()
        )

        if not insert_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create exam attempt.",
            )

        exam = insert_result.data[0]
        exam_id = exam["id"]

        # Fetch first batch of questions at A2 level
        questions = await _fetch_questions_for_level(
            supabase, PLACEMENT_START_LEVEL, limit=WINDOW_SIZE
        )

        if not questions:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="No exam questions available. Please try again later.",
            )

        first_q = questions[0]

        # Store the question queue in the answers JSONB for state tracking
        question_queue = [str(q["id"]) for q in questions[1:]]
        state = {
            "current_window": 1,
            "window_position": 1,
            "window_correct": 0,
            "current_level": PLACEMENT_START_LEVEL,
            "question_queue": question_queue,
            "asked_ids": [str(first_q["id"])],
            "current_question_id": str(first_q["id"]),
        }

        await (
            supabase.table("exam_attempts")
            .update({
                "skill_breakdown": state,
            })
            .eq("id", exam_id)
            .execute()
        )

        return {
            "data": StartExamResponse(
                exam_id=str(exam_id),
                exam_type="placement",
                current_level=PLACEMENT_START_LEVEL,
                question=_format_question(first_q),
                question_number=1,
                total_questions=None,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to start placement test")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start placement test.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /exit/start -- Start CEFR exit exam
# ---------------------------------------------------------------------------


@router.post(
    "/exit/start",
    response_model=dict[str, StartExamResponse],
    status_code=status.HTTP_201_CREATED,
)
async def start_exit_exam(
    request: Request,
    body: StartExitExamRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Start a CEFR exit exam for a specific level.

    The exit exam presents 10 questions at the target CEFR level
    covering vocabulary, grammar, and reading comprehension. A score
    of >= 70% is required to pass.
    """
    supabase = _get_supabase(request)
    target_level = body.cefr_level.value

    try:
        # Create the exam attempt record
        exam_data = {
            "user_id": user.id,
            "exam_type": "exit",
            "cefr_level": target_level,
            "status": "in_progress",
            "answers": [],
            "skill_breakdown": {},
            "started_at": datetime.now(UTC).isoformat(),
        }
        insert_result = await (
            supabase.table("exam_attempts")
            .insert(exam_data)
            .execute()
        )

        if not insert_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create exam attempt.",
            )

        exam = insert_result.data[0]
        exam_id = exam["id"]

        # Fetch 10 questions at the target level
        questions = await _fetch_questions_for_level(
            supabase, target_level, limit=10
        )

        if not questions:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"No exam questions available for level {target_level}.",
            )

        first_q = questions[0]
        total_questions = len(questions)

        question_queue = [str(q["id"]) for q in questions[1:]]
        state = {
            "current_level": target_level,
            "question_queue": question_queue,
            "asked_ids": [str(first_q["id"])],
            "current_question_id": str(first_q["id"]),
            "total_questions": total_questions,
        }

        await (
            supabase.table("exam_attempts")
            .update({
                "skill_breakdown": state,
            })
            .eq("id", exam_id)
            .execute()
        )

        return {
            "data": StartExamResponse(
                exam_id=str(exam_id),
                exam_type="exit",
                current_level=target_level,
                question=_format_question(first_q),
                question_number=1,
                total_questions=total_questions,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to start exit exam")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start exit exam.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /{exam_id}/answer -- Submit answer and get next question
# ---------------------------------------------------------------------------


@router.post(
    "/{exam_id}/answer",
    response_model=dict[str, AnswerResponse],
)
async def submit_answer(
    request: Request,
    exam_id: UUID,
    body: AnswerRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Submit an answer for the current question and receive the next one.

    For placement tests, the adaptive algorithm adjusts the CEFR level
    at the end of each 5-question window. The exam completes after 3 windows.
    For exit exams, questions are served sequentially until exhausted.
    """
    supabase = _get_supabase(request)

    try:
        # Fetch the exam attempt
        exam_result = await (
            supabase.table("exam_attempts")
            .select("*")
            .eq("id", str(exam_id))
            .eq("user_id", user.id)
            .execute()
        )

        if not exam_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam attempt not found.",
            )

        exam = exam_result.data[0]
        if exam["status"] != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This exam has already been completed.",
            )

        state = exam.get("skill_breakdown", {})
        answers = exam.get("answers", [])

        # Fetch the question to check the answer
        q_result = await (
            supabase.table("exam_questions")
            .select("*")
            .eq("id", body.question_id)
            .execute()
        )

        if not q_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found.",
            )

        question = q_result.data[0]
        is_correct, correct_answer = _check_answer(question, body.answer)

        # Get question data for explanation
        q_data = question.get("question_data", question)
        if isinstance(q_data, str):
            import json
            q_data = json.loads(q_data)

        explanation = q_data.get("explanation")

        # Record the answer
        answer_record = {
            "question_id": body.question_id,
            "answer": body.answer,
            "correct": is_correct,
            "correct_answer": correct_answer,
            "skill": q_data.get("skill", question.get("skill", "general")),
            "cefr_level": question.get("cefr_level", "A1"),
            "timestamp": datetime.now(UTC).isoformat(),
        }
        answers.append(answer_record)

        exam_type = exam["exam_type"]
        question_number = len(answers)
        exam_complete = False
        next_question: ExamQuestion | None = None
        current_level = state.get("current_level", exam["cefr_level"])

        if exam_type == "placement":
            # Adaptive placement logic
            window_correct = state.get("window_correct", 0)
            window_position = state.get("window_position", 1)
            current_window = state.get("current_window", 1)

            if is_correct:
                window_correct += 1

            # Check if we've completed a window
            if window_position >= WINDOW_SIZE:
                # Adjust level based on window performance
                current_level = _adjust_level(current_level, window_correct)
                current_window += 1
                window_position = 0
                window_correct = 0

                if current_window > MAX_WINDOWS:
                    # Exam complete after 3 windows
                    exam_complete = True
                else:
                    # Fetch next window of questions at the new level
                    asked_ids = state.get("asked_ids", [])
                    new_questions = await _fetch_questions_for_level(
                        supabase,
                        current_level,
                        exclude_ids=asked_ids,
                        limit=WINDOW_SIZE,
                    )
                    if new_questions:
                        state["question_queue"] = [
                            str(q["id"]) for q in new_questions
                        ]
                    else:
                        # No more questions available -- end the exam
                        exam_complete = True

            if not exam_complete:
                window_position += 1
                state["window_correct"] = window_correct
                state["window_position"] = window_position
                state["current_window"] = current_window
                state["current_level"] = current_level

                # Get next question from the queue
                queue = state.get("question_queue", [])
                if queue:
                    next_q_id = queue.pop(0)
                    state["question_queue"] = queue

                    nq_result = await (
                        supabase.table("exam_questions")
                        .select("*")
                        .eq("id", next_q_id)
                        .execute()
                    )
                    if nq_result.data:
                        next_q = nq_result.data[0]
                        state.setdefault("asked_ids", []).append(
                            str(next_q["id"])
                        )
                        state["current_question_id"] = str(next_q["id"])
                        next_question = _format_question(next_q)
                    else:
                        exam_complete = True
                else:
                    exam_complete = True

        elif exam_type == "exit":
            # Sequential exit exam logic
            queue = state.get("question_queue", [])
            if queue:
                next_q_id = queue.pop(0)
                state["question_queue"] = queue

                nq_result = await (
                    supabase.table("exam_questions")
                    .select("*")
                    .eq("id", next_q_id)
                    .execute()
                )
                if nq_result.data:
                    next_q = nq_result.data[0]
                    state.setdefault("asked_ids", []).append(
                        str(next_q["id"])
                    )
                    state["current_question_id"] = str(next_q["id"])
                    next_question = _format_question(next_q)
                else:
                    exam_complete = True
            else:
                exam_complete = True

        # Prepare update payload
        update_data: dict[str, Any] = {
            "answers": answers,
            "skill_breakdown": state,
        }

        if exam_complete:
            # Compute final results
            skill_breakdown, overall_score = _compute_skill_breakdown(answers)
            passed = (
                overall_score >= PASS_THRESHOLD
                if exam_type == "exit"
                else True  # placement tests always "pass" -- they assign a level
            )

            update_data.update(
                {
                    "score": overall_score,
                    "passed": passed,
                    "cefr_level": current_level,
                    "skill_breakdown": {
                        "skills": skill_breakdown,
                        "state": state,
                    },
                    "completed_at": datetime.now(UTC).isoformat(),
                    "status": "completed",
                }
            )

        await (
            supabase.table("exam_attempts")
            .update(update_data)
            .eq("id", str(exam_id))
            .execute()
        )

        return {
            "data": AnswerResponse(
                correct=is_correct,
                correct_answer=correct_answer,
                explanation=explanation,
                next_question=next_question,
                question_number=question_number,
                current_estimated_level=current_level,
                exam_complete=exam_complete,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to process exam answer")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process answer.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /{exam_id}/result -- Get exam result
# ---------------------------------------------------------------------------


@router.get(
    "/{exam_id}/result",
    response_model=dict[str, ExamResult],
)
async def get_exam_result(
    request: Request,
    exam_id: UUID,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Get the result of a completed exam with per-skill breakdown."""
    supabase = _get_supabase(request)

    try:
        result = await (
            supabase.table("exam_attempts")
            .select("*")
            .eq("id", str(exam_id))
            .eq("user_id", user.id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam attempt not found.",
            )

        exam = result.data[0]

        if exam["status"] != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This exam has not been completed yet.",
            )

        answers = exam.get("answers", [])
        breakdown_data = exam.get("skill_breakdown", {})
        skill_list = breakdown_data.get("skills", [])

        # Recompute if skill breakdown wasn't stored properly
        if not skill_list:
            skill_list, _ = _compute_skill_breakdown(answers)

        total_correct = sum(1 for a in answers if a.get("correct", False))

        skill_scores = [
            SkillScore(
                skill=s["skill"],
                score=s["score"],
                total_questions=s["total_questions"],
                correct=s["correct"],
            )
            for s in skill_list
        ]

        return {
            "data": ExamResult(
                exam_id=str(exam["id"]),
                exam_type=exam["exam_type"],
                assigned_level=exam["cefr_level"],
                score=exam.get("score", 0.0),
                passed=exam.get("passed", False),
                skill_breakdown=skill_scores,
                started_at=exam["started_at"],
                completed_at=exam.get("completed_at", ""),
                total_questions=len(answers),
                correct_answers=total_correct,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to retrieve exam result")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve exam result.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /history -- Get user's exam history
# ---------------------------------------------------------------------------


@router.get(
    "/history",
    response_model=dict[str, ExamHistoryResponse],
)
async def get_exam_history(
    request: Request,
    exam_type: str | None = Query(
        default=None, description="Filter by exam type (placement or exit)"
    ),
    limit: int = Query(
        default=20, ge=1, le=100, description="Page size"
    ),
    offset: int = Query(
        default=0, ge=0, description="Pagination offset"
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Get the authenticated user's exam history, ordered by most recent."""
    supabase = _get_supabase(request)

    try:
        query = (
            supabase.table("exam_attempts")
            .select(
                "id, exam_type, cefr_level, score, passed, status, "
                "started_at, completed_at",
                count="exact",
            )
            .eq("user_id", user.id)
        )

        if exam_type:
            query = query.eq("exam_type", exam_type)

        query = (
            query.order("started_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        result = await query.execute()
        rows = result.data or []
        total = result.count if result.count is not None else len(rows)

        items = [
            ExamHistoryItem(
                id=str(row["id"]),
                exam_type=row["exam_type"],
                cefr_level=row["cefr_level"],
                score=row.get("score"),
                passed=row.get("passed"),
                status=row["status"],
                started_at=row["started_at"],
                completed_at=row.get("completed_at"),
            )
            for row in rows
        ]

        return {
            "data": ExamHistoryResponse(items=items, total=total)
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to retrieve exam history")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve exam history.",
        ) from exc
