# ruff: noqa: B008
"""Conversation practice API routes for the French Learning Platform.

Endpoints:
- POST /sessions                    -- Start a new conversation session
- POST /sessions/{id}/messages      -- Send a message and get AI response
- POST /sessions/{id}/end           -- End the conversation and trigger evaluation
- GET  /sessions/{id}/evaluation    -- Get evaluation results for a session

The conversation flow uses Mistral (via HuggingFace) for lightweight
conversational turns and inline grammar corrections, and Gemini Flash
for the post-conversation evaluation.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from services.api.src.middleware.auth import UserInfo, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Predefined scenarios
# ---------------------------------------------------------------------------

SCENARIOS: list[dict[str, str]] = [
    {
        "id": "cafe",
        "title": "Ordering at a Parisian cafe",
        "description": "Practica pedir bebidas y comida en un cafe parisino.",
        "icon": "coffee",
        "difficulty": "A1",
    },
    {
        "id": "directions",
        "title": "Asking for directions",
        "description": "Aprende a preguntar y entender direcciones en la ciudad.",
        "icon": "map",
        "difficulty": "A1",
    },
    {
        "id": "meeting",
        "title": "Meeting someone new",
        "description": "Presentate y conoce a alguien por primera vez.",
        "icon": "users",
        "difficulty": "A1",
    },
    {
        "id": "shopping",
        "title": "Shopping at the market",
        "description": "Compra frutas, verduras y productos en el mercado.",
        "icon": "shopping-bag",
        "difficulty": "A2",
    },
    {
        "id": "restaurant",
        "title": "At the restaurant",
        "description": "Reserva, ordena y paga en un restaurante frances.",
        "icon": "utensils",
        "difficulty": "A2",
    },
]

# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

_GREETING_SYSTEM = (
    "You are a friendly French tutor engaging in a conversation practice session. "
    "The scenario is: {scenario}. The learner is at CEFR level {cefr_level}. "
    "Generate a warm greeting in French that sets up the scenario naturally. "
    "Keep the French at the appropriate CEFR level. "
    "If the level is A1 or A2, use simple, short sentences. "
    "End with a question or prompt to engage the learner."
)

_CONVERSATION_SYSTEM = (
    "You are a French conversation tutor. The scenario is: {scenario}. "
    "The learner is at CEFR level {cefr_level}.\n\n"
    "Rules:\n"
    "1. Respond naturally in French at the appropriate CEFR level.\n"
    "2. If the learner makes grammar errors, include an inline correction in your "
    "response using this format: [CORRECTION: original -> corrected | explanation in Spanish]\n"
    "3. If the learner writes in Spanish or seems to be struggling, provide a brief "
    "explanation in Spanish (marked with [ES: ...]) and then repeat your point in "
    "simplified French.\n"
    "4. Stay in character for the scenario.\n"
    "5. Keep responses concise -- 1-3 sentences for the conversation, plus any corrections.\n"
    "6. Respond ONLY with the conversation text and any correction annotations."
)

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class StartSessionRequest(BaseModel):
    """Request body to start a new conversation session."""

    cefr_level: str = Field(
        ...,
        pattern=r"^(A1|A2|B1|B2|C1|C2)$",
        description="Learner CEFR level.",
    )
    scenario: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Scenario title (must match a predefined scenario or custom text).",
    )


class StartSessionResponse(BaseModel):
    """Response after starting a conversation session."""

    session_id: str
    scenario_title: str
    cefr_level: str
    greeting: str
    messages: list[dict[str, Any]]


class SendMessageRequest(BaseModel):
    """Request body to send a user message in a conversation."""

    content: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The learner's message in French (or Spanish if struggling).",
    )


class MessageResponse(BaseModel):
    """AI response to a user message."""

    role: str = "assistant"
    content: str
    corrections: list[dict[str, str]] = Field(default_factory=list)
    has_spanish_fallback: bool = False


class EndSessionResponse(BaseModel):
    """Response after ending a conversation session."""

    session_id: str
    status: str
    message_count: int
    evaluation_pending: bool


class EvaluationResponse(BaseModel):
    """Evaluation results for a completed conversation."""

    session_id: str
    vocabulary_score: float | None
    grammar_score: float | None
    communicative_score: float | None
    feedback_es: str
    status: str


class ScenariosResponse(BaseModel):
    """List of available conversation scenarios."""

    scenarios: list[dict[str, str]]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_supabase(request: Request) -> Any:
    """Extract the Supabase client from app state."""
    supabase = getattr(request.app.state, "supabase", None)
    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database client not available.",
        )
    return supabase


def _get_hf_client(request: Request) -> Any:
    """Extract or lazily initialise the HuggingFace client."""
    hf_client = getattr(request.app.state, "hf_client", None)
    if hf_client is not None:
        return hf_client

    settings = getattr(request.app.state, "settings", None)
    if settings is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application settings not available.",
        )

    from services.shared.ai.huggingface import HuggingFaceClient

    hf_client = HuggingFaceClient(api_token=settings.HF_API_TOKEN)
    request.app.state.hf_client = hf_client
    return hf_client


def _get_gemini_client(request: Request) -> Any:
    """Extract or lazily initialise the Gemini client."""
    gemini_client = getattr(request.app.state, "gemini_client", None)
    if gemini_client is not None:
        return gemini_client

    settings = getattr(request.app.state, "settings", None)
    if settings is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application settings not available.",
        )

    from services.shared.ai.gemini import GeminiClient

    gemini_client = GeminiClient(api_key=settings.GOOGLE_GEMINI_API_KEY)
    request.app.state.gemini_client = gemini_client
    return gemini_client


def _parse_corrections(text: str) -> tuple[str, list[dict[str, str]], bool]:
    """Parse correction annotations and Spanish fallback markers from AI text.

    Returns (clean_text, corrections, has_spanish_fallback).
    Correction format in text: [CORRECTION: original -> corrected | explanation]
    Spanish fallback format: [ES: spanish text]
    """
    import re

    corrections: list[dict[str, str]] = []
    has_spanish = False

    # Extract corrections
    correction_pattern = r"\[CORRECTION:\s*(.+?)\s*->\s*(.+?)\s*\|\s*(.+?)\s*\]"
    for match in re.finditer(correction_pattern, text):
        corrections.append({
            "original": match.group(1).strip(),
            "corrected": match.group(2).strip(),
            "explanation": match.group(3).strip(),
        })

    # Detect Spanish fallback
    if "[ES:" in text:
        has_spanish = True

    # Clean annotations from the display text but keep the content readable
    clean = re.sub(
        correction_pattern,
        lambda m: m.group(2).strip(),  # replace with corrected form
        text,
    )
    # Clean ES markers but keep the Spanish text
    clean = re.sub(r"\[ES:\s*(.+?)\s*\]", r"(\1)", clean)
    clean = clean.strip()

    return clean, corrections, has_spanish


# ---------------------------------------------------------------------------
# GET /scenarios -- List available scenarios
# ---------------------------------------------------------------------------


@router.get(
    "/scenarios",
    response_model=dict[str, ScenariosResponse],
)
async def list_scenarios(
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Return the list of predefined conversation scenarios."""
    return {
        "data": ScenariosResponse(scenarios=SCENARIOS),
    }


