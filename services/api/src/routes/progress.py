# ruff: noqa: B008
"""Progress & Gamification API routes for the French Learning Platform.

Endpoints:
- GET  /dashboard                        -- Overall dashboard data
- GET  /mastery                          -- Per-skill mastery data
- GET  /skill-tree                       -- Skill tree structure
- GET  /streak                           -- Streak info
- POST /daily-challenge/{id}/complete    -- Complete daily challenge
- GET  /xp/history                       -- XP transaction history
"""

from __future__ import annotations

import logging
import random
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from services.api.src.middleware.auth import UserInfo, get_current_user
from services.shared.mastery.calculator import (
    MASTERY_THRESHOLD,
    calculate_mastery,
)
from services.shared.models.vocabulary import CEFRLevel

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SKILLS = [
    "vocabulary",
    "grammar",
    "writing",
    "listening",
    "pronunciation",
    "conversation",
]

CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

XP_AMOUNTS = {
    "vocab_review": 10,
    "grammar_exercise": 15,
    "conversation": 25,
    "writing": 30,
    "pronunciation": 15,
    "listening": 15,
    "exam": 50,
    "daily_challenge": 50,
}

BADGE_THRESHOLDS = {
    "streak_7": {"field": "streak", "value": 7},
    "streak_30": {"field": "streak", "value": 30},
    "streak_100": {"field": "streak", "value": 100},
    "vocab_100": {"field": "vocab_count", "value": 100},
    "vocab_500": {"field": "vocab_count", "value": 500},
    "vocab_1000": {"field": "vocab_count", "value": 1000},
}


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class SkillMasteryData(BaseModel):
    skill: str
    mastery_percentage: float
    total_exercises: int = 0
    total_correct: int = 0
    recent_trend: str = "stable"
    last_practiced: str | None = None


class CEFRProgress(BaseModel):
    current_level: str
    overall_mastery: float
    skills: list[SkillMasteryData]
    unlock_threshold: float = MASTERY_THRESHOLD
    exam_required: bool = True
    exam_available: bool = False


class BadgeData(BaseModel):
    id: str
    badge_type: str
    cefr_level: str | None = None
    earned_at: str


class DailyChallengeData(BaseModel):
    id: str
    challenge_type: str
    description_es: str
    completed: bool
    xp_reward: int


class RecentActivity(BaseModel):
    activity_type: str
    xp_earned: int
    timestamp: str


class UserDashboardInfo(BaseModel):
    display_name: str
    current_cefr_level: str
    xp_total: int
    current_streak: int
    longest_streak: int


class DashboardResponse(BaseModel):
    user: UserDashboardInfo
    cefr_progress: CEFRProgress
    badges: list[BadgeData]
    daily_challenge: DailyChallengeData | None
    recent_activity: list[RecentActivity]


class MasteryResponse(BaseModel):
    cefr_level: str
    skills: list[SkillMasteryData]


class SkillTreeNode(BaseModel):
    skill: str
    status: str  # 'locked', 'in_progress', 'mastered'
    mastery: float


class SkillTreeLevel(BaseModel):
    cefr_level: str
    status: str  # 'locked', 'in_progress', 'completed'
    overall_mastery: float
    skills: list[SkillTreeNode]
    exam_status: str  # 'locked', 'available', 'passed'


class SkillTreeResponse(BaseModel):
    levels: list[SkillTreeLevel]


class StreakDay(BaseModel):
    date: str
    active: bool
    xp_earned: int


class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    last_activity_date: str | None
    streak_history: list[StreakDay]


class ChallengeCompleteResponse(BaseModel):
    challenge_id: str
    completed: bool
    xp_awarded: int
    new_xp_total: int


class XPTransactionData(BaseModel):
    activity_type: str
    xp_amount: int
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class XPHistoryResponse(BaseModel):
    transactions: list[XPTransactionData]
    total: int
    period_xp: int


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


