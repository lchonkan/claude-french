"""Structured output schemas for AI evaluation responses.

Pydantic models defining the contract between AI clients (HuggingFace, Gemini)
and the rest of the platform. All AI evaluation methods return instances of
these models, ensuring type safety and consistent serialization.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Grammar
# ---------------------------------------------------------------------------

class GrammarError(BaseModel):
    """A single grammar error detected in learner text."""

    position: int = Field(
        ..., description="Character offset where the error starts in the original text."
    )
    error_type: str = Field(
        ..., description="Category of grammar error (e.g. 'verb_conjugation', 'gender_agreement')."
    )
    original: str = Field(..., description="The erroneous text span.")
    correction: str = Field(..., description="Suggested corrected text.")
    explanation_es: str = Field(
        ..., description="Explanation of the error in Spanish for the learner."
    )


# ---------------------------------------------------------------------------
# Writing evaluation
# ---------------------------------------------------------------------------

class WritingEvaluation(BaseModel):
    """Structured CEFR-aligned evaluation of a learner's written submission."""

    grammar_score: float = Field(
        ..., ge=0.0, le=1.0, description="Grammar accuracy score (0-1)."
    )
    vocabulary_score: float = Field(
        ..., ge=0.0, le=1.0, description="Vocabulary range and appropriateness score (0-1)."
    )
    coherence_score: float = Field(
        ..., ge=0.0, le=1.0, description="Text coherence and organization score (0-1)."
    )
    task_completion_score: float = Field(
        ..., ge=0.0, le=1.0, description="How well the learner addressed the prompt (0-1)."
    )
    overall_cefr: str = Field(
        ..., description="Assessed CEFR level for this writing sample (e.g. 'A1', 'B2')."
    )
    feedback_es: str = Field(
        ..., description="Detailed feedback text in Spanish."
    )
    details: list[GrammarError] = Field(
        default_factory=list,
        description="Specific errors identified in the text.",
    )


# ---------------------------------------------------------------------------
# Conversation evaluation
# ---------------------------------------------------------------------------

class ConversationEvaluation(BaseModel):
    """Evaluation of a learner's conversation session."""

    vocabulary_score: float = Field(
        ..., ge=0.0, le=1.0, description="Vocabulary usage score (0-1)."
    )
    grammar_score: float = Field(
        ..., ge=0.0, le=1.0, description="Grammar accuracy score (0-1)."
    )
    communicative_score: float = Field(
        ..., ge=0.0, le=1.0, description="Communicative effectiveness score (0-1)."
    )
    feedback_es: str = Field(
        ..., description="Session feedback in Spanish."
    )


# ---------------------------------------------------------------------------
# Pronunciation evaluation
# ---------------------------------------------------------------------------

class PhonemeDetail(BaseModel):
    """Per-phoneme accuracy data from pronunciation analysis."""

    phoneme: str = Field(..., description="IPA phoneme symbol.")
    expected: str = Field(..., description="Expected phoneme realization.")
    actual: str = Field(..., description="Learner's actual realization.")
    score: float = Field(
        ..., ge=0.0, le=1.0, description="Accuracy score for this phoneme (0-1)."
    )
    timestamp_start: float = Field(
        ..., ge=0.0, description="Start time in seconds within the audio."
    )
    timestamp_end: float = Field(
        ..., ge=0.0, description="End time in seconds within the audio."
    )


class PhonemeAlignment(BaseModel):
    """Full phoneme alignment result from Wav2Vec2 analysis."""

    phonemes: list[PhonemeDetail] = Field(
        default_factory=list,
        description="Ordered list of aligned phonemes.",
    )


class PronunciationEvaluation(BaseModel):
    """Multimodal pronunciation evaluation combining transcription, phoneme,
    and holistic audio analysis."""

    phoneme_accuracy: float = Field(
        ..., ge=0.0, le=1.0, description="Average phoneme accuracy (0-1)."
    )
    prosody_score: float = Field(
        ..., ge=0.0, le=1.0, description="Rhythm and intonation score (0-1)."
    )
    fluency_score: float = Field(
        ..., ge=0.0, le=1.0, description="Speech fluency score (0-1)."
    )
    overall_score: float = Field(
        ..., ge=0.0, le=1.0, description="Composite pronunciation score (0-1)."
    )
    phoneme_details: list[PhonemeDetail] = Field(
        default_factory=list,
        description="Per-phoneme breakdown.",
    )
    suggestions: list[str] = Field(
        default_factory=list,
        description="Improvement suggestions in Spanish.",
    )


# ---------------------------------------------------------------------------
# Lesson / cultural content generation
# ---------------------------------------------------------------------------

class LessonContent(BaseModel):
    """AI-generated lesson content for a specific module and CEFR level."""

    title_fr: str = Field(..., description="Lesson title in French.")
    title_es: str = Field(..., description="Lesson title in Spanish.")
    description_es: str = Field(..., description="Lesson description in Spanish.")
    content: dict = Field(
        default_factory=dict,
        description="Structured lesson content (varies by module).",
    )
    exercises: list[dict] = Field(
        default_factory=list,
        description="Generated exercises for the lesson.",
    )


class CulturalContent(BaseModel):
    """AI-generated Paris-focused cultural enrichment article."""

    title_fr: str = Field(..., description="Article title in French.")
    title_es: str = Field(..., description="Article title in Spanish.")
    content_fr: str = Field(..., description="Article body in French.")
    content_es: str = Field(..., description="Article body / summary in Spanish.")
    vocabulary_ids: list[str] = Field(
        default_factory=list,
        description="UUIDs of linked vocabulary items.",
    )
    category: str = Field(
        ..., description="Cultural category (history, neighborhoods, etiquette, cuisine, daily_life)."
    )


# ---------------------------------------------------------------------------
# Difficulty recalibration
# ---------------------------------------------------------------------------

class SkillAdjustment(BaseModel):
    """A single skill-level difficulty adjustment recommendation."""

    skill: str = Field(
        ..., description="Skill name (vocabulary, grammar, writing, listening, pronunciation, conversation)."
    )
    current_difficulty: int = Field(
        ..., ge=1, le=5, description="Current within-level difficulty tier."
    )
    recommended_difficulty: int = Field(
        ..., ge=1, le=5, description="Recommended new difficulty tier."
    )
    reason: str = Field(..., description="Justification for the adjustment.")


class DifficultyAdjustment(BaseModel):
    """Complete set of difficulty recalibration recommendations."""

    adjustments: list[SkillAdjustment] = Field(
        default_factory=list,
        description="Per-skill difficulty adjustments.",
    )