# ---------------------------------------------------------------------------
# POST /sessions -- Start a new conversation
# ---------------------------------------------------------------------------


@router.post(
    "/sessions",
    response_model=dict[str, StartSessionResponse],
    status_code=status.HTTP_201_CREATED,
)
async def start_session(
    request: Request,
    body: StartSessionRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Start a new conversation session.

    Creates the session record in the database and generates an AI tutor
    greeting using Mistral via the HuggingFace client.
    """
    supabase = _get_supabase(request)
    hf_client = _get_hf_client(request)

    # Generate a greeting from the AI tutor
    system_prompt = _GREETING_SYSTEM.format(
        scenario=body.scenario,
        cefr_level=body.cefr_level,
    )

    try:
        greeting = await hf_client.generate_text(
            prompt=f"Start the conversation for the scenario: {body.scenario}",
            system=system_prompt,
        )
        greeting = greeting.strip()
    except Exception:
        logger.exception("Failed to generate greeting via Mistral")
        # Provide a fallback greeting based on the scenario
        greeting = (
            f"Bonjour ! Bienvenue. Nous allons pratiquer : {body.scenario}. "
            f"Comment puis-je vous aider ?"
        )

    # Build initial messages list
    initial_messages = [
        {
            "role": "assistant",
            "content": greeting,
            "corrections": [],
            "has_spanish_fallback": False,
            "timestamp": datetime.now(UTC).isoformat(),
        }
    ]

    # Persist the session
    try:
        result = await (
            supabase.table("conversation_sessions")
            .insert({
                "user_id": user.id,
                "cefr_level": body.cefr_level,
                "scenario_title": body.scenario,
                "messages": initial_messages,
                "status": "active",
            })
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create conversation session.",
            )

        session = result.data[0]

        return {
            "data": StartSessionResponse(
                session_id=session["id"],
                scenario_title=session["scenario_title"],
                cefr_level=session["cefr_level"],
                greeting=greeting,
                messages=initial_messages,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create conversation session")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation session.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /sessions/{id}/messages -- Send message and get AI response
# ---------------------------------------------------------------------------


@router.post(
    "/sessions/{session_id}/messages",
    response_model=dict[str, MessageResponse],
)
async def send_message(
    request: Request,
    session_id: UUID,
    body: SendMessageRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Send a user message and receive an AI response.

    Uses Mistral for lightweight conversational turns. Includes inline
    corrections when grammar errors are detected. Provides Spanish
    fallback when the learner appears to be struggling.
    """
    supabase = _get_supabase(request)
    hf_client = _get_hf_client(request)

    # Fetch the session
    try:
        result = await (
            supabase.table("conversation_sessions")
            .select("*")
            .eq("id", str(session_id))
            .eq("user_id", user.id)
            .execute()
        )
    except Exception as exc:
        logger.exception("Failed to fetch conversation session")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch conversation session.",
        ) from exc

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation session {session_id} not found.",
        )

    session = result.data[0]

    if session["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This conversation session has already ended.",
        )

    # Build conversation history for the AI
    existing_messages: list[dict[str, Any]] = session.get("messages", [])

    # Add the user message
    now = datetime.now(UTC).isoformat()
    user_message = {
        "role": "user",
        "content": body.content,
        "corrections": [],
        "has_spanish_fallback": False,
        "timestamp": now,
    }
    existing_messages.append(user_message)

    # Prepare messages for the AI (just role + content)
    ai_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in existing_messages
    ]

    # Generate AI response using Mistral
    system_prompt = _CONVERSATION_SYSTEM.format(
        scenario=session["scenario_title"],
        cefr_level=session["cefr_level"],
    )

    try:
        # Build a prompt that includes the conversation history
        history_text = "\n".join(
            f"{m['role']}: {m['content']}" for m in ai_messages
        )
        prompt = (
            f"{history_text}\n\nassistant:"
        )

        raw_response = await hf_client.generate_text(
            prompt=prompt,
            system=system_prompt,
        )
        raw_response = raw_response.strip()
    except Exception:
        logger.exception("Mistral conversation response failed, trying Gemini fallback")
        # Fallback to Gemini
        try:
            gemini_client = _get_gemini_client(request)
            raw_response = await gemini_client.converse(
                messages=ai_messages,
                scenario=session["scenario_title"],
                cefr_level=session["cefr_level"],
            )
        except Exception:
            logger.exception("Gemini fallback also failed")
            raw_response = (
                "Excusez-moi, j'ai un petit probleme technique. "
                "Pouvez-vous repeter, s'il vous plait ?"
            )

    # Parse corrections and Spanish fallback from the response
    clean_content, corrections, has_spanish = _parse_corrections(raw_response)

    # Build the assistant message
    assistant_message = {
        "role": "assistant",
        "content": clean_content,
        "corrections": corrections,
        "has_spanish_fallback": has_spanish,
        "timestamp": datetime.now(UTC).isoformat(),
    }
    existing_messages.append(assistant_message)

    # Update session in database
    try:
        await (
            supabase.table("conversation_sessions")
            .update({"messages": existing_messages})
            .eq("id", str(session_id))
            .execute()
        )
    except Exception:
        logger.exception("Failed to update conversation messages")
        # Non-fatal: response still returned to user

    return {
        "data": MessageResponse(
            role="assistant",
            content=clean_content,
            corrections=corrections,
            has_spanish_fallback=has_spanish,
        )
    }


