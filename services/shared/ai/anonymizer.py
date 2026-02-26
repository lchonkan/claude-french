"""PII anonymization for text before it is sent to external AI platforms.

All learner data MUST be stripped of personally identifiable information
(FR-025) before reaching Hugging Face Inference Endpoints or the Gemini API.
This module provides ``anonymize_text`` to replace PII with placeholders and
``deanonymize_text`` to restore the originals when needed.

Supported PII types:
- Email addresses  -> [EMAIL]
- Phone numbers    -> [PHONE]
- Person names     -> [NAME]

Name detection uses a lightweight heuristic (capitalized word sequences).
For production at scale, consider supplementing with a dedicated NER model.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# RFC-5322-simplified email pattern
_EMAIL_RE = re.compile(
    r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"
)

# International phone numbers: optional +, digits, spaces, hyphens, parens
# Requires at least 7 digit characters to avoid false positives.
_PHONE_RE = re.compile(
    r"(?<!\w)"                      # not preceded by a word char
    r"(?:\+?\d{1,3}[\s\-]?)?"      # optional country code
    r"(?:\(?\d{1,4}\)?[\s\-]?)?"   # optional area code
    r"(?:\d[\s\-]?){6,12}\d"       # main number (7-13 digits)
    r"(?!\w)"                       # not followed by a word char
)

# Simplistic name heuristic: sequences of 2-4 capitalized words that are
# NOT at the start of a sentence (preceded by ". " or start-of-string).
# This is deliberately conservative to avoid false positives in French text.
_NAME_RE = re.compile(
    r"(?<=[.!?]\s|^)"              # after sentence boundary
    r"(?!(?:Le|La|Les|Un|Une|Des|Je|Tu|Il|Elle|Nous|Vous|Ils|Elles|On|Ce|Cette|Ces)\b)"
    r"([A-Z][a-z\u00C0-\u00FF]+(?:\s+[A-Z][a-z\u00C0-\u00FF]+){1,3})"
)

# A more general pattern for standalone capitalized word pairs that look
# like personal names appearing mid-sentence.
_NAME_INLINE_RE = re.compile(
    r"(?<=\s)"
    r"([A-Z][a-z\u00C0-\u00FF]{1,20}\s+[A-Z][a-z\u00C0-\u00FF]{1,20})"
    r"(?=[\s,;.!?]|$)"
)


@dataclass
class AnonymizationResult:
    """Result of anonymizing a piece of text."""

    text: str
    mapping: dict[str, str] = field(default_factory=dict)


def anonymize_text(text: str) -> AnonymizationResult:
    """Replace PII in *text* with bracketed placeholders.

    Returns an ``AnonymizationResult`` containing the cleaned text and a
    mapping from placeholder to original value, which can be passed to
    ``deanonymize_text`` to restore the originals.

    The same original value always receives the same numbered placeholder
    within a single call (e.g. the same email appearing twice maps to the
    same ``[EMAIL_1]``).
    """
    mapping: dict[str, str] = {}
    counters: dict[str, int] = {"EMAIL": 0, "PHONE": 0, "NAME": 0}
    originals_seen: dict[str, str] = {}  # original -> placeholder

    def _replace(match: re.Match[str], label: str) -> str:
        original = match.group(0)
        if original in originals_seen:
            return originals_seen[original]
        counters[label] += 1
        placeholder = f"[{label}_{counters[label]}]"
        mapping[placeholder] = original
        originals_seen[original] = placeholder
        return placeholder

    # Order matters: emails first (they can contain digits that look phone-ish)
    result = _EMAIL_RE.sub(lambda m: _replace(m, "EMAIL"), text)
    result = _PHONE_RE.sub(lambda m: _replace(m, "PHONE"), result)

    # Name patterns -- apply both heuristics
    result = _NAME_RE.sub(lambda m: _replace(m, "NAME"), result)
    result = _NAME_INLINE_RE.sub(lambda m: _replace(m, "NAME"), result)

    return AnonymizationResult(text=result, mapping=mapping)


def deanonymize_text(text: str, mapping: dict[str, str]) -> str:
    """Restore original PII values in *text* using the *mapping* produced
    by a prior ``anonymize_text`` call.

    Placeholders not found in *mapping* are left unchanged.
    """
    result = text
    for placeholder, original in mapping.items():
        result = result.replace(placeholder, original)
    return result
