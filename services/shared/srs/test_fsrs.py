"""Tests for the FSRS v5 spaced repetition scheduler.

Covers:
- Initial card state creation
- First review for each rating (Again, Hard, Good, Easy)
- Subsequent reviews and interval progression
- Retrievability computation
- Edge cases and parameter validation
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from services.shared.srs.fsrs import (
    RATING_AGAIN,
    RATING_EASY,
    RATING_GOOD,
    RATING_HARD,
    CardState,
    FSRSScheduler,
)


@pytest.fixture
def scheduler() -> FSRSScheduler:
    """Return a default FSRS v5 scheduler."""
    return FSRSScheduler()


@pytest.fixture
def new_card() -> CardState:
    """Return a fresh, never-reviewed card."""
    return FSRSScheduler.initial_state()


class TestInitialState:
    """Tests for initial card state."""

    def test_initial_state_is_new(self, new_card: CardState) -> None:
        assert new_card.is_new is True

    def test_initial_state_defaults(self, new_card: CardState) -> None:
        assert new_card.stability == 0.0
        assert new_card.difficulty == 0.0
        assert new_card.reps == 0
        assert new_card.lapses == 0
        assert new_card.elapsed_days == 0.0
        assert new_card.scheduled_days == 0.0


class TestFirstReview:
    """Tests for the first review of a new card."""

    def test_first_review_again(
        self, scheduler: FSRSScheduler, new_card: CardState
    ) -> None:
        result = scheduler.review(new_card, RATING_AGAIN)
        assert result.is_new is False
        # FSRS w[0] = 0.4 for Again initial stability
        assert result.stability == pytest.approx(0.4, abs=0.01)
        assert result.reps == 0  # Again does not count as a successful rep
        assert result.lapses == 1
        assert result.scheduled_days >= 1.0

    def test_first_review_hard(
        self, scheduler: FSRSScheduler, new_card: CardState
    ) -> None:
        result = scheduler.review(new_card, RATING_HARD)
        # w[1] = 0.6
        assert result.stability == pytest.approx(0.6, abs=0.01)
        assert result.reps == 1
        assert result.lapses == 0

    def test_first_review_good(
        self, scheduler: FSRSScheduler, new_card: CardState
    ) -> None:
        result = scheduler.review(new_card, RATING_GOOD)
        # w[2] = 2.4
        assert result.stability == pytest.approx(2.4, abs=0.01)
        assert result.reps == 1
        assert result.lapses == 0

    def test_first_review_easy(
        self, scheduler: FSRSScheduler, new_card: CardState
    ) -> None:
        result = scheduler.review(new_card, RATING_EASY)
        # w[3] = 5.8
        assert result.stability == pytest.approx(5.8, abs=0.01)
        assert result.reps == 1
        assert result.lapses == 0

    def test_first_review_sets_difficulty(
        self, scheduler: FSRSScheduler, new_card: CardState
    ) -> None:
        """Difficulty should be set based on rating and w[4], w[5]."""
        result_again = scheduler.review(new_card, RATING_AGAIN)
        result_easy = scheduler.review(new_card, RATING_EASY)
        # Again (rating=1): D = w[4] - (1-3)*w[5] = 4.93 + 2*0.94 = 6.81
        # Easy  (rating=4): D = w[4] - (4-3)*w[5] = 4.93 - 0.94 = 3.99
        assert result_again.difficulty > result_easy.difficulty

    def test_easy_interval_longer_than_good(
        self, scheduler: FSRSScheduler, new_card: CardState
    ) -> None:
        """Easy rating should produce a longer interval than Good."""
        result_good = scheduler.review(new_card, RATING_GOOD)
        result_easy = scheduler.review(new_card, RATING_EASY)
        assert result_easy.scheduled_days >= result_good.scheduled_days


class TestSubsequentReviews:
    """Tests for reviews after the first one."""

    def _simulate_reviews(
        self,
        scheduler: FSRSScheduler,
        ratings: list[int],
    ) -> CardState:
        """Run a sequence of reviews and return the final card state."""
        card = FSRSScheduler.initial_state()
        for rating in ratings:
            card = scheduler.review(card, rating)
        return card

    def test_good_reviews_increase_interval(
        self, scheduler: FSRSScheduler
    ) -> None:
        """Repeated Good reviews should increase the interval."""
        intervals: list[float] = []
        card = FSRSScheduler.initial_state()
        for _ in range(5):
            card = scheduler.review(card, RATING_GOOD)
            intervals.append(card.scheduled_days)

        # Each interval should be >= the previous (monotonically increasing)
        for i in range(1, len(intervals)):
            assert intervals[i] >= intervals[i - 1], (
                f"Interval {i} ({intervals[i]}) should be >= "
                f"interval {i-1} ({intervals[i-1]})"
            )

    def test_again_reduces_interval(self, scheduler: FSRSScheduler) -> None:
        """Pressing Again after several Good reviews should reduce interval."""
        card = self._simulate_reviews(scheduler, [RATING_GOOD] * 5)
        interval_before = card.scheduled_days

        card = scheduler.review(card, RATING_AGAIN)
        assert card.scheduled_days < interval_before

    def test_lapse_count_increments(self, scheduler: FSRSScheduler) -> None:
        """Lapses should increment when Again is pressed after learning."""
        card = self._simulate_reviews(
            scheduler, [RATING_GOOD, RATING_GOOD, RATING_AGAIN]
        )
        assert card.lapses == 1

    def test_reps_count_increments(self, scheduler: FSRSScheduler) -> None:
        """Reps should increment for successful reviews only."""
        card = self._simulate_reviews(
            scheduler, [RATING_GOOD, RATING_EASY, RATING_HARD]
        )
        assert card.reps == 3

    def test_mixed_ratings_sequence(self, scheduler: FSRSScheduler) -> None:
        """A realistic mixed sequence should produce valid state."""
        ratings = [
            RATING_GOOD, RATING_GOOD, RATING_HARD,
            RATING_EASY, RATING_AGAIN, RATING_GOOD,
        ]
        card = self._simulate_reviews(scheduler, ratings)
        assert card.stability > 0
        assert 1.0 <= card.difficulty <= 10.0
        assert card.scheduled_days >= 1.0


class TestRetrievability:
    """Tests for the retrievability (probability of recall) function."""

    def test_retrievability_at_zero_days(
        self, scheduler: FSRSScheduler
    ) -> None:
        """Retrievability should be 1.0 at 0 elapsed days."""
        card = CardState(stability=5.0, last_review=datetime.now(UTC))
        r = scheduler.retrievability(card, elapsed_days=0)
        assert r == pytest.approx(1.0, abs=0.001)

    def test_retrievability_decreases_over_time(
        self, scheduler: FSRSScheduler
    ) -> None:
        """Retrievability should decrease as days pass."""
        card = CardState(stability=5.0, last_review=datetime.now(UTC))
        r1 = scheduler.retrievability(card, elapsed_days=1)
        r5 = scheduler.retrievability(card, elapsed_days=5)
        r30 = scheduler.retrievability(card, elapsed_days=30)

        assert r1 > r5 > r30
        assert 0 < r30 < r5 < r1 <= 1.0

    def test_retrievability_zero_stability(
        self, scheduler: FSRSScheduler
    ) -> None:
        """Retrievability should be 0 when stability is 0."""
        card = CardState(stability=0.0)
        r = scheduler.retrievability(card, elapsed_days=1)
        assert r == 0.0

    def test_retrievability_formula(
        self, scheduler: FSRSScheduler
    ) -> None:
        """Verify the power-law formula R = (1 + t/(9*S))^(-1)."""
        card = CardState(stability=10.0, last_review=datetime.now(UTC))
        elapsed = 5.0
        expected = (1 + elapsed / (9 * 10.0)) ** (-1)
        actual = scheduler.retrievability(card, elapsed_days=elapsed)
        assert actual == pytest.approx(expected, abs=1e-6)


class TestDueDateComputation:
    """Tests for due date calculation."""

    def test_due_date_after_review(self, scheduler: FSRSScheduler) -> None:
        """Due date should be last_review + scheduled_days."""
        card = FSRSScheduler.initial_state()
        result = scheduler.review(card, RATING_GOOD)
        due = scheduler.next_due_date(result)

        expected = result.last_review + timedelta(days=result.scheduled_days)
        delta = abs((due - expected).total_seconds())
        assert delta < 1  # within 1 second


class TestEdgeCases:
    """Edge case tests."""

    def test_invalid_rating_raises(self, scheduler: FSRSScheduler) -> None:
        """Ratings outside 1-4 should raise ValueError."""
        card = FSRSScheduler.initial_state()
        with pytest.raises(ValueError, match="Rating must be 1-4"):
            scheduler.review(card, 0)
        with pytest.raises(ValueError, match="Rating must be 1-4"):
            scheduler.review(card, 5)

    def test_wrong_weight_count_raises(self) -> None:
        """Providing wrong number of weights should raise ValueError."""
        with pytest.raises(ValueError, match="exactly 17 weights"):
            FSRSScheduler(weights=[0.1, 0.2])

    def test_custom_retention(self) -> None:
        """Custom desired retention should affect intervals."""
        sched_90 = FSRSScheduler(desired_retention=0.9)
        sched_80 = FSRSScheduler(desired_retention=0.8)

        card = FSRSScheduler.initial_state()
        result_90 = sched_90.review(card, RATING_GOOD)
        result_80 = sched_80.review(card, RATING_GOOD)

        # Lower retention = longer intervals (review less frequently)
        assert result_80.scheduled_days >= result_90.scheduled_days

    def test_minimum_interval_is_one(
        self, scheduler: FSRSScheduler
    ) -> None:
        """Interval should never be less than 1 day."""
        card = FSRSScheduler.initial_state()
        result = scheduler.review(card, RATING_AGAIN)
        assert result.scheduled_days >= 1.0

    def test_difficulty_clamped(self, scheduler: FSRSScheduler) -> None:
        """Difficulty should stay within [1, 10]."""
        card = FSRSScheduler.initial_state()

        # Many Easy reviews should push difficulty toward lower bound
        for _ in range(20):
            card = scheduler.review(card, RATING_EASY)
        assert card.difficulty >= 1.0

        # Many Again reviews should push difficulty toward upper bound
        card = FSRSScheduler.initial_state()
        for _ in range(20):
            card = scheduler.review(card, RATING_AGAIN)
        assert card.difficulty <= 10.0
