"""Cognate detection between French-Spanish and French-Portuguese.

Identifies cognates (words with common etymological origin that look/sound
similar across languages) using embedding-based cosine similarity.  This is
useful for highlighting "easy wins" to Spanish-speaking and Portuguese-speaking
learners -- cognates are faster to acquire because they are already partially
known.

Usage
-----
    from services.shared.ai.cognates import detect_cognates, detect_cognates_batch

    result = await detect_cognates("bonjour", "buen dia", threshold=0.85)
    print(result.is_cognate, result.similarity_score)

    results = await detect_cognates_batch([
        ("famille", "familia"),
        ("maison", "mason"),
    ])
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import Literal

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

CognateLanguage = Literal["french-spanish", "french-portuguese"]


@dataclass(frozen=True, slots=True)
class CognateResult:
    """Result of a cognate detection comparison."""

    is_cognate: bool
    similarity_score: float
    cognate_type: CognateLanguage


# ---------------------------------------------------------------------------
# Cosine similarity helper
# ---------------------------------------------------------------------------


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two equal-length vectors.

    Returns a value in [-1, 1].  Vectors of all zeros yield 0.0.
    """
    if len(a) != len(b):
        raise ValueError(
            f"Vector dimension mismatch: {len(a)} vs {len(b)}"
        )
    dot = sum(ai * bi for ai, bi in zip(a, b))
    norm_a = math.sqrt(sum(ai * ai for ai in a))
    norm_b = math.sqrt(sum(bi * bi for bi in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


# ---------------------------------------------------------------------------
# Embedding provider interface
# ---------------------------------------------------------------------------

# The module is designed to work with *any* async embedding function that
# matches the following signature.  At runtime the ``HuggingFaceClient``
# already exposes ``generate_embeddings`` with the right contract.

EmbeddingFn = "Callable[[list[str]], Awaitable[list[list[float]]]]"  # noqa: F821 (annotation-only)


# ---------------------------------------------------------------------------
# Single pair detection
# ---------------------------------------------------------------------------


async def detect_cognates(
    french_text: str,
    target_text: str,
    *,
    threshold: float = 0.85,
    cognate_type: CognateLanguage = "french-spanish",
    embedding_fn: object | None = None,
) -> CognateResult:
    """Detect whether *french_text* and *target_text* are cognates.

    Parameters
    ----------
    french_text:
        French word or short phrase.
    target_text:
        Spanish or Portuguese word/phrase to compare against.
    threshold:
        Minimum cosine similarity to be considered a cognate.
    cognate_type:
        Which language pair is being compared.
    embedding_fn:
        An async function ``(texts: list[str]) -> list[list[float]]`` that
        returns embedding vectors.  When ``None`` the module falls back to a
        lightweight character-level heuristic (Levenshtein-ratio based) which
        does not require a network call.

    Returns
    -------
    CognateResult
    """
    if embedding_fn is not None:
        # Use embedding-based similarity
        try:
            embeddings = await embedding_fn([french_text, target_text])  # type: ignore[operator]
            if len(embeddings) >= 2:
                score = _cosine_similarity(embeddings[0], embeddings[1])
                return CognateResult(
                    is_cognate=score >= threshold,
                    similarity_score=round(score, 4),
                    cognate_type=cognate_type,
                )
        except Exception:
            logger.warning(
                "Embedding-based cognate detection failed, falling back to heuristic",
                exc_info=True,
            )

    # Fallback: normalised Levenshtein ratio (works offline, no model needed)
    score = _levenshtein_ratio(french_text.lower(), target_text.lower())
    return CognateResult(
        is_cognate=score >= threshold,
        similarity_score=round(score, 4),
        cognate_type=cognate_type,
    )


# ---------------------------------------------------------------------------
# Batch detection
# ---------------------------------------------------------------------------


async def detect_cognates_batch(
    items: list[tuple[str, str]],
    *,
    threshold: float = 0.85,
    cognate_type: CognateLanguage = "french-spanish",
    embedding_fn: object | None = None,
) -> list[CognateResult]:
    """Batch cognate detection for multiple word pairs.

    Parameters
    ----------
    items:
        List of ``(french_text, target_text)`` tuples.
    threshold:
        Minimum cosine similarity to be considered a cognate.
    cognate_type:
        Which language pair is being compared.
    embedding_fn:
        Optional async embedding function (same contract as
        :func:`detect_cognates`).

    Returns
    -------
    list[CognateResult]
        One result per input pair, in the same order.
    """
    if not items:
        return []

    if embedding_fn is not None:
        try:
            # Flatten all texts into one batch call for efficiency.
            all_texts = []
            for fr, tgt in items:
                all_texts.append(fr)
                all_texts.append(tgt)

            embeddings = await embedding_fn(all_texts)  # type: ignore[operator]

            results: list[CognateResult] = []
            for i in range(len(items)):
                emb_fr = embeddings[i * 2]
                emb_tgt = embeddings[i * 2 + 1]
                score = _cosine_similarity(emb_fr, emb_tgt)
                results.append(
                    CognateResult(
                        is_cognate=score >= threshold,
                        similarity_score=round(score, 4),
                        cognate_type=cognate_type,
                    )
                )
            return results
        except Exception:
            logger.warning(
                "Batch embedding cognate detection failed, falling back to heuristic",
                exc_info=True,
            )

    # Fallback: per-pair Levenshtein ratio
    return [
        CognateResult(
            is_cognate=_levenshtein_ratio(fr.lower(), tgt.lower()) >= threshold,
            similarity_score=round(
                _levenshtein_ratio(fr.lower(), tgt.lower()), 4
            ),
            cognate_type=cognate_type,
        )
        for fr, tgt in items
    ]


# ---------------------------------------------------------------------------
# Levenshtein ratio (offline heuristic fallback)
# ---------------------------------------------------------------------------


def _levenshtein_distance(s: str, t: str) -> int:
    """Compute the Levenshtein (edit) distance between two strings."""
    n, m = len(s), len(t)
    if n == 0:
        return m
    if m == 0:
        return n

    # Use a single-row DP approach for O(min(n,m)) space.
    if n > m:
        s, t = t, s
        n, m = m, n

    prev = list(range(n + 1))
    curr = [0] * (n + 1)

    for j in range(1, m + 1):
        curr[0] = j
        for i in range(1, n + 1):
            cost = 0 if s[i - 1] == t[j - 1] else 1
            curr[i] = min(
                prev[i] + 1,      # deletion
                curr[i - 1] + 1,  # insertion
                prev[i - 1] + cost,  # substitution
            )
        prev, curr = curr, prev

    return prev[n]


def _levenshtein_ratio(s: str, t: str) -> float:
    """Normalised similarity ratio in [0, 1] based on Levenshtein distance.

    1.0 means identical strings, 0.0 means completely different.
    """
    max_len = max(len(s), len(t))
    if max_len == 0:
        return 1.0
    distance = _levenshtein_distance(s, t)
    return 1.0 - (distance / max_len)
