"""Lesson and exercise domain models for the French learning platform.

Defines the structure of lessons, their exercises, and the
request/response schemas for exercise submissions.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from .vocabulary import CEFRLevel


class Skill(StrEnum):
    """Learnable skill categories tracked across the platform."""

    VOCABULARY = "vocabulary"
    GRAMMAR = "grammar"
    WRITING = "writing"
    LISTENING = "listening"
    PRONUNCIATION = "pronunciation"
    CONVERSATION = "conversation"


class Module(StrEnum):
    """Top-level content modules that organise lessons."""

    VOCABULARY = "vocabulary"
    GRAMMAR = "grammar"
    WRITING = "writing"
    LISTENING = "listening"
    PRONUNCIATION = "pronunciation"
    CONVERSATION = "conversation"
    CULTURAL = "cultural"


class ExerciseType(StrEnum):
    """Types of interactive exercises available within lessons."""

    FILL_BLANK = "fill_blank"
    REORDER = "reorder"
    CONJUGATE = "conjugate"
    ERROR_CORRECT = "error_correct"
    MULTIPLE_CHOICE = "multiple_choice"
    OPEN_ENDED = "open_ended"


class Lesson(BaseModel):
    """A structured lesson belonging to a module and CEFR level.

    Lessons contain ordered exercises and carry bilingual metadata so
    the UI can display titles and descriptions in Spanish.
    """

    id: UUID
    module: Module
    cefr_level: CEFRLevel
    title_es: str = Field(min_length=1, description="Lesson title in Spanish")
    title_fr: str = Field(min_length=1, description="Lesson title in French")
    description_es: str = Field(
        min_length=1, description="Lesson description in Spanish"
    )
    content: dict[str, Any] = Field(
        default_factory=dict,
        description="Flexible JSON content payload for the lesson body",
    )
    order_index: int = Field(
        ge=0, description="Sort position within the module and CEFR level"
    )
    is_active: bool = Field(
        default=True, description="Whether the lesson is visible to learners"
    )
    created_at: datetime
    updated_at: datetime | None = None


class LessonExercise(BaseModel):
    """A single exercise within a lesson.

    Exercises are ordered and carry a difficulty tier (1-3) that allows
    the platform to present progressively harder tasks.
    """

    id: UUID
    lesson_id: UUID
    exercise_type: ExerciseType
    prompt_es: str = Field(
        min_length=1, description="Exercise prompt displayed in Spanish"
    )
    content: dict[str, Any] = Field(
        description="Exercise-specific payload (options, blanks, sentences, etc.)"
    )
    difficulty_tier: int = Field(
        ge=1,
        le=3,
        description="Difficulty tier: 1=easy, 2=medium, 3=hard",
    )
    order_index: int = Field(ge=0, description="Sort position within the lesson")


class ExerciseSubmission(BaseModel):
    """Client request submitting an answer to a lesson exercise.

    The ``answer`` field is polymorphic: it may be a plain string, a list
    of strings (for reorder exercises), or a dict (for structured
    answers like conjugation tables).
    """

    exercise_id: UUID
    answer: str | list[str] | dict[str, Any] = Field(
        description="User's answer in the format expected by the exercise type"
    )


class ExerciseResult(BaseModel):
    """Server response after evaluating an exercise submission."""

    correct: bool = Field(description="Whether the submitted answer was correct")
    score: float = Field(
        ge=0.0,
        le=1.0,
        description="Normalised score between 0.0 and 1.0",
    )
    feedback_es: str = Field(
        description="Feedback message in Spanish explaining the result"
    )
    correct_answer: str | None = Field(
        default=None,
        description="The expected correct answer, shown when the submission is wrong",
    )
