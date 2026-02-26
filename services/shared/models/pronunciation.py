"""Pronunciation assessment domain models for the French learning platform.

Covers submission requests, phoneme-level scoring, pronunciation
exercises, and historical performance aggregation.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from .evaluation import EvalStatus
from .vocabulary import CEFRLevel


class PronunciationSubmission(BaseModel):
    """Client request to submit a pronunciation attempt for evaluation."""

    target_text: str = Field(
        min_length=1,
        description="The French text the learner was asked to pronounce",
    )
    audio_url: str = Field(
        min_length=1,
        description="URL of the recorded audio submission",
    )


class PronunciationScore(BaseModel):
    """Detailed scoring result for a single pronunciation attempt.

    Individual dimension scores range from 0.0 to 1.0.  The
    ``phoneme_alignment`` field stores a structured breakdown of
    per-phoneme accuracy from the speech recognition pipeline.
    """

    id: UUID
    user_id: UUID
    target_text: str = Field(
        min_length=1, description="The French text that was evaluated"
    )
    audio_url: str = Field(
        min_length=1, description="URL of the submitted audio recording"
    )
    transcription: str | None = Field(
        default=None,
        description="ASR transcription of the submitted audio",
    )
    phoneme_alignment: dict[str, Any] | None = Field(
        default=None,
        description="Per-phoneme alignment and accuracy breakdown",
    )
    phoneme_accuracy_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Aggregate phoneme-level accuracy score",
    )
    prosody_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Intonation and rhythm score",
    )
    fluency_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Speech fluency and pacing score",
    )
    overall_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Weighted overall pronunciation score",
    )
    improvement_suggestions: list[str] = Field(
        default_factory=list,
        description="Actionable tips for improving pronunciation",
    )
    status: EvalStatus = Field(default=EvalStatus.PENDING)
    created_at: datetime
    completed_at: datetime | None = None


class PronunciationExercise(BaseModel):
    """A pronunciation drill with reference audio and phonetic guide."""

    id: UUID
    target_text: str = Field(
        min_length=1, description="French text to be pronounced"
    )
    audio_url: str = Field(
        min_length=1, description="URL of the reference pronunciation audio"
    )
    cefr_level: CEFRLevel
    phonetic_ipa: str = Field(
        min_length=1, description="IPA transcription of the target text"
    )


class PronunciationHistory(BaseModel):
    """Aggregated pronunciation performance for a user.

    Provides the full list of scored attempts together with summary
    statistics for display on the learner's dashboard.
    """

    scores: list[PronunciationScore] = Field(
        default_factory=list, description="Chronological list of scored attempts"
    )
    average_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Mean overall score across all attempts",
    )
    total_attempts: int = Field(
        default=0, ge=0, description="Total number of pronunciation attempts"
    )
