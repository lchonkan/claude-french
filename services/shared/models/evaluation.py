"""AI evaluation domain models for writing and conversation assessments.

Covers submission requests, evaluation results, and conversation session
management for the French learning platform's AI-powered assessment
pipeline.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from .vocabulary import CEFRLevel


class EvalStatus(StrEnum):
    """Processing status of an AI evaluation job."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AIPlatform(StrEnum):
    """Supported AI platforms for evaluation tasks."""

    HUGGINGFACE = "huggingface"
    GEMINI = "gemini"


# ---------------------------------------------------------------------------
# Writing evaluation
# ---------------------------------------------------------------------------


class WritingSubmission(BaseModel):
    """Client request to submit a piece of writing for AI evaluation.

    The optional ``lesson_id`` links the submission to a specific lesson
    so progress can be attributed correctly.
    """

    prompt_text: str = Field(
        min_length=1, description="The writing prompt the learner responded to"
    )
    submitted_text: str = Field(
        min_length=1, description="The learner's written response in French"
    )
    cefr_level: CEFRLevel = Field(
        description="Target CEFR level used to calibrate evaluation criteria"
    )
    lesson_id: UUID | None = Field(
        default=None, description="Optional lesson this submission belongs to"
    )


class WritingEvaluationResult(BaseModel):
    """Result of an AI-powered writing evaluation.

    Individual dimension scores range from 0.0 to 1.0.  The
    ``evaluation_json`` field stores the full structured output from the
    AI model for downstream analysis.
    """

    id: UUID
    user_id: UUID
    status: EvalStatus = Field(default=EvalStatus.PENDING)
    grammar_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Grammar accuracy score",
    )
    vocabulary_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Vocabulary range and appropriateness score",
    )
    coherence_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Text coherence and cohesion score",
    )
    task_completion_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Degree to which the prompt was addressed",
    )
    overall_cefr: CEFRLevel | None = Field(
        default=None,
        description="Estimated CEFR level of the submitted writing",
    )
    feedback_es: str | None = Field(
        default=None,
        description="Detailed feedback in Spanish for the learner",
    )
    evaluation_json: dict[str, Any] | None = Field(
        default=None,
        description="Raw structured evaluation output from the AI model",
    )
    created_at: datetime
    completed_at: datetime | None = None


# ---------------------------------------------------------------------------
# Conversation evaluation
# ---------------------------------------------------------------------------


class ConversationMessage(BaseModel):
    """A single message within a conversation session."""

    role: str = Field(
        description="Message author role, e.g. 'user', 'assistant', 'system'"
    )
    content: str = Field(min_length=1, description="Message text content")
    timestamp: datetime


class ConversationSession(BaseModel):
    """A full conversation session between the learner and the AI tutor.

    Tracks the dialogue history together with per-dimension scores and
    the overall evaluation status.
    """

    id: UUID
    user_id: UUID
    cefr_level: CEFRLevel
    scenario_title: str = Field(
        min_length=1, description="Title of the conversation scenario"
    )
    messages: list[ConversationMessage] = Field(
        default_factory=list, description="Ordered list of conversation messages"
    )
    evaluation_json: dict[str, Any] | None = Field(
        default=None,
        description="Raw structured evaluation output from the AI model",
    )
    vocabulary_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Vocabulary range and appropriateness score",
    )
    grammar_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Grammar accuracy score",
    )
    communicative_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Communicative competence score",
    )
    status: EvalStatus = Field(default=EvalStatus.PENDING)
    created_at: datetime


class ConversationStartRequest(BaseModel):
    """Client request to begin a new conversation session."""

    cefr_level: CEFRLevel
    scenario_id: UUID | None = Field(
        default=None,
        description="Optional scenario to use; a random one is chosen if omitted",
    )


class ConversationMessageRequest(BaseModel):
    """Client request to send a message within an active conversation."""

    content: str = Field(
        min_length=1, description="The learner's message in French"
    )
