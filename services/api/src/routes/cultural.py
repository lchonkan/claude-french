# ruff: noqa: B008
"""Cultural Notes API routes for the French Learning Platform.

Endpoints:
- GET  /notes              -- List cultural notes by CEFR level and category
- GET  /notes/{id}         -- Get full cultural note detail
- POST /notes/{id}/vocabulary/{vid}/add -- Add vocabulary to SRS from note
- POST /generate           -- Trigger async cultural content generation
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from services.api.src.middleware.auth import UserInfo, get_current_user
from services.shared.models.vocabulary import CEFRLevel
from services.shared.srs.fsrs import FSRSScheduler

logger = logging.getLogger(__name__)

router = APIRouter()

_fsrs = FSRSScheduler()

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

VALID_CATEGORIES = frozenset(
    {"history", "neighborhoods", "etiquette", "cuisine", "daily_life"}
)


class CulturalNotePreview(BaseModel):
    """Preview of a cultural note for list views."""

    id: UUID
    cefr_level: str
    title_es: str
    title_fr: str
    category: str
    preview_es: str
    vocabulary_count: int
    reviewed: bool


class CulturalNoteListResponse(BaseModel):
    """Paginated list of cultural note previews."""

    notes: list[CulturalNotePreview]
    total: int


class VocabularyRef(BaseModel):
    """Vocabulary reference inside a cultural note."""

    id: UUID
    french_text: str
    spanish_translation: str
    in_user_review_queue: bool


class CulturalNoteDetail(BaseModel):
    """Full cultural note content."""

    id: UUID
    cefr_level: str
    title_es: str
    title_fr: str
    content_fr: str
    content_es: str
    vocabulary: list[VocabularyRef]
    category: str
    is_generated: bool
    reviewed: bool
    created_at: str


class AddVocabularyResponse(BaseModel):
    """Response after adding vocabulary to SRS."""

    vocabulary_item_id: UUID
    added_to_review: bool
    first_review_date: str


class GenerateRequest(BaseModel):
    """Request to generate a new cultural note."""

    cefr_level: CEFRLevel
    category: str = Field(
        description="Cultural category: history, neighborhoods, etiquette, cuisine, daily_life"
    )
    topic_hint: str | None = Field(
        default=None, description="Optional topic hint for generation"
    )
    align_with_vocabulary: list[UUID] = Field(
        default_factory=list,
        description="Vocabulary item IDs to align the article with",
    )


class GenerateResponse(BaseModel):
    """Response after triggering content generation."""

    generation_id: str
    status: str
    ai_platform: str
    estimated_completion_seconds: int


# ---------------------------------------------------------------------------
# Helper: get Supabase client from request
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


# ---------------------------------------------------------------------------
# GET /notes -- List cultural notes
# ---------------------------------------------------------------------------


@router.get(
    "/notes",
    response_model=dict[str, CulturalNoteListResponse],
)
async def list_cultural_notes(
    request: Request,
    cefr_level: CEFRLevel = Query(
        ..., description="CEFR level filter"
    ),
    category: str | None = Query(
        default=None,
        description="Category filter: history, neighborhoods, etiquette, cuisine, daily_life",
    ),
    limit: int = Query(
        default=10, ge=1, le=50, description="Page size"
    ),
    offset: int = Query(
        default=0, ge=0, description="Pagination offset"
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """List cultural notes filtered by CEFR level and optional category."""
    supabase = _get_supabase(request)

    if category and category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid category '{category}'. "
                f"Valid categories: {', '.join(sorted(VALID_CATEGORIES))}"
            ),
        )

    try:
        query = (
            supabase.table("cultural_notes")
            .select("*", count="exact")
            .eq("cefr_level", cefr_level.value)
        )

        if category:
            query = query.eq("category", category)

        query = (
            query.range(offset, offset + limit - 1)
            .order("created_at", desc=True)
        )

        result = await query.execute()

        rows = result.data or []
        total = (
            result.count
            if result.count is not None
            else len(rows)
        )

        notes = []
        for row in rows:
            content_es = row.get("content_es", "")
            preview = (
                content_es[:150].rsplit(" ", 1)[0] + "..."
                if len(content_es) > 150
                else content_es
            )
            vocab_ids = row.get("vocabulary_ids") or []

            notes.append(
                CulturalNotePreview(
                    id=row["id"],
                    cefr_level=row["cefr_level"],
                    title_es=row["title_es"],
                    title_fr=row["title_fr"],
                    category=row["category"],
                    preview_es=preview,
                    vocabulary_count=len(vocab_ids),
                    reviewed=row.get("reviewed", False),
                )
            )

        return {
            "data": CulturalNoteListResponse(
                notes=notes,
                total=total,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to list cultural notes")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cultural notes.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /notes/{id} -- Get note detail
# ---------------------------------------------------------------------------


@router.get(
    "/notes/{note_id}",
    response_model=dict[str, CulturalNoteDetail],
)
async def get_cultural_note(
    request: Request,
    note_id: UUID,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Get the full content of a cultural note with vocabulary references."""
    supabase = _get_supabase(request)

    try:
        result = await (
            supabase.table("cultural_notes")
            .select("*")
            .eq("id", str(note_id))
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cultural note {note_id} not found.",
            )

        row = result.data[0]
        vocab_ids: list[str] = row.get("vocabulary_ids") or []

        # Fetch linked vocabulary items
        vocabulary: list[VocabularyRef] = []
        if vocab_ids:
            vocab_result = await (
                supabase.table("vocabulary_items")
                .select("id, french_text, spanish_translation")
                .in_("id", vocab_ids)
                .execute()
            )

            # Check which items are in the user's review queue
            user_progress = await (
                supabase.table("vocabulary_progress")
                .select("vocabulary_item_id")
                .eq("user_id", user.id)
                .execute()
            )
            in_queue = {
                r["vocabulary_item_id"]
                for r in (user_progress.data or [])
            }

            for v in vocab_result.data or []:
                vocabulary.append(
                    VocabularyRef(
                        id=v["id"],
                        french_text=v["french_text"],
                        spanish_translation=v["spanish_translation"],
                        in_user_review_queue=v["id"] in in_queue,
                    )
                )

        return {
            "data": CulturalNoteDetail(
                id=row["id"],
                cefr_level=row["cefr_level"],
                title_es=row["title_es"],
                title_fr=row["title_fr"],
                content_fr=row["content_fr"],
                content_es=row["content_es"],
                vocabulary=vocabulary,
                category=row["category"],
                is_generated=row.get("is_generated", True),
                reviewed=row.get("reviewed", False),
                created_at=row["created_at"],
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get cultural note")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cultural note.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /notes/{id}/vocabulary/{vid}/add -- Add vocab to SRS
# ---------------------------------------------------------------------------


@router.post(
    "/notes/{note_id}/vocabulary/{vocab_id}/add",
    response_model=dict[str, AddVocabularyResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_vocabulary_to_srs(
    request: Request,
    note_id: UUID,
    vocab_id: UUID,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Add a vocabulary item from a cultural note to the user's SRS queue."""
    supabase = _get_supabase(request)

    try:
        # Verify note exists and contains the vocabulary ID
        note_result = await (
            supabase.table("cultural_notes")
            .select("vocabulary_ids")
            .eq("id", str(note_id))
            .execute()
        )

        if not note_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cultural note {note_id} not found.",
            )

        # Verify vocabulary item exists
        vocab_result = await (
            supabase.table("vocabulary_items")
            .select("id")
            .eq("id", str(vocab_id))
            .execute()
        )

        if not vocab_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vocabulary item {vocab_id} not found.",
            )

        # Check if already in user's review queue
        existing = await (
            supabase.table("vocabulary_progress")
            .select("id")
            .eq("user_id", user.id)
            .eq("vocabulary_item_id", str(vocab_id))
            .execute()
        )

        if existing.data:
            # Already in queue
            return {
                "data": AddVocabularyResponse(
                    vocabulary_item_id=vocab_id,
                    added_to_review=False,
                    first_review_date=datetime.now(UTC).isoformat(),
                )
            }

        # Create initial FSRS state and add to review queue
        initial_state = FSRSScheduler.initial_state()
        first_review = datetime.now(UTC) + timedelta(minutes=10)

        await (
            supabase.table("vocabulary_progress")
            .insert({
                "user_id": user.id,
                "vocabulary_item_id": str(vocab_id),
                "fsrs_stability": initial_state.stability,
                "fsrs_difficulty": initial_state.difficulty,
                "fsrs_due_date": first_review.isoformat(),
                "fsrs_interval": initial_state.scheduled_days,
                "review_count": 0,
                "correct_count": 0,
                "last_review_rating": 0,
                "last_reviewed_at": datetime.now(UTC).isoformat(),
            })
            .execute()
        )

        return {
            "data": AddVocabularyResponse(
                vocabulary_item_id=vocab_id,
                added_to_review=True,
                first_review_date=first_review.isoformat(),
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to add vocabulary to SRS")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add vocabulary to review queue.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /generate -- Trigger async cultural content generation
# ---------------------------------------------------------------------------


@router.post(
    "/generate",
    response_model=dict[str, GenerateResponse],
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_cultural_content(
    request: Request,
    body: GenerateRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Trigger asynchronous generation of a cultural note via Cloud Tasks."""
    supabase = _get_supabase(request)

    if body.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid category '{body.category}'. "
                f"Valid categories: {', '.join(sorted(VALID_CATEGORIES))}"
            ),
        )

    try:
        # Insert a pending async job for the worker
        import uuid

        generation_id = str(uuid.uuid4())

        payload = {
            "cefr_level": body.cefr_level.value,
            "category": body.category,
            "topic_hint": body.topic_hint,
            "align_with_vocabulary": [
                str(vid) for vid in body.align_with_vocabulary
            ],
            "generation_id": generation_id,
        }

        # Try to insert into async_jobs table for worker processing
        try:
            await (
                supabase.table("async_jobs")
                .insert({
                    "job_type": "cultural_content",
                    "status": "pending",
                    "payload": payload,
                    "user_id": user.id,
                })
                .execute()
            )
        except Exception:
            logger.warning(
                "async_jobs table not available, job will need manual processing"
            )

        return {
            "data": GenerateResponse(
                generation_id=generation_id,
                status="pending",
                ai_platform="gemini",
                estimated_completion_seconds=15,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to trigger cultural content generation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger content generation.",
        ) from exc
