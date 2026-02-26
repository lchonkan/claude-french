"""Mastery calculation engine for the French learning platform.

Provides the core formulas for computing skill mastery from exercise
results and for determining whether a learner can unlock the next
CEFR level.

Functions:
- ``calculate_mastery`` -- Weighted mastery score from recent results.
- ``check_level_unlock`` -- Gate check requiring both mastery threshold
  and a passing exit exam.
"""

from __future__ import annotations

from datetime import UTC, datetime

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

#: Number of most-recent exercise results used for accuracy calculation.
ACCURACY_WINDOW = 20

#: Weight for the accuracy component of mastery (50%).
WEIGHT_ACCURACY = 0.50

#: Weight for the consistency component of mastery (30%).
WEIGHT_CONSISTENCY = 0.30

#: Weight for the recency-weighted component of mastery (20%).
WEIGHT_RECENCY = 0.20

#: Exponential decay factor applied per-result from most recent to oldest.
DECAY_FACTOR = 0.85

#: Minimum mastery percentage required to attempt a level-up exam.
MASTERY_THRESHOLD = 80.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def calculate_mastery(exercise_results: list[dict]) -> float:
    """Calculate mastery percentage from a list of exercise results.

    Each element in *exercise_results* should be a dict with at least:
    - ``"score"`` (float, 0.0-1.0) -- normalised score
    - ``"timestamp"`` (str | datetime) -- when the exercise was completed

    The formula is::

        mastery = 50% * accuracy_last_20
                + 30% * consistency
                + 20% * recency_weighted

    Where:
    - **accuracy_last_20** is the simple mean of the last 20 scores.
    - **consistency** is ``1 - stdev(last_20_scores)`` (clamped to [0, 1]).
    - **recency_weighted** applies exponential decay (``0.85^i``) so that
      the most recent result has the highest weight.

    Returns a value in the range [0, 100].
    """
    if not exercise_results:
        return 0.0

    # Sort by timestamp descending (most recent first)
    sorted_results = _sort_by_recency(exercise_results)

    # Take the last N results for the accuracy window
    window = sorted_results[:ACCURACY_WINDOW]
    scores = [_extract_score(r) for r in window]

    if not scores:
        return 0.0

    # 1. Accuracy -- simple mean of last-20 scores
    accuracy = sum(scores) / len(scores)

    # 2. Consistency -- 1 - standard deviation (clamped to [0, 1])
    consistency = _compute_consistency(scores)

    # 3. Recency-weighted score with exponential decay
    recency = _compute_recency_weighted(scores)

    mastery = (
        WEIGHT_ACCURACY * accuracy
        + WEIGHT_CONSISTENCY * consistency
        + WEIGHT_RECENCY * recency
    )

    # Convert from 0-1 range to 0-100 percentage
    return round(max(0.0, min(100.0, mastery * 100)), 2)


def check_level_unlock(
    mastery_percentage: float,
    exam_passed: bool,
) -> bool:
    """Determine whether a learner can unlock the next CEFR level.

    Both conditions must be met:
    1. ``mastery_percentage >= 80``
    2. ``exam_passed is True``

    Parameters
    ----------
    mastery_percentage:
        Current mastery as a percentage (0-100).
    exam_passed:
        Whether the exit exam for the target level has been passed.

    Returns
    -------
    bool
        ``True`` only when both the mastery threshold and exam pass
        requirements are satisfied.
    """
    return mastery_percentage >= MASTERY_THRESHOLD and exam_passed


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _sort_by_recency(results: list[dict]) -> list[dict]:
    """Sort exercise results by timestamp, most recent first."""

    def _ts(r: dict) -> datetime:
        ts = r.get("timestamp")
        if ts is None:
            return datetime.min.replace(tzinfo=UTC)
        if isinstance(ts, datetime):
            if ts.tzinfo is None:
                return ts.replace(tzinfo=UTC)
            return ts
        # Parse ISO string
        try:
            dt = datetime.fromisoformat(str(ts))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            return dt
        except (ValueError, TypeError):
            return datetime.min.replace(tzinfo=UTC)

    return sorted(results, key=_ts, reverse=True)


def _extract_score(result: dict) -> float:
    """Extract and clamp the normalised score from a result dict."""
    score = result.get("score", 0.0)
    try:
        score = float(score)
    except (TypeError, ValueError):
        score = 0.0
    return max(0.0, min(1.0, score))


def _compute_consistency(scores: list[float]) -> float:
    """Compute consistency as ``1 - stdev(scores)``, clamped to [0, 1].

    When there is only one score, consistency is defined as 1.0
    (perfectly consistent).
    """
    n = len(scores)
    if n <= 1:
        return 1.0

    mean = sum(scores) / n
    variance = sum((s - mean) ** 2 for s in scores) / n
    stdev = variance**0.5

    return max(0.0, min(1.0, 1.0 - stdev))


def _compute_recency_weighted(scores: list[float]) -> float:
    """Compute recency-weighted average using exponential decay.

    The most recent score (index 0) gets weight ``1.0``, the next
    gets ``DECAY_FACTOR``, then ``DECAY_FACTOR^2``, etc.
    """
    if not scores:
        return 0.0

    weighted_sum = 0.0
    weight_total = 0.0

    for i, score in enumerate(scores):
        weight = DECAY_FACTOR**i
        weighted_sum += score * weight
        weight_total += weight

    if weight_total == 0:
        return 0.0

    return weighted_sum / weight_total
