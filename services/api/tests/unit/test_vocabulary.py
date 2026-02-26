"""Unit tests for vocabulary API routes.

Uses mocked Supabase and HuggingFace clients to test route logic
in isolation from external services. Auth is bypassed via
FastAPI dependency_overrides.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from services.api.src.middleware.auth import UserInfo, get_current_user
from services.api.src.routes.vocabulary import _cosine_similarity, router

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_TEST_USER = UserInfo(
    id=str(uuid.uuid4()),
    email="test@example.com",
    role="authenticated",
    raw={},
)


def _override_get_current_user() -> UserInfo:
    """Dependency override that returns a test user without JWT check."""
    return _TEST_USER


def _make_vocab_item(**overrides: Any) -> dict[str, Any]:
    """Create a mock vocabulary item row."""
    defaults: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "french_text": "bonjour",
        "spanish_translation": "hola",
        "example_sentence_fr": "Bonjour, comment allez-vous ?",
        "example_sentence_es": "Hola, como esta usted?",
        "audio_url": None,
        "phonetic_ipa": "/bɔ̃.ʒuʁ/",
        "difficulty_score": 1,
        "cefr_level": "A1",
        "tags": ["greetings"],
        "embedding": None,
        "created_at": datetime.now(UTC).isoformat(),
    }
    defaults.update(overrides)
    return defaults


def _make_progress_row(
    user_id: str, vocab_item_id: str, **overrides: Any
) -> dict[str, Any]:
    """Create a mock vocabulary progress row."""
    defaults: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "vocabulary_item_id": vocab_item_id,
        "fsrs_stability": 2.4,
        "fsrs_difficulty": 4.93,
        "fsrs_due_date": "2026-02-20T10:00:00+00:00",
        "fsrs_interval": 2.0,
        "review_count": 3,
        "correct_count": 2,
        "last_review_rating": 3,
        "last_reviewed_at": "2026-02-18T10:00:00+00:00",
    }
    defaults.update(overrides)
    return defaults


class MockQueryBuilder:
    """Chainable mock for Supabase query builder pattern."""

    def __init__(
        self, data: list[dict[str, Any]] | None = None, count: int | None = None
    ) -> None:
        self._data = data or []
        self._count = count

    def select(self, *args: Any, **kwargs: Any) -> MockQueryBuilder:
        return self

    def insert(self, *args: Any, **kwargs: Any) -> MockQueryBuilder:
        return self

    def update(self, *args: Any, **kwargs: Any) -> MockQueryBuilder:
        return self

    def eq(self, *args: Any, **kwargs: Any) -> MockQueryBuilder:
        return self

    def neq(self, *args: Any, **kwargs: Any) -> MockQueryBuilder:
        return self

    def lte(self, *args: Any, **kwargs: Any) -> MockQueryBuilder:
        return self

    def in_(self, *args: Any, **kwargs: Any) -> MockQueryBuilder:
        return self

    def overlaps(self, *args: Any, **kwargs: Any) -> MockQueryBuilder:
        return self

    def order(self, *args: Any, **kwargs: Any) -> MockQueryBuilder:
        return self

    def limit(self, *args: Any, **kwargs: Any) -> MockQueryBuilder:
        return self

    def range(self, *args: Any, **kwargs: Any) -> MockQueryBuilder:
        return self

    @property
    def not_(self) -> MockQueryBuilder:
        return self

    def is_(self, *args: Any, **kwargs: Any) -> MockQueryBuilder:
        return self

    async def execute(self) -> MagicMock:
        result = MagicMock()
        result.data = self._data
        result.count = self._count
        return result


def _create_test_app(
    supabase_mock: Any | None = None,
    hf_mock: Any | None = None,
) -> FastAPI:
    """Create a FastAPI test app with mocked dependencies and auth override."""
    app = FastAPI()
    app.include_router(router, prefix="/api/v1/vocabulary")

    # Override the auth dependency to bypass JWT verification
    app.dependency_overrides[get_current_user] = _override_get_current_user

    # Mock app state
    app.state.supabase = supabase_mock or MagicMock()
    app.state.settings = MagicMock()
    app.state.settings.HF_API_TOKEN = "test-token"
    if hf_mock is not None:
        app.state.hf_client = hf_mock

    return app


# ---------------------------------------------------------------------------
# Tests: cosine similarity utility
# ---------------------------------------------------------------------------


class TestCosineSimilarity:
    """Tests for the _cosine_similarity helper."""

    def test_identical_vectors(self) -> None:
        a = [1.0, 2.0, 3.0]
        assert _cosine_similarity(a, a) == pytest.approx(1.0, abs=1e-6)

    def test_orthogonal_vectors(self) -> None:
        a = [1.0, 0.0]
        b = [0.0, 1.0]
        assert _cosine_similarity(a, b) == pytest.approx(0.0, abs=1e-6)

    def test_opposite_vectors(self) -> None:
        a = [1.0, 0.0]
        b = [-1.0, 0.0]
        assert _cosine_similarity(a, b) == pytest.approx(-1.0, abs=1e-6)

    def test_empty_vectors(self) -> None:
        assert _cosine_similarity([], []) == 0.0

    def test_different_lengths(self) -> None:
        assert _cosine_similarity([1.0], [1.0, 2.0]) == 0.0

    def test_zero_vector(self) -> None:
        assert _cosine_similarity([0.0, 0.0], [1.0, 2.0]) == 0.0


# ---------------------------------------------------------------------------
# Tests: GET /items
# ---------------------------------------------------------------------------


class TestListVocabularyItems:
    """Tests for the list vocabulary items endpoint."""

    def test_list_items_success(self) -> None:
        items = [_make_vocab_item(), _make_vocab_item(french_text="salut")]
        mock_supabase = MagicMock()
        mock_supabase.table.return_value = MockQueryBuilder(
            data=items, count=2
        )

        app = _create_test_app(supabase_mock=mock_supabase)
        client = TestClient(app)
        response = client.get("/api/v1/vocabulary/items?cefr_level=A1")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 2
        assert len(data["items"]) == 2

    def test_list_items_requires_cefr_level(self) -> None:
        app = _create_test_app()
        client = TestClient(app)
        response = client.get("/api/v1/vocabulary/items")

        assert response.status_code == 422  # missing required param

    def test_list_items_pagination(self) -> None:
        items = [_make_vocab_item()]
        mock_supabase = MagicMock()
        mock_supabase.table.return_value = MockQueryBuilder(
            data=items, count=100
        )

        app = _create_test_app(supabase_mock=mock_supabase)
        client = TestClient(app)
        response = client.get(
            "/api/v1/vocabulary/items?cefr_level=A1&limit=10&offset=20"
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["limit"] == 10
        assert data["offset"] == 20

    def test_list_items_invalid_cefr_level(self) -> None:
        app = _create_test_app()
        client = TestClient(app)
        response = client.get("/api/v1/vocabulary/items?cefr_level=X9")

        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Tests: POST /classify
# ---------------------------------------------------------------------------


class TestClassifyVocabulary:
    """Tests for the vocabulary classification endpoint."""

    def test_classify_success(self) -> None:
        mock_hf = AsyncMock()
        mock_hf.classify_difficulty.return_value = {
            "text": "aujourd'hui",
            "difficulty_score": 2,
            "confidence": 0.89,
            "ai_platform": "huggingface",
            "latency_ms": 45,
        }

        app = _create_test_app(hf_mock=mock_hf)
        client = TestClient(app)
        response = client.post(
            "/api/v1/vocabulary/classify",
            json={"text": "aujourd'hui", "cefr_level": "A1"},
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["difficulty_score"] == 2
        assert data["confidence"] == 0.89
        assert data["ai_platform"] == "huggingface"

    def test_classify_empty_text_rejected(self) -> None:
        app = _create_test_app()
        client = TestClient(app)
        response = client.post(
            "/api/v1/vocabulary/classify",
            json={"text": "", "cefr_level": "A1"},
        )

        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Tests: POST /review
# ---------------------------------------------------------------------------


class TestSubmitReview:
    """Tests for the review submission endpoint."""

    def test_submit_review_new_item(self) -> None:
        """Submitting a review for a new item should create progress."""
        vocab_item = _make_vocab_item()
        vocab_id = vocab_item["id"]

        # Mock: item exists, no progress yet
        item_query = MockQueryBuilder(data=[{"id": vocab_id}])
        progress_query = MockQueryBuilder(data=[])
        insert_query = MockQueryBuilder(data=[])

        call_count = 0

        def table_side_effect(name: str) -> MockQueryBuilder:
            nonlocal call_count
            call_count += 1
            if name == "vocabulary_items":
                return item_query
            if name == "vocabulary_progress" and call_count <= 3:
                return progress_query
            return insert_query

        mock_supabase = MagicMock()
        mock_supabase.table.side_effect = table_side_effect

        app = _create_test_app(supabase_mock=mock_supabase)
        client = TestClient(app)
        response = client.post(
            "/api/v1/vocabulary/review",
            json={"vocabulary_item_id": vocab_id, "rating": 3},
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["vocabulary_item_id"] == vocab_id
        assert "next_review_date" in data
        assert data["new_stability"] > 0
        assert data["new_interval"] >= 1.0

    def test_submit_review_invalid_rating_too_high(self) -> None:
        app = _create_test_app()
        client = TestClient(app)
        response = client.post(
            "/api/v1/vocabulary/review",
            json={
                "vocabulary_item_id": str(uuid.uuid4()),
                "rating": 5,
            },
        )

        assert response.status_code == 422

    def test_submit_review_invalid_rating_zero(self) -> None:
        app = _create_test_app()
        client = TestClient(app)
        response = client.post(
            "/api/v1/vocabulary/review",
            json={
                "vocabulary_item_id": str(uuid.uuid4()),
                "rating": 0,
            },
        )

        assert response.status_code == 422

    def test_submit_review_missing_fields(self) -> None:
        app = _create_test_app()
        client = TestClient(app)
        response = client.post(
            "/api/v1/vocabulary/review",
            json={},
        )

        assert response.status_code == 422

    def test_submit_review_item_not_found(self) -> None:
        """Review for non-existent item should return 404."""
        mock_supabase = MagicMock()
        mock_supabase.table.return_value = MockQueryBuilder(data=[])

        app = _create_test_app(supabase_mock=mock_supabase)
        client = TestClient(app)
        response = client.post(
            "/api/v1/vocabulary/review",
            json={
                "vocabulary_item_id": str(uuid.uuid4()),
                "rating": 3,
            },
        )

        assert response.status_code == 404
