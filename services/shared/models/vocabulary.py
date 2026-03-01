"""Vocabulary domain models for the French learning platform.

Covers vocabulary items, spaced-repetition progress (FSRS), and review
request/response schemas used by both the API and worker services.
"""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CEFRLevel(StrEnum):
    """Common European Framework of Reference language proficiency levels."""

    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class VocabularyItem(BaseModel):
    """A single French vocabulary entry with translation and metadata."""

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )

    id: UUID
    french_text: str = Field(
        min_length=1, alias="word", description="French word or phrase"
    )
    spanish_translation: str = Field(
        min_length=1,
        alias="translation",
        description="Spanish translation of the French text",
    )
    example_sentence_fr: str = Field(
        min_length=1,
        alias="example_sentence",
        description="Example sentence in French",
    )
    example_sentence_es: str = Field(
        min_length=1,
        alias="example_translation",
        description="Spanish translation of the example sentence",
    )
    audio_url: str | None = Field(
        default=None, description="URL to a pronunciation audio clip"
    )
    phonetic_ipa: str | None = Field(
        default=None, alias="phonetic", description="IPA phonetic transcription"
    )
    difficulty_score: int = Field(
        ge=1, le=5, description="Difficulty rating"
    )
    cefr_level: CEFRLevel
    category: str = Field(default="General")
    tags: list[str] = Field(
        default_factory=list,
        description="Freeform tags",
    )
    embedding: list[float] | None = Field(
        default=None,
        description="Dense vector embedding",
    )
    created_at: datetime



class VocabularyProgress(BaseModel):
    """Tracks a single user's spaced-repetition state for one vocabulary item.

    All scheduling fields follow the FSRS (Free Spaced Repetition Scheduler)
    algorithm parameters.
    """

    id: UUID
    user_id: UUID
    vocabulary_item_id: UUID
    fsrs_stability: float = Field(
        default=0.0, ge=0.0, description="FSRS memory stability parameter"
    )
    fsrs_difficulty: float = Field(
        default=0.0, ge=0.0, description="FSRS difficulty parameter"
    )
    fsrs_due_date: datetime = Field(description="Next scheduled review date")
    fsrs_interval: float = Field(
        default=0.0, ge=0.0, description="Current review interval in days"
    )
    review_count: int = Field(default=0, ge=0, description="Total number of reviews")
    correct_count: int = Field(
        default=0, ge=0, description="Number of reviews rated Good or Easy"
    )
    last_review_rating: int | None = Field(
        default=None,
        ge=1,
        le=4,
        description="Rating from the most recent review (1-4)",
    )
    last_reviewed_at: datetime | None = Field(
        default=None, description="Timestamp of the most recent review"
    )


class VocabularyReviewRequest(BaseModel):
    """Payload submitted by the client after a vocabulary review."""

    model_config = ConfigDict(populate_by_name=True)

    vocabulary_item_id: UUID = Field(alias="item_id")
    rating: int = Field(
        ge=1,
        le=4,
        description="FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy",
    )


class VocabularyReviewResponse(BaseModel):
    """Server response after processing a vocabulary review."""

    model_config = ConfigDict(populate_by_name=True)

    vocabulary_item_id: UUID = Field(alias="item_id")
    next_review_date: datetime = Field(alias="next_review")
    new_stability: float = Field(ge=0.0, alias="ease_factor")
    new_difficulty: float = Field(ge=0.0, alias="mastery_score")
    new_interval: float = Field(ge=0.0, alias="interval_days")
    xp_earned: int = Field(default=0)