async def _get_user_profile(
    supabase: Any, user_id: str
) -> dict[str, Any]:
    """Fetch user profile or return defaults."""
    try:
        result = await (
            supabase.table("user_profiles")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception:
        logger.warning("Could not fetch user profile for %s", user_id)

    return {
        "user_id": user_id,
        "display_name": "Estudiante",
        "current_cefr_level": "A1",
        "xp_total": 0,
        "current_streak": 0,
        "longest_streak": 0,
        "last_activity_date": None,
    }


async def _get_skill_mastery(
    supabase: Any, user_id: str, cefr_level: str
) -> list[SkillMasteryData]:
    """Calculate mastery for each skill at a CEFR level."""
    mastery_list: list[SkillMasteryData] = []

    for skill in SKILLS:
        try:
            result = await (
                supabase.table("skill_mastery")
                .select("*")
                .eq("user_id", user_id)
                .eq("skill", skill)
                .eq("cefr_level", cefr_level)
                .execute()
            )

            if result.data:
                row = result.data[0]
                # Use stored mastery or calculate from exercise results
                mastery_pct = float(row.get("mastery_percentage", 0))
                total_exercises = int(row.get("total_exercises", 0))
                total_correct = int(row.get("total_correct", 0))
                last_practiced = row.get("last_practiced")

                # Determine trend from recent data
                trend = "stable"
                if total_exercises >= 10:
                    recent_accuracy = (
                        total_correct / total_exercises
                        if total_exercises > 0
                        else 0
                    )
                    if recent_accuracy > 0.7:
                        trend = "improving"
                    elif recent_accuracy < 0.4:
                        trend = "declining"

                mastery_list.append(
                    SkillMasteryData(
                        skill=skill,
                        mastery_percentage=round(mastery_pct, 1),
                        total_exercises=total_exercises,
                        total_correct=total_correct,
                        recent_trend=trend,
                        last_practiced=last_practiced,
                    )
                )
            else:
                mastery_list.append(
                    SkillMasteryData(
                        skill=skill,
                        mastery_percentage=0.0,
                    )
                )
        except Exception:
            logger.warning(
                "Could not fetch mastery for skill=%s user=%s",
                skill,
                user_id,
            )
            mastery_list.append(
                SkillMasteryData(
                    skill=skill,
                    mastery_percentage=0.0,
                )
            )

    return mastery_list


async def _award_xp(
    supabase: Any,
    user_id: str,
    activity_type: str,
    xp_amount: int,
    metadata: dict[str, Any] | None = None,
) -> int:
    """Insert XP transaction and update user profile total. Returns new total."""
    try:
        # Insert transaction
        await (
            supabase.table("xp_transactions")
            .insert({
                "user_id": user_id,
                "activity_type": activity_type,
                "xp_amount": xp_amount,
                "metadata": metadata or {},
            })
            .execute()
        )

        # Update user profile total
        profile = await _get_user_profile(supabase, user_id)
        new_total = int(profile.get("xp_total", 0)) + xp_amount

        await (
            supabase.table("user_profiles")
            .update({"xp_total": new_total})
            .eq("user_id", user_id)
            .execute()
        )

        return new_total
    except Exception:
        logger.exception("Failed to award XP to user %s", user_id)
        return int(
            (await _get_user_profile(supabase, user_id)).get("xp_total", 0)
        )


async def _update_streak(
    supabase: Any, user_id: str
) -> tuple[int, int]:
    """Update streak based on activity. Returns (current, longest)."""
    try:
        profile = await _get_user_profile(supabase, user_id)
        today = date.today()
        last_activity = profile.get("last_activity_date")

        current_streak = int(profile.get("current_streak", 0))
        longest_streak = int(profile.get("longest_streak", 0))

        if last_activity:
            if isinstance(last_activity, str):
                last_date = date.fromisoformat(last_activity)
            else:
                last_date = last_activity

            if last_date == today:
                # Already active today
                return current_streak, longest_streak
            elif last_date == today - timedelta(days=1):
                # Consecutive day
                current_streak += 1
            else:
                # Streak broken
                current_streak = 1
        else:
            current_streak = 1

        longest_streak = max(longest_streak, current_streak)

        await (
            supabase.table("user_profiles")
            .update({
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "last_activity_date": today.isoformat(),
            })
            .eq("user_id", user_id)
            .execute()
        )

        return current_streak, longest_streak
    except Exception:
        logger.exception("Failed to update streak for user %s", user_id)
        return 0, 0


async def _check_and_award_badges(
    supabase: Any, user_id: str, current_streak: int
) -> list[BadgeData]:
    """Check badge thresholds and award any newly earned badges."""
    newly_earned: list[BadgeData] = []

    try:
        # Fetch existing badges
        existing_result = await (
            supabase.table("badges")
            .select("badge_type, cefr_level")
            .eq("user_id", user_id)
            .execute()
        )
        existing_badges = {
            (b["badge_type"], b.get("cefr_level"))
            for b in (existing_result.data or [])
        }

        # Check streak badges
        streak_badges = [
            ("streak_7", 7),
            ("streak_30", 30),
            ("streak_100", 100),
        ]
        for badge_type, threshold in streak_badges:
            if (
                current_streak >= threshold
                and (badge_type, None) not in existing_badges
            ):
                result = await (
                    supabase.table("badges")
                    .insert({
                        "user_id": user_id,
                        "badge_type": badge_type,
                        "cefr_level": None,
                    })
                    .execute()
                )
                if result.data:
                    row = result.data[0]
                    newly_earned.append(
                        BadgeData(
                            id=row["id"],
                            badge_type=badge_type,
                            cefr_level=None,
                            earned_at=row["earned_at"],
                        )
                    )

        # Check vocabulary badges
        try:
            vocab_count_result = await (
                supabase.table("vocabulary_progress")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .execute()
            )
            vocab_count = (
                vocab_count_result.count
                if vocab_count_result.count is not None
                else 0
            )

            vocab_badges = [
                ("vocab_100", 100),
                ("vocab_500", 500),
                ("vocab_1000", 1000),
            ]
            for badge_type, threshold in vocab_badges:
                if (
                    vocab_count >= threshold
                    and (badge_type, None) not in existing_badges
                ):
                    result = await (
                        supabase.table("badges")
                        .insert({
                            "user_id": user_id,
                            "badge_type": badge_type,
                            "cefr_level": None,
                        })
                        .execute()
                    )
                    if result.data:
                        row = result.data[0]
                        newly_earned.append(
                            BadgeData(
                                id=row["id"],
                                badge_type=badge_type,
                                cefr_level=None,
                                earned_at=row["earned_at"],
                            )
                        )
        except Exception:
            logger.warning("Could not check vocab badges for %s", user_id)

    except Exception:
        logger.exception("Failed to check badges for user %s", user_id)

    return newly_earned


async def _get_or_create_daily_challenge(
    supabase: Any, user_id: str
) -> DailyChallengeData | None:
    """Get today's daily challenge, creating one if needed."""
    today = date.today()

    try:
        result = await (
            supabase.table("daily_challenges")
            .select("*")
            .eq("user_id", user_id)
            .eq("challenge_date", today.isoformat())
            .execute()
        )

        if result.data:
            row = result.data[0]
            skill = row["challenge_type"]
            descriptions = {
                "vocabulary": "Repasa 10 palabras de vocabulario",
                "grammar": "Completa 5 ejercicios de gramatica",
                "writing": "Escribe un texto corto en frances",
                "listening": "Completa un ejercicio de comprension auditiva",
                "pronunciation": "Practica la pronunciacion de 5 frases",
                "conversation": "Mantiene una conversacion de 5 turnos",
            }

            return DailyChallengeData(
                id=row["id"],
                challenge_type=skill,
                description_es=descriptions.get(
                    skill, f"Completa un ejercicio de {skill}"
                ),
                completed=row.get("completed", False),
                xp_reward=XP_AMOUNTS.get("daily_challenge", 50),
            )

        # Create new challenge
        skill = random.choice(SKILLS)  # noqa: S311
        descriptions = {
            "vocabulary": "Repasa 10 palabras de vocabulario",
            "grammar": "Completa 5 ejercicios de gramatica",
            "writing": "Escribe un texto corto en frances",
            "listening": "Completa un ejercicio de comprension auditiva",
            "pronunciation": "Practica la pronunciacion de 5 frases",
            "conversation": "Mantiene una conversacion de 5 turnos",
        }

        insert_result = await (
            supabase.table("daily_challenges")
            .insert({
                "user_id": user_id,
                "challenge_date": today.isoformat(),
                "challenge_type": skill,
                "challenge_config": {
                    "description_es": descriptions.get(skill, ""),
                    "xp_reward": XP_AMOUNTS.get("daily_challenge", 50),
                },
                "completed": False,
                "xp_awarded": 0,
            })
            .execute()
        )

        if insert_result.data:
            row = insert_result.data[0]
            return DailyChallengeData(
                id=row["id"],
                challenge_type=skill,
                description_es=descriptions.get(
                    skill, f"Completa un ejercicio de {skill}"
                ),
                completed=False,
                xp_reward=XP_AMOUNTS.get("daily_challenge", 50),
            )

    except Exception:
        logger.exception(
            "Failed to get/create daily challenge for user %s", user_id
        )

    return None


# ---------------------------------------------------------------------------
# GET /dashboard -- Overall dashboard data
# ---------------------------------------------------------------------------


@router.get(
    "/dashboard",
    response_model=dict[str, DashboardResponse],
)
async def get_dashboard(
    request: Request,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Get the learner's full progress dashboard."""
    supabase = _get_supabase(request)

    try:
        profile = await _get_user_profile(supabase, user.id)
        current_level = profile.get("current_cefr_level", "A1")

        # Get mastery per skill
        skills = await _get_skill_mastery(supabase, user.id, current_level)

        # Calculate overall mastery
        mastery_values = [s.mastery_percentage for s in skills]
        overall_mastery = (
            sum(mastery_values) / len(mastery_values)
            if mastery_values
            else 0.0
        )

        # Check exam availability
        exam_available = overall_mastery >= MASTERY_THRESHOLD

        # Get badges
        badges_result = await (
            supabase.table("badges")
            .select("*")
            .eq("user_id", user.id)
            .order("earned_at", desc=True)
            .limit(10)
            .execute()
        )
        badges = [
            BadgeData(
                id=b["id"],
                badge_type=b["badge_type"],
                cefr_level=b.get("cefr_level"),
                earned_at=b["earned_at"],
            )
            for b in (badges_result.data or [])
        ]

        # Get daily challenge
        daily_challenge = await _get_or_create_daily_challenge(
            supabase, user.id
        )

        # Get recent activity (last 10 XP transactions)
        activity_result = await (
            supabase.table("xp_transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        recent_activity = [
            RecentActivity(
                activity_type=a["activity_type"],
                xp_earned=a["xp_amount"],
                timestamp=a["created_at"],
            )
            for a in (activity_result.data or [])
        ]

        return {
            "data": DashboardResponse(
                user=UserDashboardInfo(
                    display_name=profile.get("display_name", "Estudiante"),
                    current_cefr_level=current_level,
                    xp_total=int(profile.get("xp_total", 0)),
                    current_streak=int(
                        profile.get("current_streak", 0)
                    ),
                    longest_streak=int(
                        profile.get("longest_streak", 0)
                    ),
                ),
                cefr_progress=CEFRProgress(
                    current_level=current_level,
                    overall_mastery=round(overall_mastery, 1),
                    skills=skills,
                    exam_available=exam_available,
                ),
                badges=badges,
                daily_challenge=daily_challenge,
                recent_activity=recent_activity,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get dashboard")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard data.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /mastery -- Per-skill mastery data
# ---------------------------------------------------------------------------


@router.get(
    "/mastery",
    response_model=dict[str, MasteryResponse],
)
async def get_mastery(
    request: Request,
    cefr_level: str | None = Query(
        default=None,
        description="CEFR level (defaults to user's current level)",
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Get detailed mastery breakdown per skill for a CEFR level."""
    supabase = _get_supabase(request)

    try:
        if cefr_level is None:
            profile = await _get_user_profile(supabase, user.id)
            cefr_level = profile.get("current_cefr_level", "A1")

        skills = await _get_skill_mastery(supabase, user.id, cefr_level)

        return {
            "data": MasteryResponse(
                cefr_level=cefr_level,
                skills=skills,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get mastery data")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve mastery data.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /skill-tree -- Skill tree structure
# ---------------------------------------------------------------------------


@router.get(
    "/skill-tree",
    response_model=dict[str, SkillTreeResponse],
)
async def get_skill_tree(
    request: Request,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Get the visual skill tree data for all CEFR levels."""
    supabase = _get_supabase(request)

    try:
        profile = await _get_user_profile(supabase, user.id)
        current_level = profile.get("current_cefr_level", "A1")
        current_idx = CEFR_LEVELS.index(current_level)

        levels: list[SkillTreeLevel] = []

        for i, level in enumerate(CEFR_LEVELS):
            if i < current_idx:
                # Completed level
                levels.append(
                    SkillTreeLevel(
                        cefr_level=level,
                        status="completed",
                        overall_mastery=100.0,
                        skills=[
                            SkillTreeNode(
                                skill=s,
                                status="mastered",
                                mastery=100.0,
                            )
                            for s in SKILLS
                        ],
                        exam_status="passed",
                    )
                )
            elif i == current_idx:
                # Current level - fetch real mastery
                skills_data = await _get_skill_mastery(
                    supabase, user.id, level
                )
                mastery_values = [
                    s.mastery_percentage for s in skills_data
                ]
                overall = (
                    sum(mastery_values) / len(mastery_values)
                    if mastery_values
                    else 0.0
                )

                skill_nodes = [
                    SkillTreeNode(
                        skill=s.skill,
                        status=(
                            "mastered"
                            if s.mastery_percentage >= 80
                            else "in_progress"
                            if s.mastery_percentage > 0
                            else "locked"
                        ),
                        mastery=s.mastery_percentage,
                    )
                    for s in skills_data
                ]

                exam_status = (
                    "available"
                    if overall >= MASTERY_THRESHOLD
                    else "locked"
                )

                levels.append(
                    SkillTreeLevel(
                        cefr_level=level,
                        status="in_progress",
                        overall_mastery=round(overall, 1),
                        skills=skill_nodes,
                        exam_status=exam_status,
                    )
                )
            else:
                # Locked level
                levels.append(
                    SkillTreeLevel(
                        cefr_level=level,
                        status="locked",
                        overall_mastery=0,
                        skills=[],
                        exam_status="locked",
                    )
                )

        return {"data": SkillTreeResponse(levels=levels)}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get skill tree")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve skill tree.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /streak -- Streak info
# ---------------------------------------------------------------------------


@router.get(
    "/streak",
    response_model=dict[str, StreakResponse],
)
async def get_streak(
    request: Request,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Get streak details and recent history."""
    supabase = _get_supabase(request)

    try:
        profile = await _get_user_profile(supabase, user.id)
        current_streak = int(profile.get("current_streak", 0))
        longest_streak = int(profile.get("longest_streak", 0))
        last_activity = profile.get("last_activity_date")

        # Build streak history from recent XP transactions
        today = date.today()
        streak_history: list[StreakDay] = []

        for days_ago in range(14):
            check_date = today - timedelta(days=days_ago)
            date_str = check_date.isoformat()

            try:
                xp_result = await (
                    supabase.table("xp_transactions")
                    .select("xp_amount")
                    .eq("user_id", user.id)
                    .gte(
                        "created_at",
                        f"{date_str}T00:00:00Z",
                    )
                    .lte(
                        "created_at",
                        f"{date_str}T23:59:59Z",
                    )
                    .execute()
                )

                day_xp = sum(
                    r["xp_amount"]
                    for r in (xp_result.data or [])
                )

                streak_history.append(
                    StreakDay(
                        date=date_str,
                        active=day_xp > 0,
                        xp_earned=day_xp,
                    )
                )
            except Exception:
                streak_history.append(
                    StreakDay(
                        date=date_str,
                        active=False,
                        xp_earned=0,
                    )
                )

        return {
            "data": StreakResponse(
                current_streak=current_streak,
                longest_streak=longest_streak,
                last_activity_date=last_activity,
                streak_history=streak_history,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get streak info")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve streak data.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /daily-challenge/{id}/complete -- Complete daily challenge
# ---------------------------------------------------------------------------


@router.post(
    "/daily-challenge/{challenge_id}/complete",
    response_model=dict[str, ChallengeCompleteResponse],
)
async def complete_daily_challenge(
    request: Request,
    challenge_id: UUID,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Mark a daily challenge as completed and award XP."""
    supabase = _get_supabase(request)

    try:
        # Fetch the challenge
        result = await (
            supabase.table("daily_challenges")
            .select("*")
            .eq("id", str(challenge_id))
            .eq("user_id", user.id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Daily challenge {challenge_id} not found.",
            )

        challenge = result.data[0]

        if challenge.get("completed"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Challenge already completed.",
            )

        xp_reward = XP_AMOUNTS.get("daily_challenge", 50)

        # Mark complete
        await (
            supabase.table("daily_challenges")
            .update({
                "completed": True,
                "xp_awarded": xp_reward,
            })
            .eq("id", str(challenge_id))
            .execute()
        )

        # Award XP
        new_total = await _award_xp(
            supabase,
            user.id,
            "daily_challenge",
            xp_reward,
            {"challenge_id": str(challenge_id)},
        )

        # Update streak
        current_streak, _ = await _update_streak(supabase, user.id)

        # Check for new badges
        await _check_and_award_badges(
            supabase, user.id, current_streak
        )

        return {
            "data": ChallengeCompleteResponse(
                challenge_id=str(challenge_id),
                completed=True,
                xp_awarded=xp_reward,
                new_xp_total=new_total,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to complete daily challenge")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete daily challenge.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /xp/history -- XP transaction history
# ---------------------------------------------------------------------------


@router.get(
    "/xp/history",
    response_model=dict[str, XPHistoryResponse],
)
async def get_xp_history(
    request: Request,
    limit: int = Query(
        default=20, ge=1, le=100, description="Page size"
    ),
    offset: int = Query(
        default=0, ge=0, description="Pagination offset"
    ),
    start_date: str | None = Query(
        default=None, description="ISO date filter start"
    ),
    end_date: str | None = Query(
        default=None, description="ISO date filter end"
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Get XP transaction history with optional date filtering."""
    supabase = _get_supabase(request)

    try:
        query = (
            supabase.table("xp_transactions")
            .select("*", count="exact")
            .eq("user_id", user.id)
        )

        if start_date:
            query = query.gte(
                "created_at", f"{start_date}T00:00:00Z"
            )
        if end_date:
            query = query.lte(
                "created_at", f"{end_date}T23:59:59Z"
            )

        query = (
            query.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        result = await query.execute()

        rows = result.data or []
        total = (
            result.count
            if result.count is not None
            else len(rows)
        )

        transactions = [
            XPTransactionData(
                activity_type=r["activity_type"],
                xp_amount=r["xp_amount"],
                metadata=r.get("metadata") or {},
                created_at=r["created_at"],
            )
            for r in rows
        ]

        period_xp = sum(t.xp_amount for t in transactions)

        return {
            "data": XPHistoryResponse(
                transactions=transactions,
                total=total,
                period_xp=period_xp,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get XP history")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve XP history.",
        ) from exc


# ===========================================================================
# GDPR Endpoints (T130)
# ===========================================================================


class GDPRExportResponse(BaseModel):
    """Response containing all user data for GDPR export."""

    user_id: str
    exported_at: str
    profile: dict[str, Any] | None = None
    vocabulary_progress: list[dict[str, Any]] = []
    skill_mastery: list[dict[str, Any]] = []
    exam_attempts: list[dict[str, Any]] = []
    writing_evaluations: list[dict[str, Any]] = []
    pronunciation_scores: list[dict[str, Any]] = []
    conversation_sessions: list[dict[str, Any]] = []
    error_patterns: list[dict[str, Any]] = []
    ai_usage_logs: list[dict[str, Any]] = []


class GDPRDeleteResponse(BaseModel):
    """Confirmation response after account deletion."""

    user_id: str
    deleted_at: str
    tables_cleaned: list[str]
    message: str


def _get_supabase_admin(request: Request) -> Any:
    """Extract the service-role Supabase client from app state.

    Required for GDPR operations that bypass RLS policies.
    """
    supabase = getattr(request.app.state, "supabase_admin", None)
    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin database client not available.",
        )
    return supabase


async def _fetch_user_table_data(
    supabase: Any, table: str, user_id: str, id_column: str = "user_id"
) -> list[dict[str, Any]]:
    """Fetch all rows belonging to a user from a given table.

    Returns an empty list if the table does not exist or the query fails.
    """
    try:
        result = await (
            supabase.table(table)
            .select("*")
            .eq(id_column, user_id)
            .execute()
        )
        return result.data or []
    except Exception:
        logger.warning(
            "Failed to fetch data from table %s for user %s",
            table,
            user_id,
        )
        return []


async def _delete_user_table_data(
    supabase: Any, table: str, user_id: str, id_column: str = "user_id"
) -> bool:
    """Delete all rows belonging to a user from a given table.

    Returns True if deletion was attempted, False on failure.
    """
    try:
        await (
            supabase.table(table)
            .delete()
            .eq(id_column, user_id)
            .execute()
        )
        return True
    except Exception:
        logger.warning(
            "Failed to delete data from table %s for user %s",
            table,
            user_id,
        )
        return False


# ---------------------------------------------------------------------------
# GET /gdpr/export -- Export all user data as JSON
# ---------------------------------------------------------------------------


@router.get(
    "/gdpr/export",
    response_model=dict[str, GDPRExportResponse],
)
async def gdpr_export(
    request: Request,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Export all data associated with the authenticated user.

    Returns a comprehensive JSON structure containing the user's profile,
    learning progress, exam history, AI evaluations, and usage logs.
    This supports the GDPR data portability right (Article 20).
    """
    supabase = _get_supabase_admin(request)

    try:
        # Fetch profile (user_profiles uses id, not user_id)
        profile_result = await (
            supabase.table("user_profiles")
            .select("*")
            .eq("id", user.id)
            .execute()
        )
        profile = (profile_result.data or [None])[0]

        # Fetch data from all user-related tables
        vocab_progress = await _fetch_user_table_data(
            supabase, "vocabulary_progress", user.id
        )
        skill_mastery_data = await _fetch_user_table_data(
            supabase, "skill_mastery", user.id
        )
        exam_attempts = await _fetch_user_table_data(
            supabase, "exam_attempts", user.id
        )
        writing_evals = await _fetch_user_table_data(
            supabase, "writing_evaluations", user.id
        )
        pronunciation = await _fetch_user_table_data(
            supabase, "pronunciation_scores", user.id
        )
        conversations = await _fetch_user_table_data(
            supabase, "conversation_sessions", user.id
        )
        error_patterns_data = await _fetch_user_table_data(
            supabase, "error_patterns", user.id
        )
        ai_logs = await _fetch_user_table_data(
            supabase, "ai_model_usage_logs", user.id
        )

        export_data = GDPRExportResponse(
            user_id=user.id,
            exported_at=datetime.now(UTC).isoformat(),
            profile=profile,
            vocabulary_progress=vocab_progress,
            skill_mastery=skill_mastery_data,
            exam_attempts=exam_attempts,
            writing_evaluations=writing_evals,
            pronunciation_scores=pronunciation,
            conversation_sessions=conversations,
            error_patterns=error_patterns_data,
            ai_usage_logs=ai_logs,
        )

        return {"data": export_data}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("GDPR export failed for user %s", user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export user data.",
        ) from exc


# ---------------------------------------------------------------------------
# DELETE /gdpr/delete -- Delete account and all associated data
# ---------------------------------------------------------------------------


@router.delete(
    "/gdpr/delete",
    response_model=dict[str, GDPRDeleteResponse],
)
async def gdpr_delete(
    request: Request,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Delete the authenticated user's account and all associated data.

    Performs a cascading delete across all user-related tables:
    1. Dependent data (progress, evaluations, sessions, logs)
    2. Profile record
    3. Auth user (via Supabase Auth admin API)

    This supports the GDPR right to erasure (Article 17).

    WARNING: This action is irreversible.
    """
    supabase = _get_supabase_admin(request)

    # Tables to clean, in order (dependents first)
    tables_to_clean = [
        ("ai_model_usage_logs", "user_id"),
        ("error_patterns", "user_id"),
        ("conversation_sessions", "user_id"),
        ("pronunciation_scores", "user_id"),
        ("writing_evaluations", "user_id"),
        ("exam_attempts", "user_id"),
        ("skill_mastery", "user_id"),
        ("vocabulary_progress", "user_id"),
        ("daily_challenges", "user_id"),
        ("xp_transactions", "user_id"),
        ("badges", "user_id"),
    ]

    cleaned: list[str] = []

    try:
        # 1. Delete from dependent tables
        for table, id_col in tables_to_clean:
            success = await _delete_user_table_data(
                supabase, table, user.id, id_col
            )
            if success:
                cleaned.append(table)

        # 2. Delete profile (uses id, not user_id)
        try:
            await (
                supabase.table("user_profiles")
                .delete()
                .eq("id", user.id)
                .execute()
            )
            cleaned.append("user_profiles")
        except Exception:
            logger.warning(
                "Failed to delete user_profiles for user %s", user.id
            )

        # 3. Delete the auth user via Supabase Admin Auth API
        try:
            await supabase.auth.admin.delete_user(user.id)
            cleaned.append("auth.users")
        except Exception:
            logger.warning(
                "Failed to delete auth user %s (may require manual cleanup)",
                user.id,
            )

        return {
            "data": GDPRDeleteResponse(
                user_id=user.id,
                deleted_at=datetime.now(UTC).isoformat(),
                tables_cleaned=cleaned,
                message=(
                    "Tu cuenta y todos los datos asociados han sido eliminados. "
                    "Esta accion es irreversible."
                ),
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("GDPR delete failed for user %s", user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user data. Please contact support.",
        ) from exc
