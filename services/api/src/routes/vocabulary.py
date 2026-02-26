# ruff: noqa: B008
"""Vocabulary API routes for the French Learning Platform.

Endpoints:
- GET  /items            -- List vocabulary items (filtered by CEFR level)
- GET  /review           -- Get items due for SRS review
- POST /review           -- Submit a review rating (FSRS update)
- POST /classify         -- Classify vocabulary difficulty via CamemBERT
- GET  /items/{id}/similar -- Find semantically similar items
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from services.api.src.middleware.auth import UserInfo, get_current_user
from services.shared.models.vocabulary import (
    CEFRLevel,
    VocabularyItem,
    VocabularyReviewRequest,
    VocabularyReviewResponse,
)
from services.shared.srs.fsrs import CardState, FSRSScheduler

logger = logging.getLogger(__name__)

router = APIRouter()

# Singleton FSRS scheduler (stateless -- safe to share)
_fsrs = FSRSScheduler()


# ---------------------------------------------------------------------------
# Request / response schemas specific to the API layer
# ---------------------------------------------------------------------------


class VocabularyListResponse(BaseModel):
    """Paginated list of vocabulary items."""

    items: list[VocabularyItem]
    total: int
    limit: int
    offset: int


class ReviewItemOut(BaseModel):
    """A single item due for review, with its progress metadata."""

    id: UUID
    vocabulary_item: VocabularyItem
    fsrs_due_date: datetime
    review_count: int
    correct_count: int


class ReviewListResponse(BaseModel):
    """Response for the review queue endpoint."""

    items: list[ReviewItemOut]
    total_due: int
    new_available: int


class ClassifyRequest(BaseModel):
    """Request body for vocabulary difficulty classification."""

    text: str = Field(
        min_length=1,
        description="French word or phrase to classify",
    )
    cefr_level: CEFRLevel = CEFRLevel.A1


class ClassifyResponse(BaseModel):
    """Response from vocabulary difficulty classification."""

    text: str
    difficulty_score: int
    confidence: float
    ai_platform: str
    latency_ms: int


class SimilarItemOut(BaseModel):
    """A vocabulary item with its similarity score."""

    id: UUID
    french_text: str
    similarity_score: float


class SimilarItemsResponse(BaseModel):
    """Response for the similar items endpoint."""

    source_item_id: UUID
    similar_items: list[SimilarItemOut]


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


def _get_hf_client(request: Request) -> Any:
    """Extract the HuggingFace client from app state, or create one."""
    hf_client = getattr(request.app.state, "hf_client", None)
    if hf_client is not None:
        return hf_client

    # Lazy initialisation: create client from settings
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
# GET /items -- List vocabulary items
# ---------------------------------------------------------------------------


@router.get(
    "/items",
    response_model=dict[str, VocabularyListResponse],
)
async def list_vocabulary_items(    request: Request,
    cefr_level: CEFRLevel = Query(
        ..., description="CEFR level filter"
    ),
    limit: int = Query(
        default=50, ge=1, le=200, description="Page size"
    ),
    offset: int = Query(
        default=0, ge=0, description="Pagination offset"
    ),
    tags: str | None = Query(
        default=None, description="Comma-separated tag filter"
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """List vocabulary items filtered by CEFR level with pagination."""
    supabase = _get_supabase(request)

    try:
        # Build query
        query = (
            supabase.table("vocabulary_items")
            .select("*", count="exact")
            .eq("cefr_level", cefr_level.value)
        )

        # Optional tag filter using PostgreSQL array overlap
        if tags:
            tag_list = [
                t.strip() for t in tags.split(",") if t.strip()
            ]
            if tag_list:
                query = query.overlaps("tags", tag_list)

        query = (
            query.range(offset, offset + limit - 1)
            .order("french_text")
        )

        result = await query.execute()

        items = result.data or []
        total = (
            result.count
            if result.count is not None
            else len(items)
        )

        return {
            "data": VocabularyListResponse(
                items=[VocabularyItem(**item) for item in items],
                total=total,
                limit=limit,
                offset=offset,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to list vocabulary items")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve vocabulary items.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /review -- Get due review items
# ---------------------------------------------------------------------------


@router.get(
    "/review",
    response_model=dict[str, ReviewListResponse],
)
async def get_due_reviews(    request: Request,
    limit: int = Query(
        default=20, ge=1, le=50, description="Session size"
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Get vocabulary items due for SRS review, ordered by due date."""
    supabase = _get_supabase(request)
    now = datetime.now(UTC).isoformat()

    try:
        # Fetch progress records that are due (fsrs_due_date <= now)
        progress_result = await (
            supabase.table("vocabulary_progress")
            .select("*")
            .eq("user_id", user.id)
            .lte("fsrs_due_date", now)
            .order("fsrs_due_date")
            .limit(limit)
            .execute()
        )

        progress_rows = progress_result.data or []

        # Count total due items
        count_result = await (
            supabase.table("vocabulary_progress")
            .select("id", count="exact")
            .eq("user_id", user.id)
            .lte("fsrs_due_date", now)
            .execute()
        )
        total_due = (
            count_result.count
            if count_result.count is not None
            else len(progress_rows)
        )

        # Count new items available (items not yet in progress)
        all_progress = await (
            supabase.table("vocabulary_progress")
            .select("vocabulary_item_id")
            .eq("user_id", user.id)
            .execute()
        )
        seen_ids = {
            row["vocabulary_item_id"]
            for row in (all_progress.data or [])
        }

        all_items_count = await (
            supabase.table("vocabulary_items")
            .select("id", count="exact")
            .execute()
        )
        total_items = (
            all_items_count.count
            if all_items_count.count is not None
            else 0
        )
        new_available = total_items - len(seen_ids)

        # Fetch full vocabulary items for the due progress records
        review_items: list[ReviewItemOut] = []
        if progress_rows:
            vocab_ids = [
                row["vocabulary_item_id"] for row in progress_rows
            ]
            vocab_result = await (
                supabase.table("vocabulary_items")
                .select("*")
                .in_("id", vocab_ids)
                .execute()
            )
            vocab_map = {
                item["id"]: item
                for item in (vocab_result.data or [])
            }

            for prog in progress_rows:
                vocab_data = vocab_map.get(
                    prog["vocabulary_item_id"]
                )
                if vocab_data is None:
                    continue
                review_items.append(
                    ReviewItemOut(
                        id=prog["id"],
                        vocabulary_item=VocabularyItem(
                            **vocab_data
                        ),
                        fsrs_due_date=prog["fsrs_due_date"],
                        review_count=prog["review_count"],
                        correct_count=prog["correct_count"],
                    )
                )

        return {
            "data": ReviewListResponse(
                items=review_items,
                total_due=total_due,
                new_available=max(new_available, 0),
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch due reviews")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve review items.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /review -- Submit a review rating
# ---------------------------------------------------------------------------


@router.post(
    "/review",
    response_model=dict[str, VocabularyReviewResponse],
)
async def submit_review(    request: Request,
    body: VocabularyReviewRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Submit a review rating for a vocabulary item, update FSRS."""
    supabase = _get_supabase(request)
    now = datetime.now(UTC)

    try:
        # Verify the vocabulary item exists
        item_result = await (
            supabase.table("vocabulary_items")
            .select("id")
            .eq("id", str(body.vocabulary_item_id))
            .execute()
        )
        if not item_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Vocabulary item "
                    f"{body.vocabulary_item_id} not found."
                ),
            )

        # Get or create progress record
        progress_result = await (
            supabase.table("vocabulary_progress")
            .select("*")
            .eq("user_id", user.id)
            .eq(
                "vocabulary_item_id",
                str(body.vocabulary_item_id),
            )
            .execute()
        )

        if progress_result.data:
            # Existing progress -- build CardState from DB
            prog = progress_result.data[0]
            last_rev = prog.get("last_reviewed_at")
            last_review_dt = (
                datetime.fromisoformat(last_rev)
                if last_rev
                else now - timedelta(days=1)
            )
            card = CardState(
                stability=float(prog["fsrs_stability"]),
                difficulty=float(prog["fsrs_difficulty"]),
                elapsed_days=0,  # computed by review()
                scheduled_days=float(prog["fsrs_interval"]),
                reps=int(prog["review_count"]),
                lapses=0,
                last_review=last_review_dt,
            )
            is_new = False
        else:
            card = FSRSScheduler.initial_state()
            is_new = True

        # Run FSRS review
        new_card = _fsrs.review(card, body.rating)
        next_due = _fsrs.next_due_date(new_card)

        # Determine correct count increment
        correct_increment = 1 if body.rating >= 3 else 0

        if is_new:
            # Insert new progress record
            await (
                supabase.table("vocabulary_progress")
                .insert({
                    "user_id": user.id,
                    "vocabulary_item_id": str(
                        body.vocabulary_item_id
                    ),
                    "fsrs_stability": new_card.stability,
                    "fsrs_difficulty": new_card.difficulty,
                    "fsrs_due_date": next_due.isoformat(),
                    "fsrs_interval": new_card.scheduled_days,
                    "review_count": 1,
                    "correct_count": correct_increment,
                    "last_review_rating": body.rating,
                    "last_reviewed_at": now.isoformat(),
                })
                .execute()
            )
        else:
            prog = progress_result.data[0]
            await (
                supabase.table("vocabulary_progress")
                .update({
                    "fsrs_stability": new_card.stability,
                    "fsrs_difficulty": new_card.difficulty,
                    "fsrs_due_date": next_due.isoformat(),
                    "fsrs_interval": new_card.scheduled_days,
                    "review_count": (
                        int(prog["review_count"]) + 1
                    ),
                    "correct_count": (
                        int(prog["correct_count"])
                        + correct_increment
                    ),
                    "last_review_rating": body.rating,
                    "last_reviewed_at": now.isoformat(),
                })
                .eq("id", prog["id"])
                .execute()
            )

        return {
            "data": VocabularyReviewResponse(
                vocabulary_item_id=body.vocabulary_item_id,
                next_review_date=next_due,
                new_stability=round(new_card.stability, 4),
                new_difficulty=round(new_card.difficulty, 4),
                new_interval=round(new_card.scheduled_days, 2),
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to submit review")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process review.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /classify -- Classify vocabulary difficulty via CamemBERT
# ---------------------------------------------------------------------------


@router.post(
    "/classify",
    response_model=dict[str, ClassifyResponse],
)
async def classify_vocabulary(    request: Request,
    body: ClassifyRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Classify vocabulary difficulty using CamemBERT via HF."""
    hf_client = _get_hf_client(request)

    try:
        result = await hf_client.classify_difficulty(
            text=body.text,
            cefr_level=body.cefr_level.value,
        )
        return {
            "data": ClassifyResponse(
                text=result["text"],
                difficulty_score=result["difficulty_score"],
                confidence=result["confidence"],
                ai_platform=result["ai_platform"],
                latency_ms=result["latency_ms"],
            )
        }
    except Exception as exc:
        logger.exception("Vocabulary classification failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Vocabulary difficulty classification failed.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /items/{id}/similar -- Find similar vocabulary items
# ---------------------------------------------------------------------------


@router.get(
    "/items/{item_id}/similar",
    response_model=dict[str, SimilarItemsResponse],
)
async def find_similar_items(    request: Request,
    item_id: UUID,
    limit: int = Query(
        default=5, ge=1, le=20,
        description="Number of similar items",
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Find semantically similar vocabulary items via embeddings.

    Uses pgvector cosine distance on the ``embedding`` column
    of the ``vocabulary_items`` table.
    """
    supabase = _get_supabase(request)

    try:
        # Fetch the source item's embedding
        source_result = await (
            supabase.table("vocabulary_items")
            .select("id, french_text, embedding")
            .eq("id", str(item_id))
            .execute()
        )

        if not source_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vocabulary item {item_id} not found.",
            )

        source = source_result.data[0]
        source_embedding = source.get("embedding")

        if source_embedding is None:
            # Try to generate an embedding on the fly
            hf_client = _get_hf_client(request)
            embeddings = await hf_client.generate_embeddings(
                [source["french_text"]]
            )
            if embeddings and embeddings[0]:
                source_embedding = embeddings[0]
                # Persist the generated embedding
                await (
                    supabase.table("vocabulary_items")
                    .update({"embedding": source_embedding})
                    .eq("id", str(item_id))
                    .execute()
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        "Unable to generate embedding "
                        "for similarity search."
                    ),
                )

        # Use Supabase RPC for pgvector cosine similarity search.
        # Falls back to client-side if the DB function is missing.
        try:
            rpc_result = await supabase.rpc(
                "match_vocabulary_items",
                {
                    "query_embedding": source_embedding,
                    "match_count": limit + 1,
                },
            ).execute()

            similar_items: list[SimilarItemOut] = []
            for row in rpc_result.data or []:
                row_id = row.get("id")
                if str(row_id) == str(item_id):
                    continue
                similar_items.append(
                    SimilarItemOut(
                        id=row_id,
                        french_text=row.get(
                            "french_text", ""
                        ),
                        similarity_score=round(
                            1 - float(
                                row.get("distance", 0)
                            ),
                            4,
                        ),
                    )
                )
                if len(similar_items) >= limit:
                    break

        except Exception:
            # Fallback: client-side cosine similarity
            logger.warning(
                "RPC match_vocabulary_items unavailable, "
                "falling back to client-side cosine similarity."
            )
            all_result = await (
                supabase.table("vocabulary_items")
                .select("id, french_text, embedding")
                .neq("id", str(item_id))
                .not_.is_("embedding", "null")
                .limit(500)
                .execute()
            )

            scored: list[tuple[dict[str, Any], float]] = []
            for row in all_result.data or []:
                row_emb = row.get("embedding")
                if row_emb is None:
                    continue
                sim = _cosine_similarity(
                    source_embedding, row_emb
                )
                scored.append((row, sim))

            scored.sort(key=lambda x: x[1], reverse=True)

            similar_items = [
                SimilarItemOut(
                    id=row["id"],
                    french_text=row["french_text"],
                    similarity_score=round(sim, 4),
                )
                for row, sim in scored[:limit]
            ]

        return {
            "data": SimilarItemsResponse(
                source_item_id=item_id,
                similar_items=similar_items,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to find similar items")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to find similar vocabulary items.",
        ) from exc


# ---------------------------------------------------------------------------
# Utility: cosine similarity (client-side fallback)
# ---------------------------------------------------------------------------


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors.

    Returns a value in [-1, 1] where 1 means identical direction.
    """
    if len(a) != len(b) or len(a) == 0:
        return 0.0

    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot / (norm_a * norm_b)
