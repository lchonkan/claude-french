"""AI usage logger -- records every AI platform interaction.

Every call to Hugging Face or Gemini is logged into the
``ai_model_usage_logs`` table (see migration 006) via the Supabase
service-role client.  This powers the admin analytics dashboard
(User Story 10 / FR-007).

The ``log_ai_usage`` coroutine is designed to be fire-and-forget safe:
logging failures are caught and reported to stderr so they never
propagate to the learner-facing request path.
"""

from __future__ import annotations

import logging
import uuid
from decimal import Decimal
from typing import Literal

from supabase import AsyncClient as AsyncSupabaseClient

logger = logging.getLogger(__name__)

# Type alias matching the DB enum
AIPlatform = Literal["huggingface", "gemini"]

AITaskType = Literal[
    "grammar_check",
    "stt",
    "phoneme_alignment",
    "embedding",
    "text_generation",
    "writing_eval",
    "conversation",
    "pronunciation_analysis",
    "lesson_generation",
    "difficulty_recalibration",
    "cultural_content",
]


async def log_ai_usage(
    client: AsyncSupabaseClient,
    *,
    session_id: str | uuid.UUID,
    user_id: str | uuid.UUID | None,
    platform: AIPlatform,
    model_name: str,
    task_type: AITaskType,
    latency_ms: int,
    cost_usd: float | Decimal | None = None,
    input_tokens: int | None = None,
    output_tokens: int | None = None,
    success: bool = True,
    error_message: str | None = None,
    is_fallback: bool = False,
) -> None:
    """Insert a row into ``ai_model_usage_logs``.

    Parameters
    ----------
    client:
        An async Supabase client authenticated with the **service role key**
        (the table's RLS policy restricts inserts to ``service_role``).
    session_id:
        Internal correlation identifier for this AI interaction.  This is
        *not* the user ID -- it exists for response-correlation only.
    user_id:
        Optional learner ID for aggregate analytics.
    platform:
        ``"huggingface"`` or ``"gemini"``.
    model_name:
        Human-readable model identifier (e.g. ``"whisper-large-v3-turbo"``).
    task_type:
        One of the ``ai_task_type_enum`` values.
    latency_ms:
        Round-trip latency in milliseconds.
    cost_usd:
        Estimated cost of the inference call.
    input_tokens:
        Number of input tokens consumed (if available from the provider).
    output_tokens:
        Number of output tokens generated.
    success:
        Whether the call completed without error.
    error_message:
        Error description when ``success`` is ``False``.
    is_fallback:
        ``True`` when the request was routed to a fallback platform.
    """
    row = {
        "session_id": str(session_id),
        "user_id": str(user_id) if user_id else None,
        "platform": platform,
        "model_name": model_name,
        "task_type": task_type,
        "latency_ms": latency_ms,
        "estimated_cost_usd": float(cost_usd) if cost_usd is not None else None,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "success": success,
        "error_message": error_message,
        "is_fallback": is_fallback,
    }

    try:
        await client.table("ai_model_usage_logs").insert(row).execute()
    except Exception:
        # Logging must never break the learner-facing request.
        logger.exception("Failed to log AI usage: %s", row)
