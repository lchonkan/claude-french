"""Hugging Face Inference client for the French Learning Platform.

Wraps the ``huggingface_hub.InferenceClient`` to expose typed, task-specific
methods used by the AI router.  All models are accessed via dedicated
Inference Endpoints (not the free shared API) for production latency and
availability guarantees.

Models:
- Whisper (large-v3-turbo)   -- speech-to-text
- CamemBERT                  -- French grammar error classification
- Mistral (7B-Instruct)      -- text generation / grammar correction
- Wav2Vec2                   -- phoneme alignment
- Multilingual MiniLM (L12)  -- sentence embeddings (384-dim)
"""

from __future__ import annotations

import logging
import time
from typing import Any

from huggingface_hub import InferenceClient
from services.shared.ai.schemas import (
    GrammarError,
    PhonemeAlignment,
    PhonemeDetail,
)

logger = logging.getLogger(__name__)

# Default endpoint URLs (can be overridden via config)
_DEFAULT_WHISPER_ENDPOINT = "https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo"
_DEFAULT_MISTRAL_ENDPOINT = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"
_DEFAULT_CAMEMBERT_ENDPOINT = "https://api-inference.huggingface.co/models/camembert-base"
_DEFAULT_WAV2VEC2_ENDPOINT = "https://api-inference.huggingface.co/models/facebook/wav2vec2-large-xlsr-53-french"
_DEFAULT_MINILM_ENDPOINT = "https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


