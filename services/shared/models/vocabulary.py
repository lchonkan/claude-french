"""Vocabulary domain models for the French learning platform.

Covers vocabulary items, spaced-repetition progress (FSRS), and review
request/response schemas used by both the API and worker services.
"""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class CEFRLevel(StrEnum):
    """Common European Framework of Reference language proficiency levels."""

    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class VocabularyItem(BaseModel):
    """A single French vocabulary entry with translation and metadata.

    Each item represents a French word or phrase paired with its Spanish
    translation, example sentences in both languages, and optional audio
    and phonetic data.  An embedding vector may be attached for
    similarity-based retrieval.
    """

    id: UUID
    french_text: str = Field(min_length=1, description="French word or phrase")
    spanish_translation: str = Field(
        min_length=1, description="Spanish translation of the French text"
    )
    example_sentence_fr: str = Field(
        min_length=1, description="Example sentence in French using the vocabulary"
    )
    example_sentence_es: str = Field(
        min_length=1, description="Spanish translation of the example sentence"
    )
    audio_url: str | None = Field(
        default=None, description="URL to a pronunciation audio clip"
    )
    phonetic_ipa: str | None = Field(
        default=None, description="IPA phonetic transcription"
    )
    difficulty_score: int = Field(
        ge=1, le=5, description="Difficulty rating from 1 (easiest) to 5 (hardest)"
    )
    cefr_level: CEFRLevel
    tags: list[str] = Field(
        default_factory=list,
        description="Freeform tags for categorisation (e.g. 'food', 'travel')",
    )
    embedding: list[float] | None = Field(
        default=None,
        description="Dense vector embedding for semantic similarity search",
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

    vocabulary_item_id: UUID
    rating: int = Field(
        ge=1,
        le=4,
        description="FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy",
    )


class VocabularyReviewResponse(BaseModel):
    """Server response after processing a vocabulary review.

    Contains the updated FSRS scheduling parameters so the client can
    display the next review date.
    """

    vocabulary_item_id: UUID
    next_review_date: datetime
    new_stability: float = Field(ge=0.0)
    new_difficulty: float = Field(ge=0.0)
    new_interval: float = Field(ge=0.0)
