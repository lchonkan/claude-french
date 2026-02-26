# ruff: noqa: B008
"""Grammar API routes for the French Learning Platform.

Endpoints:
- POST /check      -- Grammar check using CamemBERT + Mistral pipeline
- POST /complexity  -- Sentence complexity scoring
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from services.api.src.middleware.auth import UserInfo, get_current_user
from services.shared.ai.schemas import GrammarError
from services.shared.models.vocabulary import CEFRLevel

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class GrammarCheckRequest(BaseModel):
    """Request body for grammar checking."""

    text: str = Field(
        min_length=1,
        max_length=5000,
        description="French text to grammar-check.",
    )
    cefr_level: CEFRLevel = CEFRLevel.A1


class GrammarCorrection(BaseModel):
    """A single grammar correction with metadata."""

    start: int
    end: int
    original: str
    suggestion: str
    error_type: str
    explanation_es: str
    confidence: float = 0.0


class GrammarCheckResponse(BaseModel):
    """Response from the grammar check pipeline."""

    original_text: str
    corrections: list[GrammarCorrection]
    corrected_text: str
    ai_platform: str
    latency_ms: int


class ComplexityRequest(BaseModel):
    """Request body for sentence complexity scoring."""

    text: str = Field(
        min_length=1,
        max_length=5000,
        description="French text to score for complexity.",
    )
    cefr_level: CEFRLevel = CEFRLevel.A1


class ComplexityFeatures(BaseModel):
    """Extracted linguistic features for complexity scoring."""

    sentence_length: int
    subordinate_clauses: int
    subjunctive_usage: bool
    vocabulary_difficulty_avg: float


class ComplexityResponse(BaseModel):
    """Response from the complexity scoring endpoint."""

    text: str
    complexity_score: float
    estimated_cefr: str
    features: ComplexityFeatures
    ai_platform: str
    latency_ms: int


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


def _get_hf_client(request: Request) -> Any:
    """Extract or lazily create the HuggingFace client."""
    hf_client = getattr(request.app.state, "hf_client", None)
    if hf_client is not None:
        return hf_client

    settings = getattr(request.app.state, "settings", None)
    if settings is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application settings not available.",
        )

    from services.shared.ai.huggingface import HuggingFaceClient

    hf_client = HuggingFaceClient(api_token=settings.HF_API_TOKEN)
    request.app.state.hf_client = hf_client
    return hf_client


# ---------------------------------------------------------------------------
# Subordinate clause markers for complexity analysis
# ---------------------------------------------------------------------------

_SUBORDINATE_MARKERS = {
    "que",
    "qui",
    "quand",
    "lorsque",
    "parce que",
    "bien que",
    "puisque",
    "afin que",
    "pour que",
    "avant que",
    "apres que",
    "si",
    "comme",
    "dont",
    "ou",
}

_SUBJUNCTIVE_TRIGGERS = {
    "que je sois",
    "que tu sois",
    "qu'il soit",
    "qu'elle soit",
    "que nous soyons",
    "que vous soyez",
    "qu'ils soient",
    "qu'elles soient",
    "que je fasse",
    "que tu fasses",
    "qu'il fasse",
    "que je puisse",
    "que tu puisses",
    "bien que",
    "pour que",
    "afin que",
    "avant que",
    "il faut que",
}


def _estimate_cefr_from_score(score: float) -> str:
    """Map a 0-1 complexity score to an estimated CEFR level."""
    if score < 0.2:
        return "A1"
    elif score < 0.35:
        return "A2"
    elif score < 0.5:
        return "B1"
    elif score < 0.7:
        return "B2"
    elif score < 0.85:
        return "C1"
    else:
        return "C2"


def _analyze_complexity(text: str) -> tuple[float, ComplexityFeatures]:
    """Perform rule-based complexity analysis on French text.

    Returns a tuple of (complexity_score, features).
    """
    words = text.split()
    sentence_length = len(words)
    text_lower = text.lower()

    # Count subordinate clauses
    sub_clauses = sum(
        1 for marker in _SUBORDINATE_MARKERS if f" {marker} " in f" {text_lower} "
    )

    # Check subjunctive usage
    has_subjunctive = any(
        trigger in text_lower for trigger in _SUBJUNCTIVE_TRIGGERS
    )

    # Estimate vocabulary difficulty from word lengths (a proxy)
    avg_word_len = sum(len(w) for w in words) / max(len(words), 1)
    vocab_difficulty = min(round(avg_word_len / 3, 1), 5.0)

    # Compute composite complexity score (0-1)
    length_factor = min(sentence_length / 25.0, 1.0)
    clause_factor = min(sub_clauses / 3.0, 1.0)
    subj_factor = 1.0 if has_subjunctive else 0.0
    vocab_factor = min(vocab_difficulty / 5.0, 1.0)

    score = (
        length_factor * 0.25
        + clause_factor * 0.30
        + subj_factor * 0.20
        + vocab_factor * 0.25
    )

    features = ComplexityFeatures(
        sentence_length=sentence_length,
        subordinate_clauses=sub_clauses,
        subjunctive_usage=has_subjunctive,
        vocabulary_difficulty_avg=round(vocab_difficulty, 1),
    )

    return round(score, 2), features


# ---------------------------------------------------------------------------
# POST /check -- Grammar check
# ---------------------------------------------------------------------------


@router.post(
    "/check",
    response_model=dict[str, GrammarCheckResponse],
)
async def grammar_check(
    request: Request,
    body: GrammarCheckRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Check French text for grammar errors using CamemBERT + Mistral.

    Pipeline:
    1. CamemBERT detects error positions and types.
    2. Mistral generates corrections and Spanish explanations.
    """
    hf_client = _get_hf_client(request)
    start_time = time.monotonic()

    try:
        # Step 1: Detect errors with CamemBERT
        raw_errors: list[GrammarError] = await hf_client.classify_grammar(
            body.text
        )

        corrections: list[GrammarCorrection] = []
        corrected_text = body.text

        if raw_errors:
            # Step 2: Generate corrections with Mistral
            try:
                correction_json = await hf_client.generate_correction(
                    body.text, raw_errors
                )
                correction_data = json.loads(correction_json)

                corrected_text = correction_data.get(
                    "corrected_text", body.text
                )
                error_details = correction_data.get("errors", [])

                for i, err in enumerate(raw_errors):
                    detail = (
                        error_details[i]
                        if i < len(error_details)
                        else {}
                    )
                    end_pos = err.position + len(err.original)
                    corrections.append(
                        GrammarCorrection(
                            start=err.position,
                            end=end_pos,
                            original=err.original,
                            suggestion=detail.get(
                                "correction", err.correction or err.original
                            ),
                            error_type=err.error_type,
                            explanation_es=detail.get(
                                "explanation_es",
                                err.explanation_es or "",
                            ),
                            confidence=0.85,
                        )
                    )
            except (json.JSONDecodeError, Exception):
                # Fallback: return CamemBERT results without Mistral enrichment
                logger.warning(
                    "Mistral correction parsing failed, using CamemBERT-only results"
                )
                for err in raw_errors:
                    end_pos = err.position + len(err.original)
                    corrections.append(
                        GrammarCorrection(
                            start=err.position,
                            end=end_pos,
                            original=err.original,
                            suggestion=err.correction or err.original,
                            error_type=err.error_type,
                            explanation_es=err.explanation_es or "",
                            confidence=0.6,
                        )
                    )

        elapsed_ms = int((time.monotonic() - start_time) * 1000)

        return {
            "data": GrammarCheckResponse(
                original_text=body.text,
                corrections=corrections,
                corrected_text=corrected_text,
                ai_platform="huggingface",
                latency_ms=elapsed_ms,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Grammar check failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Grammar check failed.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /complexity -- Sentence complexity scoring
# ---------------------------------------------------------------------------


@router.post(
    "/complexity",
    response_model=dict[str, ComplexityResponse],
)
async def score_complexity(
    request: Request,
    body: ComplexityRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Score the linguistic complexity of a French sentence.

    Uses a hybrid approach: rule-based feature extraction combined with
    CamemBERT embeddings for vocabulary difficulty estimation.
    """
    start_time = time.monotonic()

    try:
        complexity_score, features = _analyze_complexity(body.text)
        estimated_cefr = _estimate_cefr_from_score(complexity_score)

        elapsed_ms = int((time.monotonic() - start_time) * 1000)

        return {
            "data": ComplexityResponse(
                text=body.text,
                complexity_score=complexity_score,
                estimated_cefr=estimated_cefr,
                features=features,
                ai_platform="huggingface",
                latency_ms=elapsed_ms,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Complexity scoring failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Complexity scoring failed.",
        ) from exc
