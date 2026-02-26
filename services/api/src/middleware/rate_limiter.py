"""Simple in-memory token-bucket rate limiter.

Each authenticated user gets an independent bucket. The default policy is
100 requests per 60-second window.  When the bucket is exhausted the
dependency raises HTTP 429 with a ``Retry-After`` header.

This implementation is intentionally simple (no external store) and
suitable for a single-process deployment.  For multi-instance production
use, replace the in-memory dict with Redis or a shared counter.
"""

from __future__ import annotations

import time
import logging
from dataclasses import dataclass, field

from fastapi import Depends, HTTPException, Request, status

from services.api.src.middleware.auth import UserInfo, get_current_user

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_RATE = 100          # max requests per window
DEFAULT_WINDOW_SECONDS = 60 # window duration


# ---------------------------------------------------------------------------
# Token bucket implementation
# ---------------------------------------------------------------------------

@dataclass
class _Bucket:
    """Sliding-window token bucket for a single user."""

    tokens: float
    max_tokens: float
    refill_rate: float          # tokens per second
    last_refill: float = field(default_factory=time.monotonic)

    def consume(self) -> bool:
        """Attempt to consume one token.  Returns ``True`` on success."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.max_tokens, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= 1.0:
            self.tokens -= 1.0
            return True
        return False

    @property
    def retry_after(self) -> float:
        """Seconds until at least one token is available."""
        if self.tokens >= 1.0:
            return 0.0
        return (1.0 - self.tokens) / self.refill_rate


class RateLimiter:
    """In-memory per-user rate limiter.

    Parameters
    ----------
    max_requests:
        Maximum number of requests in *window_seconds*.
    window_seconds:
        Duration of the rate-limit window.
    """

    def __init__(
        self,
        max_requests: int = DEFAULT_RATE,
        window_seconds: int = DEFAULT_WINDOW_SECONDS,
    ) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._refill_rate = max_requests / window_seconds
        self._buckets: dict[str, _Bucket] = {}

    def _get_bucket(self, user_id: str) -> _Bucket:
        if user_id not in self._buckets:
            self._buckets[user_id] = _Bucket(
                tokens=float(self.max_requests),
                max_tokens=float(self.max_requests),
                refill_rate=self._refill_rate,
            )
        return self._buckets[user_id]

    def check(self, user_id: str) -> None:
        """Consume a token or raise 429.

        Raises
        ------
        HTTPException(429)
            When the user has exhausted their rate limit.
        """
        bucket = self._get_bucket(user_id)
        if not bucket.consume():
            retry_after = int(bucket.retry_after) + 1
            logger.info(
                "Rate limit exceeded for user %s. Retry after %ds.",
                user_id,
                retry_after,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )

    def cleanup(self, max_idle_seconds: float = 300.0) -> int:
        """Remove buckets that have been idle for longer than *max_idle_seconds*.

        Returns the number of buckets removed.  Call periodically to prevent
        unbounded memory growth.
        """
        now = time.monotonic()
        stale = [
            uid
            for uid, bucket in self._buckets.items()
            if now - bucket.last_refill > max_idle_seconds
        ]
        for uid in stale:
            del self._buckets[uid]
        return len(stale)


# Module-level singleton instance
_limiter = RateLimiter()


def get_rate_limiter() -> RateLimiter:
    """Return the singleton ``RateLimiter`` instance."""
    return _limiter


async def rate_limit(
    request: Request,
    user: UserInfo = Depends(get_current_user),
    limiter: RateLimiter = Depends(get_rate_limiter),
) -> UserInfo:
    """FastAPI dependency that enforces per-user rate limits.

    Must be placed **after** ``get_current_user`` in the dependency chain
    (which it is, since it depends on ``UserInfo``).

    Usage::

        @router.post("/submit")
        async def submit(user: UserInfo = Depends(rate_limit)):
            ...

    Returns the authenticated ``UserInfo`` so downstream code does not need
    to also depend on ``get_current_user``.
    """
    limiter.check(user.id)
    return user
