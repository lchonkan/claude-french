"""Skill mastery and progression domain models for the French learning platform.

Tracks per-skill mastery percentages, exercise result history, and the
aggregated dashboard view that powers the learner's progress screen.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from .lesson import Skill
from .vocabulary import CEFRLevel


class ExerciseResultRecord(BaseModel):
    """An individual exercise result stored as part of the mastery history."""

    score: float = Field(
        ge=0.0,
        le=1.0,
        description="Normalised score between 0.0 and 1.0",
    )
    timestamp: datetime


class SkillMastery(BaseModel):
    """Mastery state for a single skill at a given CEFR level.

    ``mastery_percentage`` represents the learner's current proficiency
    in the skill, derived from recent exercise performance and weighted
    scoring rules.
    """

    id: UUID
    user_id: UUID
    skill: Skill
    cefr_level: CEFRLevel
    mastery_percentage: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
        description="Current mastery as a percentage (0-100)",
    )
    exercise_results: list[ExerciseResultRecord] = Field(
        default_factory=list,
        description="Recent exercise results used to compute mastery",
    )
    total_exercises: int = Field(
        default=0, ge=0, description="Cumulative number of exercises attempted"
    )
    total_correct: int = Field(
        default=0, ge=0, description="Cumulative number of correct answers"
    )
    time_spent_seconds: int = Field(
        default=0, ge=0, description="Total time spent practising this skill"
    )
    updated_at: datetime


class MasteryDashboard(BaseModel):
    """Aggregated mastery view presented on the learner's dashboard.

    Combines per-skill mastery records with gamification counters
    (XP and streaks) for a single-request dashboard payload.
    """

    overall_level: CEFRLevel = Field(
        description="The learner's current overall CEFR level"
    )
    skills: list[SkillMastery] = Field(
        description="Mastery state for each tracked skill"
    )
    xp_total: int = Field(default=0, ge=0, description="Lifetime XP earned")
    current_streak: int = Field(
        default=0, ge=0, description="Current consecutive-day activity streak"
    )
    longest_streak: int = Field(
        default=0, ge=0, description="All-time longest streak in days"
    )


class LevelUnlockCheck(BaseModel):
    """Result of checking whether a learner can unlock the next CEFR level
    for a given skill.

    Both mastery threshold and a passing exam score must be met before
    ``can_unlock`` is ``True``.
    """

    skill: Skill
    current_level: CEFRLevel
    mastery_met: bool = Field(
        description="Whether the mastery percentage threshold has been reached"
    )
    exam_passed: bool = Field(
        description="Whether the level-up exam has been passed"
    )
    can_unlock: bool = Field(
        description="True only when both mastery_met and exam_passed are True"
    )
