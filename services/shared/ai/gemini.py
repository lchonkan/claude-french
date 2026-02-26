"""Google Gemini API client for the French Learning Platform.

Uses the ``google-genai`` SDK to access Gemini models.  Flash is the default
for most tasks (low latency, cost-effective); Pro is used for writing
evaluation where deeper reasoning quality justifies the higher cost.

All evaluation methods return structured Pydantic models defined in
``services.shared.ai.schemas``.  The Gemini API is configured to return
JSON which is then validated through Pydantic.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from google import genai
from google.genai import types

from services.shared.ai.schemas import (
    ConversationEvaluation,
    CulturalContent,
    DifficultyAdjustment,
    LessonContent,
    PronunciationEvaluation,
    WritingEvaluation,
)

logger = logging.getLogger(__name__)

# Model identifiers
_FLASH_MODEL = "gemini-2.0-flash"
_PRO_MODEL = "gemini-2.0-pro"


class GeminiClient:
    """Typed interface to the Google Gemini API.

    Parameters
    ----------
    api_key:
        Google Gemini API key.
    """

    def __init__(self, *, api_key: str) -> None:
        self._client = genai.Client(api_key=api_key)

    # -- Internal helpers ------------------------------------------------

    def _build_config(
        self,
        *,
        temperature: float = 0.4,
        max_output_tokens: int = 4096,
        response_mime_type: str = "application/json",
    ) -> types.GenerateContentConfig:
        """Create a generation config requesting structured JSON output."""
        return types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            response_mime_type=response_mime_type,
        )

    def _parse_json_response(self, response: Any) -> dict[str, Any]:
        """Extract and parse JSON from a Gemini response."""
        text = response.text if hasattr(response, "text") else str(response)
        # Strip potential markdown code fences
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()
        return json.loads(text)  # type: ignore[no-any-return]

    # -- Writing evaluation (Pro) ----------------------------------------

    async def evaluate_writing(
        self, text: str, cefr_level: str, prompt: str
    ) -> WritingEvaluation:
        """Evaluate a learner's written text against CEFR criteria.

        Uses Gemini Pro for higher reasoning quality.

        Parameters
        ----------
        text:
            The learner's submitted French text.
        cefr_level:
            The learner's current CEFR level (e.g. ``"A1"``).
        prompt:
            The writing prompt the learner was responding to.

        Returns
        -------
        WritingEvaluation
            Structured CEFR-aligned evaluation.
        """
        system_prompt = (
            "Eres un evaluador experto de escritura en franc\u00e9s alineado con el MCER (CEFR). "
            "Eval\u00faa el texto del alumno seg\u00fan los criterios de gram\u00e1tica, vocabulario, "
            "coherencia y cumplimiento de la tarea. Proporciona puntuaciones de 0 a 1 para cada "
            "criterio, un nivel CEFR general, retroalimentaci\u00f3n detallada en espa\u00f1ol, "
            "y errores espec\u00edficos encontrados.\n\n"
            "Responde SOLO con JSON v\u00e1lido con esta estructura:\n"
            "{\n"
            '  "grammar_score": 0.0-1.0,\n'
            '  "vocabulary_score": 0.0-1.0,\n'
            '  "coherence_score": 0.0-1.0,\n'
            '  "task_completion_score": 0.0-1.0,\n'
            '  "overall_cefr": "A1"|"A2"|"B1"|"B2"|"C1"|"C2",\n'
            '  "feedback_es": "retroalimentaci\u00f3n detallada en espa\u00f1ol",\n'
            '  "details": [{"position": int, "error_type": str, "original": str, '
            '"correction": str, "explanation_es": str}]\n'
            "}"
        )
        user_prompt = (
            f"Nivel CEFR del alumno: {cefr_level}\n"
            f"Consigna de escritura: {prompt}\n\n"
            f"Texto del alumno:\n{text}"
        )

        try:
            response = self._client.models.generate_content(
                model=_PRO_MODEL,
                contents=[
                    types.Content(
                        role="user",
                        parts=[types.Part(text=f"{system_prompt}\n\n{user_prompt}")],
                    )
                ],
                config=self._build_config(temperature=0.3, max_output_tokens=4096),
            )
            data = self._parse_json_response(response)
            return WritingEvaluation(**data)
        except Exception:
            logger.exception("Gemini writing evaluation failed")
            raise

    # -- Conversation (Flash) --------------------------------------------

    async def converse(
        self, messages: list[dict[str, str]], scenario: str, cefr_level: str
    ) -> str:
        """Generate the next AI turn in a French conversation.

        Parameters
        ----------
        messages:
            Conversation history as ``[{"role": "user"|"assistant", "content": ...}]``.
        scenario:
            Scenario description (e.g. ``"Ordering at a Parisian cafe"``).
        cefr_level:
            Learner's CEFR level to calibrate complexity.

        Returns
        -------
        str
            The AI's next French response.
        """
        system_prompt = (
            f"Eres un tutor de franc\u00e9s conversacional. El escenario es: {scenario}. "
            f"El alumno est\u00e1 en nivel CEFR {cefr_level}. "
            f"Responde en franc\u00e9s al nivel apropiado. Si el alumno comete errores, "
            f"corr\u00edgelos sutilmente dentro de la conversaci\u00f3n. Si el alumno escribe "
            f"en espa\u00f1ol, proporciona la explicaci\u00f3n en espa\u00f1ol y repite en franc\u00e9s simplificado."
        )

        contents: list[types.Content] = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(
                types.Content(role=role, parts=[types.Part(text=msg["content"])])
            )

        try:
            response = self._client.models.generate_content(
                model=_FLASH_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=1024,
                    system_instruction=system_prompt,
                ),
            )
            return response.text or ""
        except Exception:
            logger.exception("Gemini conversation failed")
            raise

    # -- Conversation evaluation (Flash) ---------------------------------

    async def evaluate_conversation(
        self, messages: list[dict[str, str]]
    ) -> ConversationEvaluation:
        """Evaluate a completed conversation session.

        Parameters
        ----------
        messages:
            Full conversation history.

        Returns
        -------
        ConversationEvaluation
        """
        transcript = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in messages
        )
        prompt = (
            "Eval\u00faa la siguiente conversaci\u00f3n en franc\u00e9s del alumno. "
            "Proporciona puntuaciones de 0 a 1 para vocabulario, gram\u00e1tica y "
            "eficacia comunicativa, junto con retroalimentaci\u00f3n en espa\u00f1ol.\n\n"
            "Responde SOLO con JSON v\u00e1lido:\n"
            "{\n"
            '  "vocabulary_score": 0.0-1.0,\n'
            '  "grammar_score": 0.0-1.0,\n'
            '  "communicative_score": 0.0-1.0,\n'
            '  "feedback_es": "retroalimentaci\u00f3n en espa\u00f1ol"\n'
            "}\n\n"
            f"Transcripci\u00f3n:\n{transcript}"
        )

        try:
            response = self._client.models.generate_content(
                model=_FLASH_MODEL,
                contents=[
                    types.Content(role="user", parts=[types.Part(text=prompt)])
                ],
                config=self._build_config(temperature=0.3),
            )
            data = self._parse_json_response(response)
            return ConversationEvaluation(**data)
        except Exception:
            logger.exception("Gemini conversation evaluation failed")
            raise

    # -- Pronunciation evaluation (Flash, multimodal) --------------------

    async def evaluate_pronunciation(
        self, audio_url: str, target_text: str
    ) -> PronunciationEvaluation:
        """Evaluate pronunciation quality using multimodal analysis.

        Parameters
        ----------
        audio_url:
            URL to the learner's recorded audio.
        target_text:
            The French text the learner was attempting to pronounce.

        Returns
        -------
        PronunciationEvaluation
        """
        prompt = (
            "Eval\u00faa la pronunciaci\u00f3n del alumno comparando el audio con el texto objetivo. "
            "Proporciona puntuaciones de 0 a 1 para precisi\u00f3n fon\u00e9mica, prosodia, "
            "fluidez y puntuaci\u00f3n general. Incluye detalles por fonema y sugerencias "
            "de mejora en espa\u00f1ol.\n\n"
            "Responde SOLO con JSON v\u00e1lido:\n"
            "{\n"
            '  "phoneme_accuracy": 0.0-1.0,\n'
            '  "prosody_score": 0.0-1.0,\n'
            '  "fluency_score": 0.0-1.0,\n'
            '  "overall_score": 0.0-1.0,\n'
            '  "phoneme_details": [{"phoneme": str, "expected": str, "actual": str, '
            '"score": 0.0-1.0, "timestamp_start": float, "timestamp_end": float}],\n'
            '  "suggestions": ["sugerencia en espa\u00f1ol"]\n'
            "}\n\n"
            f"Texto objetivo: {target_text}\n"
            f"Audio URL: {audio_url}"
        )

        try:
            # For multimodal: pass the audio URL as a file reference.
            # If the audio is accessible via URL, Gemini can process it.
            parts: list[types.Part] = [types.Part(text=prompt)]

            # Attempt to include audio as a file URI for multimodal processing
            if audio_url.startswith(("http://", "https://", "gs://")):
                parts.append(
                    types.Part(
                        file_data=types.FileData(
                            file_uri=audio_url,
                            mime_type="audio/webm",
                        )
                    )
                )

            response = self._client.models.generate_content(
                model=_FLASH_MODEL,
                contents=[types.Content(role="user", parts=parts)],
                config=self._build_config(temperature=0.2),
            )
            data = self._parse_json_response(response)
            return PronunciationEvaluation(**data)
        except Exception:
            logger.exception("Gemini pronunciation evaluation failed")
            raise

    # -- Lesson generation (Flash) ---------------------------------------

    async def generate_lesson(
        self, module: str, cefr_level: str, topic: str
    ) -> LessonContent:
        """Generate a full lesson with exercises for a given module and topic.

        Parameters
        ----------
        module:
            Module type (vocabulary, grammar, writing, etc.).
        cefr_level:
            Target CEFR level.
        topic:
            Topic or grammar point for the lesson.

        Returns
        -------
        LessonContent
        """
        prompt = (
            f"Genera una lecci\u00f3n completa de franc\u00e9s para el m\u00f3dulo '{module}' "
            f"a nivel CEFR {cefr_level} sobre el tema '{topic}'.\n\n"
            "La lecci\u00f3n debe incluir:\n"
            "- T\u00edtulo en franc\u00e9s y espa\u00f1ol\n"
            "- Descripci\u00f3n en espa\u00f1ol\n"
            "- Contenido estructurado (explicaciones, ejemplos, notas)\n"
            "- 3-5 ejercicios variados (fill_blank, multiple_choice, reorder, etc.)\n\n"
            "Responde SOLO con JSON v\u00e1lido:\n"
            "{\n"
            '  "title_fr": "T\u00edtulo en franc\u00e9s",\n'
            '  "title_es": "T\u00edtulo en espa\u00f1ol",\n'
            '  "description_es": "Descripci\u00f3n de la lecci\u00f3n",\n'
            '  "content": {"explanation": "...", "examples": [...], "notes": "..."},\n'
            '  "exercises": [{"type": "fill_blank", "prompt_es": "...", '
            '"question": "...", "correct_answer": "...", "options": [...]}]\n'
            "}"
        )

        try:
            response = self._client.models.generate_content(
                model=_FLASH_MODEL,
                contents=[
                    types.Content(role="user", parts=[types.Part(text=prompt)])
                ],
                config=self._build_config(temperature=0.6, max_output_tokens=8192),
            )
            data = self._parse_json_response(response)
            return LessonContent(**data)
        except Exception:
            logger.exception("Gemini lesson generation failed")
            raise

    # -- Cultural content generation (Flash) -----------------------------

    async def generate_cultural_content(
        self, cefr_level: str, category: str
    ) -> CulturalContent:
        """Generate a Paris-focused cultural enrichment article.

        Parameters
        ----------
        cefr_level:
            Target CEFR level for vocabulary / grammar complexity.
        category:
            Cultural category (history, neighborhoods, etiquette, cuisine, daily_life).

        Returns
        -------
        CulturalContent
        """
        prompt = (
            f"Genera un art\u00edculo cultural sobre Par\u00eds en la categor\u00eda '{category}' "
            f"para un alumno de franc\u00e9s a nivel CEFR {cefr_level}.\n\n"
            "El art\u00edculo debe:\n"
            "- Estar escrito en franc\u00e9s al nivel apropiado\n"
            "- Incluir una versi\u00f3n / resumen en espa\u00f1ol\n"
            "- Tener un t\u00edtulo en ambos idiomas\n"
            "- Incluir vocabulario relevante al curr\u00edculo\n\n"
            "Responde SOLO con JSON v\u00e1lido:\n"
            "{\n"
            '  "title_fr": "Titre en fran\u00e7ais",\n'
            '  "title_es": "T\u00edtulo en espa\u00f1ol",\n'
            '  "content_fr": "Contenido en franc\u00e9s...",\n'
            '  "content_es": "Contenido en espa\u00f1ol...",\n'
            '  "vocabulary_ids": [],\n'
            '  "category": "' + category + '"\n'
            "}"
        )

        try:
            response = self._client.models.generate_content(
                model=_FLASH_MODEL,
                contents=[
                    types.Content(role="user", parts=[types.Part(text=prompt)])
                ],
                config=self._build_config(temperature=0.7, max_output_tokens=4096),
            )
            data = self._parse_json_response(response)
            return CulturalContent(**data)
        except Exception:
            logger.exception("Gemini cultural content generation failed")
            raise

    # -- Difficulty recalibration (Flash) --------------------------------

    async def recalibrate_difficulty(
        self, mastery_data: dict[str, Any]
    ) -> DifficultyAdjustment:
        """Analyze learner mastery data and recommend difficulty adjustments.

        Parameters
        ----------
        mastery_data:
            Dictionary containing per-skill mastery metrics, error patterns,
            and recent exercise results.

        Returns
        -------
        DifficultyAdjustment
        """
        prompt = (
            "Analiza los datos de maestr\u00eda del alumno y recomienda ajustes de dificultad "
            "para cada habilidad. Cada ajuste debe indicar la habilidad, dificultad actual (1-5), "
            "dificultad recomendada (1-5) y justificaci\u00f3n.\n\n"
            "Responde SOLO con JSON v\u00e1lido:\n"
            "{\n"
            '  "adjustments": [\n'
            "    {\n"
            '      "skill": "vocabulary"|"grammar"|"writing"|"listening"|"pronunciation"|"conversation",\n'
            '      "current_difficulty": 1-5,\n'
            '      "recommended_difficulty": 1-5,\n'
            '      "reason": "justificaci\u00f3n"\n'
            "    }\n"
            "  ]\n"
            "}\n\n"
            f"Datos de maestr\u00eda:\n{json.dumps(mastery_data, ensure_ascii=False, indent=2)}"
        )

        try:
            response = self._client.models.generate_content(
                model=_FLASH_MODEL,
                contents=[
                    types.Content(role="user", parts=[types.Part(text=prompt)])
                ],
                config=self._build_config(temperature=0.3),
            )
            data = self._parse_json_response(response)
            return DifficultyAdjustment(**data)
        except Exception:
            logger.exception("Gemini difficulty recalibration failed")
            raise

    # -- Health check ----------------------------------------------------

    async def health_check(self) -> bool:
        """Verify connectivity to the Gemini API.

        Returns ``True`` if a lightweight call succeeds, ``False`` otherwise.
        """
        try:
            response = self._client.models.generate_content(
                model=_FLASH_MODEL,
                contents=[
                    types.Content(
                        role="user", parts=[types.Part(text="Dis bonjour.")]
                    )
                ],
                config=types.GenerateContentConfig(
                    temperature=0.0, max_output_tokens=16
                ),
            )
            return bool(response.text)
        except Exception:
            logger.warning("Gemini health check failed")
            return False
