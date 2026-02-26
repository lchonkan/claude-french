"""FSRS v5 (Free Spaced Repetition Scheduler) implementation.

Implements the FSRS v5 algorithm for scheduling vocabulary reviews.
The algorithm tracks memory stability and difficulty for each card,
computing optimal review intervals based on desired retention.

References:
- https://github.com/open-spaced-repetition/fsrs4anki
- https://github.com/open-spaced-repetition/py-fsrs

Rating scale:
  1 = Again (complete failure to recall)
  2 = Hard  (recalled with significant difficulty)
  3 = Good  (recalled with some effort)
  4 = Easy  (recalled effortlessly)
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

# FSRS v5 default parameters (17 weights)
DEFAULT_WEIGHTS: list[float] = [
    0.4,    # w[0]:  initial stability for Again
    0.6,    # w[1]:  initial stability for Hard
    2.4,    # w[2]:  initial stability for Good
    5.8,    # w[3]:  initial stability for Easy
    4.93,   # w[4]:  difficulty base
    0.94,   # w[5]:  difficulty multiplier for rating
    0.86,   # w[6]:  difficulty mean reversion weight
    0.01,   # w[7]:  difficulty mean reversion target offset
    1.49,   # w[8]:  stability after success: exponent factor
    0.14,   # w[9]:  stability after success: difficulty factor
    0.94,   # w[10]: stability after success: stability decay exponent
    2.18,   # w[11]: stability after success: retrievability factor
    0.05,   # w[12]: stability after failure: base
    0.34,   # w[13]: stability after failure: difficulty factor
    1.26,   # w[14]: stability after failure: stability factor
    0.29,   # w[15]: stability after failure: retrievability factor
    2.61,   # w[16]: hard penalty / easy bonus factor
]

# Target retention probability (90%)
DEFAULT_RETENTION: float = 0.9

# Rating constants
RATING_AGAIN = 1
RATING_HARD = 2
RATING_GOOD = 3
RATING_EASY = 4


@dataclass
class CardState:
    """Represents the current SRS state of a single card.

    Attributes
    ----------
    stability:
        Memory stability in days. Higher means the memory is more durable.
        After ``stability`` days, the probability of recall equals ~90%.
    difficulty:
        Intrinsic difficulty of the card (range roughly 0-10).
    elapsed_days:
        Days since the last review (0 for new cards).
    scheduled_days:
        The interval that was scheduled at the previous review.
    reps:
        Total number of successful reviews (not counting lapses).
    lapses:
        Number of times the card was forgotten (rated Again after learning).
    last_review:
        Timestamp of the most recent review.
    """

    stability: float = 0.0
    difficulty: float = 0.0
    elapsed_days: float = 0.0
    scheduled_days: float = 0.0
    reps: int = 0
    lapses: int = 0
    last_review: datetime = field(
        default_factory=lambda: datetime.now(UTC)
    )

    @property
    def is_new(self) -> bool:
        """Return True if this card has never been reviewed."""
        return self.reps == 0 and self.lapses == 0


class FSRSScheduler:
    """FSRS v5 spaced repetition scheduler.

    Parameters
    ----------
    weights:
        The 17 FSRS v5 model weights. Defaults to the published v5 defaults.
    desired_retention:
        Target probability of recall at the scheduled review time.
        Default is 0.9 (90%).
    """

    def __init__(
        self,
        weights: list[float] | None = None,
        desired_retention: float = DEFAULT_RETENTION,
    ) -> None:
        w = weights if weights is not None else DEFAULT_WEIGHTS
        if len(w) != 17:
            raise ValueError(f"FSRS v5 requires exactly 17 weights, got {len(w)}")
        self.w = w
        self.desired_retention = desired_retention

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def review(self, card: CardState, rating: int) -> CardState:
        """Process a review and return the updated card state.

        Parameters
        ----------
        card:
            Current state of the card before the review.
        rating:
            User's self-assessment: 1=Again, 2=Hard, 3=Good, 4=Easy.

        Returns
        -------
        CardState
            New card state with updated stability, difficulty, interval,
            and next due date encoded in ``last_review`` + ``scheduled_days``.
        """
        if rating < RATING_AGAIN or rating > RATING_EASY:
            raise ValueError(f"Rating must be 1-4, got {rating}")

        now = datetime.now(UTC)

        if card.is_new:
            return self._review_new(card, rating, now)

        return self._review_existing(card, rating, now)

    def next_due_date(self, card: CardState) -> datetime:
        """Compute the next due date from a card's state.

        Parameters
        ----------
        card:
            Card state (typically after a review).

        Returns
        -------
        datetime
            The UTC datetime when the card should next be reviewed.
        """
        return card.last_review + timedelta(days=card.scheduled_days)

    @staticmethod
    def initial_state() -> CardState:
        """Return a fresh card state for a never-reviewed item."""
        return CardState()

    # ------------------------------------------------------------------
    # Retrievability
    # ------------------------------------------------------------------

    def retrievability(
        self, card: CardState, elapsed_days: float | None = None
    ) -> float:
        """Compute the probability of recall (retrievability).

        Uses the FSRS power-law forgetting curve:
            R = (1 + elapsed_days / (9 * stability)) ^ (-1)

        Parameters
        ----------
        card:
            Current card state.
        elapsed_days:
            Override for the number of days since last review.
            If None, computed from ``card.last_review`` to now.

        Returns
        -------
        float
            Probability of recall in [0, 1].
        """
        if card.stability <= 0:
            return 0.0

        if elapsed_days is None:
            delta = datetime.now(UTC) - card.last_review
            elapsed_days = max(delta.total_seconds() / 86400, 0)

        return (1 + elapsed_days / (9 * card.stability)) ** (-1)

    # ------------------------------------------------------------------
    # Internal: new card review
    # ------------------------------------------------------------------

    def _review_new(
        self, card: CardState, rating: int, now: datetime
    ) -> CardState:
        """Handle the first-ever review of a card."""
        stability = self._initial_stability(rating)
        difficulty = self._initial_difficulty(rating)
        interval = self._next_interval(stability)

        reps = 0 if rating == RATING_AGAIN else 1
        lapses = 1 if rating == RATING_AGAIN else 0

        return CardState(
            stability=stability,
            difficulty=difficulty,
            elapsed_days=0,
            scheduled_days=interval,
            reps=reps,
            lapses=lapses,
            last_review=now,
        )

    # ------------------------------------------------------------------
    # Internal: existing card review
    # ------------------------------------------------------------------

    def _review_existing(
        self, card: CardState, rating: int, now: datetime
    ) -> CardState:
        """Handle a review for a card that has been seen before."""
        delta = now - card.last_review
        elapsed_days = max(delta.total_seconds() / 86400, 0)

        r = self.retrievability(card, elapsed_days)
        new_difficulty = self._next_difficulty(card.difficulty, rating)

        if rating == RATING_AGAIN:
            new_stability = self._stability_after_failure(
                card.stability, new_difficulty, r
            )
            new_lapses = card.lapses + 1
            new_reps = card.reps
        else:
            new_stability = self._stability_after_success(
                card.stability, new_difficulty, r, rating
            )
            new_lapses = card.lapses
            new_reps = card.reps + 1

        interval = self._next_interval(new_stability)

        # Apply hard penalty / easy bonus
        if rating == RATING_HARD:
            interval = max(interval * 0.8, 1.0)
        elif rating == RATING_EASY:
            interval = interval * (1.0 + (self.w[16] - 1.0) * 0.5)

        return CardState(
            stability=new_stability,
            difficulty=new_difficulty,
            elapsed_days=elapsed_days,
            scheduled_days=max(round(interval, 2), 1.0),
            reps=new_reps,
            lapses=new_lapses,
            last_review=now,
        )

    # ------------------------------------------------------------------
    # FSRS formulas
    # ------------------------------------------------------------------

    def _initial_stability(self, rating: int) -> float:
        """S_0(G): initial stability based on first rating.

        w[0..3] map directly to ratings 1..4.
        """
        return self.w[rating - 1]

    def _initial_difficulty(self, rating: int) -> float:
        """D_0(G): initial difficulty based on first rating.

        D_0 = w[4] - (rating - 3) * w[5]
        Clamped to [1, 10].
        """
        d = self.w[4] - (rating - 3) * self.w[5]
        return self._clamp_difficulty(d)

    def _next_difficulty(self, current_d: float, rating: int) -> float:
        """D'(D, G): update difficulty after a review.

        Uses mean reversion:
        D' = w[6] * D_0(3) + (1 - w[6]) * (D - w[5] * (rating - 3))

        The formula pulls difficulty toward the mean (D_0(3)) to prevent
        difficulty from drifting to extremes.
        """
        d0_mean = self.w[4]  # D_0(3), i.e. the mean difficulty
        delta = current_d - self.w[5] * (rating - 3)
        new_d = self.w[6] * d0_mean + (1 - self.w[6]) * delta
        return self._clamp_difficulty(new_d)

    def _stability_after_success(
        self,
        stability: float,
        difficulty: float,
        retrievability: float,
        rating: int,
    ) -> float:
        """S'_s(S, D, R, G): new stability after a successful recall.

        S' = S * (e^(w[8]) * (11 - D) * S^(-w[10]) * (e^(w[11]*(1-R)) - 1) + 1)

        For Hard rating, apply a penalty; for Easy, apply a bonus.
        """
        inner = (
            math.exp(self.w[8])
            * (11 - difficulty)
            * (stability ** (-self.w[10]))
            * (math.exp(self.w[11] * (1 - retrievability)) - 1)
            + 1
        )

        new_s = stability * inner

        # Hard penalty
        if rating == RATING_HARD:
            new_s = min(new_s, stability * 1.2)

        # Easy bonus
        if rating == RATING_EASY:
            new_s *= self.w[16]

        return max(new_s, 0.01)

    def _stability_after_failure(
        self,
        stability: float,
        difficulty: float,
        retrievability: float,
    ) -> float:
        """S'_f(S, D, R): new stability after a failed recall (lapse).

        S' = w[12] * D^(-w[13]) * ((S+1)^w[14] - 1) * e^(w[15]*(1-R))
        """
        new_s = (
            self.w[12]
            * (difficulty ** (-self.w[13]))
            * ((stability + 1) ** self.w[14] - 1)
            * math.exp(self.w[15] * (1 - retrievability))
        )
        # Stability after failure should be less than before
        return max(min(new_s, stability), 0.01)

    def _next_interval(self, stability: float) -> float:
        """Compute the optimal interval in days for a given stability.

        Derived from the forgetting curve, solving for the day when
        retrievability equals the desired retention:
            interval = 9 * S * (1/R - 1)

        where R = desired_retention.
        """
        if stability <= 0:
            return 1.0
        interval = 9.0 * stability * (1.0 / self.desired_retention - 1.0)
        return max(round(interval, 2), 1.0)

    @staticmethod
    def _clamp_difficulty(d: float) -> float:
        """Clamp difficulty to the valid range [1, 10]."""
        return max(1.0, min(10.0, d))
