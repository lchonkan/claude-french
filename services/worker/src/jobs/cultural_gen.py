"""Cultural content generation worker job.

Receives a cultural content generation request, calls Gemini Flash to
produce a bilingual (FR/ES) cultural article, and stores the result
in the ``cultural_notes`` table.

Registered as the ``cultural_content`` job type in the worker registry.
"""

from __future__ import annotations

import logging
from typing import Any

from services.shared.ai.gemini import GeminiClient
from services.shared.ai.schemas import CulturalContent
from services.worker.src.config import get_worker_settings
from services.worker.src.main import register_job

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Job handler
# ---------------------------------------------------------------------------


@register_job("cultural_content")
async def handle_cultural_gen(
    supabase_admin: Any, payload: dict[str, Any]
) -> None:
    """Generate a cultural content article using Gemini Flash.

    Expected payload keys:
    - ``cefr_level`` (str): Target CEFR level (e.g. ``"A1"``).
    - ``category`` (str): Cultural category
      (history, neighborhoods, etiquette, cuisine, daily_life).
    - ``topic_hint`` (str | None): Optional topic suggestion.
    - ``align_with_vocabulary`` (list[str]): Optional vocab IDs to align.
    - ``generation_id`` (str): Unique identifier for tracking.
    """
    cefr_level = payload.get("cefr_level", "A1")
    category = payload.get("category", "daily_life")
    topic_hint = payload.get("topic_hint")
    align_with_vocabulary = payload.get("align_with_vocabulary", [])
    generation_id = payload.get("generation_id", "")

    logger.info(
        "Starting cultural content generation: level=%s category=%s gen_id=%s",
        cefr_level,
        category,
        generation_id,
    )

    # Validate category
    valid_categories = {
        "history",
        "neighborhoods",
        "etiquette",
        "cuisine",
        "daily_life",
    }
    if category not in valid_categories:
        logger.error(
            "cultural_content: invalid category '%s' (gen_id=%s)",
            category,
            generation_id,
        )
        return

    # Call Gemini Flash for generation
    settings = get_worker_settings()
    gemini = GeminiClient(api_key=settings.GOOGLE_GEMINI_API_KEY)

    try:
        result: CulturalContent = (
            await gemini.generate_cultural_content(
                cefr_level=cefr_level,
                category=category,
            )
        )
    except Exception:
        logger.exception(
            "Gemini cultural content generation failed (gen_id=%s)",
            generation_id,
        )
        return

    # If a topic hint was provided, log it for reference
    if topic_hint:
        logger.info(
            "Cultural content generated with topic_hint='%s' (gen_id=%s)",
            topic_hint,
            generation_id,
        )

    # Build vocabulary IDs list: use aligned IDs if provided,
    # otherwise use whatever Gemini suggested (which are likely empty
    # placeholders for new content)
    vocab_ids = align_with_vocabulary or result.vocabulary_ids

    # Store the generated cultural note
    try:
        insert_data: dict[str, Any] = {
            "cefr_level": cefr_level,
            "title_fr": result.title_fr,
            "title_es": result.title_es,
            "content_fr": result.content_fr,
            "content_es": result.content_es,
            "vocabulary_ids": vocab_ids,
            "category": result.category or category,
            "is_generated": True,
            "reviewed": False,
        }

        await (
            supabase_admin.table("cultural_notes")
            .insert(insert_data)
            .execute()
        )

        logger.info(
            "Cultural content stored successfully: "
            "title_fr='%s' level=%s category=%s gen_id=%s",
            result.title_fr,
            cefr_level,
            category,
            generation_id,
        )
    except Exception:
        logger.exception(
            "Failed to store cultural content (gen_id=%s)",
            generation_id,
        )
