"""Shared AI package -- clients, router, anonymizer, cognates, and schemas."""

from services.shared.ai.anonymizer import anonymize_text, deanonymize_text
from services.shared.ai.cognates import (
    CognateResult,
    detect_cognates,
    detect_cognates_batch,
)
from services.shared.ai.gemini import GeminiClient
from services.shared.ai.huggingface import HuggingFaceClient
from services.shared.ai.logger import log_ai_usage
from services.shared.ai.router import AIRouter, AITaskType

__all__ = [
    "AIRouter",
    "AITaskType",
    "CognateResult",
    "GeminiClient",
    "HuggingFaceClient",
    "anonymize_text",
    "deanonymize_text",
    "detect_cognates",
    "detect_cognates_batch",
    "log_ai_usage",
]