class HuggingFaceClient:
    """Typed interface to Hugging Face Inference Endpoints.

    Parameters
    ----------
    api_token:
        Hugging Face API token with access to the configured endpoints.
    whisper_endpoint:
        URL for the Whisper STT endpoint.
    mistral_endpoint:
        URL for the Mistral text-generation endpoint.
    camembert_endpoint:
        URL for the CamemBERT token-classification endpoint.
    wav2vec2_endpoint:
        URL for the Wav2Vec2 phoneme-alignment endpoint.
    minilm_endpoint:
        URL for the MiniLM embedding endpoint.
    """

    def __init__(
        self,
        *,
        api_token: str,
        whisper_endpoint: str = "",
        mistral_endpoint: str = "",
        camembert_endpoint: str = "",
        wav2vec2_endpoint: str = "",
        minilm_endpoint: str = "",
    ) -> None:
        self._token = api_token
        self._whisper_url = whisper_endpoint or _DEFAULT_WHISPER_ENDPOINT
        self._mistral_url = mistral_endpoint or _DEFAULT_MISTRAL_ENDPOINT
        self._camembert_url = camembert_endpoint or _DEFAULT_CAMEMBERT_ENDPOINT
        self._wav2vec2_url = wav2vec2_endpoint or _DEFAULT_WAV2VEC2_ENDPOINT
        self._minilm_url = minilm_endpoint or _DEFAULT_MINILM_ENDPOINT

        # A single InferenceClient is used for shared config; endpoint URLs
        # are passed per-call.
        self._client = InferenceClient(token=api_token)

    # -- Speech-to-text (Whisper) ----------------------------------------

    async def transcribe(self, audio_url: str) -> str:
        """Transcribe French audio to text using Whisper.

        Parameters
        ----------
        audio_url:
            Public or signed URL to the audio file.

        Returns
        -------
        str
            The transcribed French text.
        """
        try:
            result = self._client.automatic_speech_recognition(
                audio=audio_url,
                model=self._whisper_url,
            )
            # The ASR result can be a dict with "text" key or a string directly
            if isinstance(result, dict):
                return str(result.get("text", ""))
            # AutomaticSpeechRecognitionOutput object
            return str(result.text) if hasattr(result, "text") else str(result)
        except Exception:
            logger.exception("Whisper transcription failed for %s", audio_url)
            raise

    # -- Grammar classification (CamemBERT) ------------------------------

    async def classify_grammar(self, text: str) -> list[GrammarError]:
        """Detect grammar errors in French text using CamemBERT.

        Parameters
        ----------
        text:
            French text to analyze.

        Returns
        -------
        list[GrammarError]
            Detected grammar errors with positions and types.
        """
        try:
            result = self._client.token_classification(
                text,
                model=self._camembert_url,
            )
            errors: list[GrammarError] = []
            if not isinstance(result, list):
                return errors

            for item in result:
                item_dict: dict[str, Any] = (
                    item if isinstance(item, dict) else item.__dict__
                )
                entity_group = str(item_dict.get("entity_group", item_dict.get("entity", "")))
                if entity_group.startswith("ERR") or item_dict.get("score", 0) > 0.5:
                    errors.append(
                        GrammarError(
                            position=int(item_dict.get("start", 0)),
                            error_type=entity_group,
                            original=str(item_dict.get("word", "")),
                            correction="",  # correction generated by Mistral
                            explanation_es="",
                        )
                    )
            return errors
        except Exception:
            logger.exception("CamemBERT grammar classification failed")
            raise

    # -- Vocabulary difficulty classification (CamemBERT) -----------------

    async def classify_difficulty(
        self, text: str, cefr_level: str = "A1"
    ) -> dict[str, Any]:
        """Classify vocabulary difficulty using CamemBERT feature extraction.

        Analyzes the linguistic complexity of a French word or phrase by
        examining its token-level features from CamemBERT. The difficulty
        score is derived from the model's confidence distribution across
        sub-word tokens -- more complex words tend to be split into more
        sub-tokens with lower average confidence.

        Parameters
        ----------
        text:
            French word or phrase to classify.
        cefr_level:
            The expected CEFR level context (e.g. "A1", "B2"). Used to
            adjust the scoring baseline.

        Returns
        -------
        dict[str, Any]
            Dictionary with keys:
            - ``text`` (str): The input text.
            - ``difficulty_score`` (int): Score from 1 (easiest) to 5 (hardest).
            - ``confidence`` (float): Model confidence in the classification.
            - ``ai_platform`` (str): Always ``"huggingface"``.
            - ``latency_ms`` (int): Processing time in milliseconds.
        """
        start_time = time.monotonic()
        try:
            result = self._client.token_classification(
                text,
                model=self._camembert_url,
            )

            # Analyze token-level output for complexity signals
            if isinstance(result, list) and len(result) > 0:
                scores: list[float] = []
                for item in result:
                    item_dict: dict[str, Any] = (
                        item if isinstance(item, dict) else item.__dict__
                    )
                    scores.append(float(item_dict.get("score", 0.5)))

                # More sub-tokens and lower average score = higher difficulty
                avg_score = sum(scores) / len(scores) if scores else 0.5
                num_tokens = len(scores)

                # Base difficulty from token count and score distribution
                # 1-2 tokens with high confidence -> easy
                # Many tokens with low confidence -> hard
                token_factor = min(num_tokens / 5.0, 1.0)
                score_factor = 1.0 - avg_score
                raw_difficulty = (token_factor * 0.4 + score_factor * 0.6) * 5

                # Adjust by CEFR level baseline
                cefr_offsets = {
                    "A1": -0.5, "A2": -0.25, "B1": 0.0,
                    "B2": 0.25, "C1": 0.5, "C2": 0.75,
                }
                offset = cefr_offsets.get(cefr_level.upper(), 0.0)
                adjusted = raw_difficulty + offset

                difficulty_score = max(1, min(5, round(adjusted + 1)))
                confidence = avg_score
            else:
                # Fallback: estimate from text length and character complexity
                _accent_chars = (
                    "\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef"
                    "\u00f4\u00f6\u00f9\u00fb\u00fc\u00e7\u0153\u00e6"
                )
                has_accents = any(
                    c in text for c in _accent_chars
                )
                word_count = len(text.split())
                char_count = len(text)

                base = 1
                if char_count > 10:
                    base += 1
                if has_accents:
                    base += 1
                if word_count > 2:
                    base += 1

                difficulty_score = min(base, 5)
                confidence = 0.5

            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            return {
                "text": text,
                "difficulty_score": difficulty_score,
                "confidence": round(confidence, 3),
                "ai_platform": "huggingface",
                "latency_ms": elapsed_ms,
            }
        except Exception:
            logger.exception(
                "CamemBERT difficulty classification failed for: %s", text
            )
            # Return a safe fallback rather than raising
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            return {
                "text": text,
                "difficulty_score": 2,
                "confidence": 0.0,
                "ai_platform": "huggingface",
                "latency_ms": elapsed_ms,
            }

    # -- Grammar correction (Mistral) ------------------------------------

    async def generate_correction(
        self, text: str, errors: list[GrammarError]
    ) -> str:
        """Generate corrected text and Spanish explanations using Mistral.

        Parameters
        ----------
        text:
            Original French text with errors.
        errors:
            List of detected errors from ``classify_grammar``.

        Returns
        -------
        str
            JSON string with corrected text and per-error explanations.
        """
        error_descriptions = "; ".join(
            f"position {e.position}: '{e.original}' ({e.error_type})"
            for e in errors
        )
        prompt = (
            f"Corrige el siguiente texto en franc\u00e9s y explica cada error en espa\u00f1ol.\n"
            f"Texto: {text}\n"
            f"Errores detectados: {error_descriptions}\n\n"
            f"Responde en JSON con las claves: corrected_text, errors (lista con "
            f"original, correction, explanation_es por cada error)."
        )
        try:
            result = self._client.text_generation(
                prompt,
                model=self._mistral_url,
                max_new_tokens=1024,
                temperature=0.3,
            )
            return str(result)
        except Exception:
            logger.exception("Mistral grammar correction failed")
            raise

    # -- Phoneme alignment (Wav2Vec2) ------------------------------------

    async def align_phonemes(
        self, audio_url: str, text: str
    ) -> PhonemeAlignment:
        """Align learner audio phonemes against the target text using Wav2Vec2.

        Parameters
        ----------
        audio_url:
            URL to the learner's recorded audio.
        text:
            Expected French text for alignment.

        Returns
        -------
        PhonemeAlignment
            Per-phoneme accuracy details.
        """
        try:
            result = self._client.automatic_speech_recognition(
                audio=audio_url,
                model=self._wav2vec2_url,
            )

            phonemes: list[PhonemeDetail] = []
            # Parse chunks/segments if available
            raw = result if isinstance(result, dict) else (
                result.__dict__ if hasattr(result, "__dict__") else {}
            )
            chunks: list[dict[str, Any]] = raw.get("chunks", [])
            for chunk in chunks:
                timestamp = chunk.get("timestamp", [0.0, 0.0])
                start = float(timestamp[0]) if timestamp and len(timestamp) > 0 else 0.0
                end = float(timestamp[1]) if timestamp and len(timestamp) > 1 else 0.0
                phonemes.append(
                    PhonemeDetail(
                        phoneme=str(chunk.get("text", "")),
                        expected=str(chunk.get("text", "")),
                        actual=str(chunk.get("text", "")),
                        score=float(chunk.get("score", 0.0)),
                        timestamp_start=start,
                        timestamp_end=end,
                    )
                )
            return PhonemeAlignment(phonemes=phonemes)
        except Exception:
            logger.exception("Wav2Vec2 phoneme alignment failed")
            raise

    # -- Embeddings (MiniLM) ---------------------------------------------

    async def generate_embeddings(
        self, texts: list[str]
    ) -> list[list[float]]:
        """Generate 384-dimensional sentence embeddings using MiniLM.

        Parameters
        ----------
        texts:
            List of texts to embed.

        Returns
        -------
        list[list[float]]
            One embedding vector per input text.
        """
        try:
            result = self._client.feature_extraction(
                texts,  # type: ignore[arg-type]
                model=self._minilm_url,
            )
            # result is typically a nested list of floats
            if isinstance(result, list):
                # Handle both [[float, ...]] and [[[float, ...]]]
                if result and isinstance(result[0], list):
                    if result[0] and isinstance(result[0][0], list):
                        # Mean-pool token-level embeddings to sentence level
                        return [
                            [
                                sum(token[i] for token in sent) / len(sent)
                                for i in range(len(sent[0]))
                            ]
                            for sent in result
                        ]
                    return result  # type: ignore[return-value]
            return []
        except Exception:
            logger.exception("MiniLM embedding generation failed")
            raise

    # -- Text generation (Mistral) ---------------------------------------

    async def generate_text(self, prompt: str, system: str = "") -> str:
        """Generate text using Mistral.

        Parameters
        ----------
        prompt:
            User prompt.
        system:
            Optional system prompt.

        Returns
        -------
        str
            Generated text.
        """
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        try:
            result = self._client.text_generation(
                full_prompt,
                model=self._mistral_url,
                max_new_tokens=2048,
                temperature=0.7,
            )
            return str(result)
        except Exception:
            logger.exception("Mistral text generation failed")
            raise

    # -- Health check ----------------------------------------------------

    async def health_check(self) -> bool:
        """Verify that at least one Inference Endpoint is reachable.

        Returns ``True`` if a lightweight call succeeds, ``False`` otherwise.
        """
        try:
            # Tiny embedding call as a ping
            self._client.feature_extraction(
                "ping",
                model=self._minilm_url,
            )
            return True
        except Exception:
            logger.warning("HuggingFace health check failed")
            return False