# ---------------------------------------------------------------------------
# POST /sessions/{id}/end -- End conversation and trigger evaluation
# ---------------------------------------------------------------------------


@router.post(
    "/sessions/{session_id}/end",
    response_model=dict[str, EndSessionResponse],
)
async def end_session(
    request: Request,
    session_id: UUID,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """End a conversation session and trigger evaluation via Gemini Flash.

    The evaluation analyses vocabulary usage, grammar accuracy, and
    communicative effectiveness, storing the results in the session record.
    """
    supabase = _get_supabase(request)
    gemini_client = _get_gemini_client(request)

    # Fetch the session
    try:
        result = await (
            supabase.table("conversation_sessions")
            .select("*")
            .eq("id", str(session_id))
            .eq("user_id", user.id)
            .execute()
        )
    except Exception as exc:
        logger.exception("Failed to fetch session for ending")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch conversation session.",
        ) from exc

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation session {session_id} not found.",
        )

    session = result.data[0]

    if session["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This conversation session has already ended.",
        )

    messages: list[dict[str, Any]] = session.get("messages", [])
    now = datetime.now(UTC)

    # Run evaluation via Gemini Flash
    evaluation_data: dict[str, Any] = {}
    vocab_score: float | None = None
    grammar_score: float | None = None
    comm_score: float | None = None

    # Only evaluate if there are user messages (at least 2 messages total)
    user_message_count = sum(1 for m in messages if m.get("role") == "user")
    if user_message_count >= 1:
        try:
            # Build a clean message list for evaluation
            eval_messages = [
                {"role": m["role"], "content": m["content"]}
                for m in messages
            ]
            evaluation = await gemini_client.evaluate_conversation(eval_messages)

            vocab_score = evaluation.vocabulary_score
            grammar_score = evaluation.grammar_score
            comm_score = evaluation.communicative_score

            evaluation_data = {
                "vocabulary_score": vocab_score,
                "grammar_score": grammar_score,
                "communicative_score": comm_score,
                "feedback_es": evaluation.feedback_es,
            }
        except Exception:
            logger.exception("Gemini conversation evaluation failed")
            evaluation_data = {
                "vocabulary_score": None,
                "grammar_score": None,
                "communicative_score": None,
                "feedback_es": (
                    "La evaluacion no esta disponible en este momento. "
                    "Por favor intenta de nuevo mas tarde."
                ),
            }

    # Update session as completed
    try:
        await (
            supabase.table("conversation_sessions")
            .update({
                "status": "completed",
                "completed_at": now.isoformat(),
                "evaluation_json": evaluation_data if evaluation_data else None,
                "vocabulary_score": vocab_score,
                "grammar_score": grammar_score,
                "communicative_score": comm_score,
            })
            .eq("id", str(session_id))
            .execute()
        )
    except Exception:
        logger.exception("Failed to update session as completed")

    return {
        "data": EndSessionResponse(
            session_id=str(session_id),
            status="completed",
            message_count=len(messages),
            evaluation_pending=not bool(evaluation_data),
        )
    }


# ---------------------------------------------------------------------------
# GET /sessions/{id}/evaluation -- Get evaluation results
# ---------------------------------------------------------------------------


@router.get(
    "/sessions/{session_id}/evaluation",
    response_model=dict[str, EvaluationResponse],
)
async def get_evaluation(
    request: Request,
    session_id: UUID,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Retrieve evaluation results for a completed conversation session."""
    supabase = _get_supabase(request)

    try:
        result = await (
            supabase.table("conversation_sessions")
            .select("*")
            .eq("id", str(session_id))
            .eq("user_id", user.id)
            .execute()
        )
    except Exception as exc:
        logger.exception("Failed to fetch evaluation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch evaluation.",
        ) from exc

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation session {session_id} not found.",
        )

    session = result.data[0]

    if session["status"] == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation is still active. End it first to get evaluation.",
        )

    evaluation = session.get("evaluation_json") or {}

    return {
        "data": EvaluationResponse(
            session_id=str(session_id),
            vocabulary_score=session.get("vocabulary_score"),
            grammar_score=session.get("grammar_score"),
            communicative_score=session.get("communicative_score"),
            feedback_es=evaluation.get(
                "feedback_es",
                "Evaluacion no disponible.",
            ),
            status=session["status"],
        )
    }
