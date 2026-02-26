"""Gamification domain models for the French learning platform.

Covers badges, XP transactions, daily challenges, and streak tracking
that drive learner engagement and retention.
"""

from datetime import date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from .lesson import Skill
from .vocabulary import CEFRLevel


class BadgeType(StrEnum):
    """Earnable badge categories."""

    CEFR_COMPLETION = "cefr_completion"
    STREAK_7 = "streak_7"
    STREAK_30 = "streak_30"
    STREAK_100 = "streak_100"
    FIRST_CONVERSATION = "first_conversation"
    FIRST_WRITING = "first_writing"
    FIRST_PRONUNCIATION = "first_pronunciation"
    VOCAB_100 = "vocab_100"
    VOCAB_500 = "vocab_500"
    VOCAB_1000 = "vocab_1000"


class ActivityType(StrEnum):
    """Types of learner activity that can generate XP."""

    VOCAB_REVIEW = "vocab_review"
    GRAMMAR_EXERCISE = "grammar_exercise"
    CONVERSATION = "conversation"
    WRITING = "writing"
    PRONUNCIATION = "pronunciation"
    LISTENING = "listening"
    EXAM = "exam"
    DAILY_CHALLENGE = "daily_challenge"


class Badge(BaseModel):
    """A badge earned by a user.

    Some badges (e.g. ``cefr_completion``) are tied to a specific CEFR
    level; for others the level is ``None``.
    """

    id: UUID
    user_id: UUID
    badge_type: BadgeType
    cefr_level: CEFRLevel | None = Field(
        default=None,
        description="CEFR level associated with this badge, if applicable",
    )
    earned_at: datetime


class XPTransaction(BaseModel):
    """A single XP award event linked to a learner activity.

    ``metadata`` can carry arbitrary context such as the exercise ID,
    lesson ID, or bonus multiplier that produced the transaction.
    """

    id: UUID
    user_id: UUID
    activity_type: ActivityType
    xp_amount: int = Field(
        gt=0, description="Amount of XP awarded (must be positive)"
    )
    metadata: dict[str, Any] | None = Field(
        default=None,
        description="Optional context about the activity that generated XP",
    )
    created_at: datetime


class DailyChallenge(BaseModel):
    """A daily challenge assigned to a user.

    Each challenge targets a specific skill and carries a JSON config
    describing the challenge parameters (e.g. number of items, time
    limit).
    """

    id: UUID
    user_id: UUID
    challenge_date: date = Field(description="Calendar date the challenge is for")
    challenge_type: Skill = Field(
        description="Skill category targeted by this challenge"
    )
    challenge_config: dict[str, Any] = Field(
        default_factory=dict,
        description="Challenge parameters (items, time limit, etc.)",
    )
    completed: bool = Field(
        default=False, description="Whether the user has completed this challenge"
    )
    xp_awarded: int = Field(
        default=0, ge=0, description="XP granted upon completion"
    )
    created_at: datetime


class StreakInfo(BaseModel):
    """Summary of a user's activity streak."""

    current_streak: int = Field(
        default=0, ge=0, description="Current consecutive-day activity streak"
    )
    longest_streak: int = Field(
        default=0, ge=0, description="All-time longest streak in days"
    )
    last_activity_date: date | None = Field(
        default=None,
        description="Date of the user's most recent activity",
    )
