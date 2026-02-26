# ruff: noqa: B008
"""Writing evaluation API routes for the French Learning Platform.

Endpoints:
- GET  /prompts                -- Return writing prompts by CEFR level
- POST /submit                 -- Submit writing for evaluation
- GET  /evaluations/{id}       -- Poll evaluation status
- GET  /evaluations            -- User's evaluation history with pagination

All endpoints require authentication. Writing evaluation is performed
asynchronously by a Cloud Tasks worker using Gemini Pro.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from services.api.src.middleware.auth import UserInfo, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Predefined writing prompts by CEFR level
# ---------------------------------------------------------------------------

WRITING_PROMPTS: dict[str, list[dict[str, str]]] = {
    "A1": [
        {
            "id": "a1-01",
            "title": "Presentate",
            "prompt_fr": "Ecrivez un court texte pour vous presenter. Dites votre nom, votre age, ou vous habitez et ce que vous aimez.",
            "prompt_es": "Escribe un texto corto para presentarte. Di tu nombre, tu edad, donde vives y que te gusta.",
            "min_words": 30,
            "max_words": 80,
        },
        {
            "id": "a1-02",
            "title": "Ma famille",
            "prompt_fr": "Decrivez votre famille. Combien de personnes ? Comment s'appellent-ils ? Que font-ils ?",
            "prompt_es": "Describe a tu familia. Cuantas personas son? Como se llaman? Que hacen?",
            "min_words": 30,
            "max_words": 80,
        },
        {
            "id": "a1-03",
            "title": "Ma journee",
            "prompt_fr": "Decrivez une journee typique. A quelle heure vous vous levez ? Que faites-vous le matin, l'apres-midi et le soir ?",
            "prompt_es": "Describe un dia tipico. A que hora te levantas? Que haces por la manana, la tarde y la noche?",
            "min_words": 40,
            "max_words": 100,
        },
        {
            "id": "a1-04",
            "title": "Mon logement",
            "prompt_fr": "Decrivez votre maison ou votre appartement. Combien de pieces y a-t-il ? Quelle est votre piece preferee ?",
            "prompt_es": "Describe tu casa o apartamento. Cuantas habitaciones tiene? Cual es tu habitacion favorita?",
            "min_words": 30,
            "max_words": 80,
        },
        {
            "id": "a1-05",
            "title": "Mes loisirs",
            "prompt_fr": "Quels sont vos loisirs ? Que faites-vous pendant votre temps libre ? Avec qui ?",
            "prompt_es": "Cuales son tus pasatiempos? Que haces en tu tiempo libre? Con quien?",
            "min_words": 30,
            "max_words": 80,
        },
    ],
    "A2": [
        {
            "id": "a2-01",
            "title": "Un week-end ideal",
            "prompt_fr": "Racontez votre week-end ideal. Ou allez-vous ? Que faites-vous ? Avec qui passez-vous ce week-end ?",
            "prompt_es": "Cuenta tu fin de semana ideal. Adonde vas? Que haces? Con quien pasas ese fin de semana?",
            "min_words": 50,
            "max_words": 120,
        },
        {
            "id": "a2-02",
            "title": "Une lettre a un ami",
            "prompt_fr": "Ecrivez une lettre a un ami francais. Invitez-le a visiter votre ville. Dites-lui ce que vous pouvez faire ensemble.",
            "prompt_es": "Escribe una carta a un amigo frances. Invitalo a visitar tu ciudad. Dile que pueden hacer juntos.",
            "min_words": 60,
            "max_words": 150,
        },
        {
            "id": "a2-03",
            "title": "Mon repas prefere",
            "prompt_fr": "Decrivez votre repas prefere. Quels ingredients faut-il ? Comment le prepare-t-on ? Pourquoi l'aimez-vous ?",
            "prompt_es": "Describe tu comida favorita. Que ingredientes necesita? Como se prepara? Por que te gusta?",
            "min_words": 50,
            "max_words": 120,
        },
        {
            "id": "a2-04",
            "title": "Un souvenir de vacances",
            "prompt_fr": "Racontez un souvenir de vacances. Ou etiez-vous ? Avec qui ? Qu'avez-vous fait ? Pourquoi ce souvenir est special ?",
            "prompt_es": "Cuenta un recuerdo de vacaciones. Donde estabas? Con quien? Que hiciste? Por que ese recuerdo es especial?",
            "min_words": 60,
            "max_words": 150,
        },
        {
            "id": "a2-05",
            "title": "Votre ville",
            "prompt_fr": "Decrivez votre ville ou votre quartier. Qu'est-ce qu'il y a ? Qu'est-ce que vous aimez et n'aimez pas ?",
            "prompt_es": "Describe tu ciudad o tu barrio. Que hay? Que te gusta y que no te gusta?",
            "min_words": 50,
            "max_words": 120,
        },
        {
            "id": "a2-06",
            "title": "Au magasin",
            "prompt_fr": "Vous voulez acheter un cadeau pour un ami. Ecrivez un dialogue entre vous et le vendeur.",
            "prompt_es": "Quieres comprar un regalo para un amigo. Escribe un dialogo entre tu y el vendedor.",
            "min_words": 50,
            "max_words": 120,
        },
    ],
    "B1": [
        {
            "id": "b1-01",
            "title": "L'importance des langues",
            "prompt_fr": "Pourquoi est-il important d'apprendre des langues etrangeres ? Donnez votre opinion avec des exemples concrets.",
            "prompt_es": "Por que es importante aprender idiomas extranjeros? Da tu opinion con ejemplos concretos.",
            "min_words": 80,
            "max_words": 200,
        },
        {
            "id": "b1-02",
            "title": "La technologie et la vie quotidienne",
            "prompt_fr": "Comment la technologie a-t-elle change notre vie quotidienne ? Quels sont les avantages et les inconvenients ?",
            "prompt_es": "Como ha cambiado la tecnologia nuestra vida cotidiana? Cuales son las ventajas y desventajas?",
            "min_words": 80,
            "max_words": 200,
        },
        {
            "id": "b1-03",
            "title": "Un evenement marquant",
            "prompt_fr": "Racontez un evenement qui vous a marque. Que s'est-il passe ? Comment avez-vous reagi ? Qu'avez-vous appris ?",
            "prompt_es": "Cuenta un evento que te marco. Que paso? Como reaccionaste? Que aprendiste?",
            "min_words": 80,
            "max_words": 200,
        },
        {
            "id": "b1-04",
            "title": "Vivre a l'etranger",
            "prompt_fr": "Aimeriez-vous vivre a l'etranger ? Quels seraient les avantages et les difficultes ? Quel pays choisiriez-vous ?",
            "prompt_es": "Te gustaria vivir en el extranjero? Cuales serian las ventajas y dificultades? Que pais elegirias?",
            "min_words": 80,
            "max_words": 200,
        },
        {
            "id": "b1-05",
            "title": "Le sport et la sante",
            "prompt_fr": "Quel role joue le sport dans votre vie ? Comment peut-on rester en bonne sante au quotidien ?",
            "prompt_es": "Que papel juega el deporte en tu vida? Como se puede mantener buena salud en la vida diaria?",
            "min_words": 80,
            "max_words": 200,
        },
    ],
    "B2": [
        {
            "id": "b2-01",
            "title": "Les reseaux sociaux",
            "prompt_fr": "Les reseaux sociaux ont-ils plus d'effets positifs ou negatifs sur la societe ? Argumentez votre point de vue.",
            "prompt_es": "Las redes sociales tienen mas efectos positivos o negativos en la sociedad? Argumenta tu punto de vista.",
            "min_words": 120,
            "max_words": 300,
        },
        {
            "id": "b2-02",
            "title": "L'environnement et notre responsabilite",
            "prompt_fr": "Quelle est la responsabilite de chaque individu face aux problemes environnementaux ? Proposez des solutions concretes.",
            "prompt_es": "Cual es la responsabilidad de cada individuo frente a los problemas ambientales? Propone soluciones concretas.",
            "min_words": 120,
            "max_words": 300,
        },
        {
            "id": "b2-03",
            "title": "L'education du futur",
            "prompt_fr": "Comment imaginez-vous l'education dans 20 ans ? Quels changements seraient souhaitables ? Quels dangers faut-il eviter ?",
            "prompt_es": "Como imaginas la educacion en 20 anos? Que cambios serian deseables? Que peligros hay que evitar?",
            "min_words": 120,
            "max_words": 300,
        },
        {
            "id": "b2-04",
            "title": "Le teletravail",
            "prompt_fr": "Le teletravail est-il l'avenir du travail ? Analysez les pour et les contre en vous appuyant sur des exemples.",
            "prompt_es": "El teletrabajo es el futuro del trabajo? Analiza los pros y contras apoyandote en ejemplos.",
            "min_words": 120,
            "max_words": 300,
        },
        {
            "id": "b2-05",
            "title": "Art et culture",
            "prompt_fr": "L'art est-il un luxe ou une necessite ? Quel est le role de l'art et de la culture dans notre societe ?",
            "prompt_es": "El arte es un lujo o una necesidad? Cual es el papel del arte y la cultura en nuestra sociedad?",
            "min_words": 120,
            "max_words": 300,
        },
    ],
    "C1": [
        {
            "id": "c1-01",
            "title": "L'intelligence artificielle et l'emploi",
            "prompt_fr": "L'intelligence artificielle va-t-elle transformer radicalement le marche de l'emploi ? Analysez les enjeux economiques, sociaux et ethiques.",
            "prompt_es": "La inteligencia artificial va a transformar radicalmente el mercado laboral? Analiza los desafios economicos, sociales y eticos.",
            "min_words": 180,
            "max_words": 400,
        },
        {
            "id": "c1-02",
            "title": "La democratie a l'ere numerique",
            "prompt_fr": "Comment le numerique transforme-t-il la democratie ? Analysez l'impact des nouvelles technologies sur la participation citoyenne.",
            "prompt_es": "Como transforma lo digital la democracia? Analiza el impacto de las nuevas tecnologias en la participacion ciudadana.",
            "min_words": 180,
            "max_words": 400,
        },
        {
            "id": "c1-03",
            "title": "Identite et mondialisation",
            "prompt_fr": "La mondialisation menace-t-elle les identites culturelles ou les enrichit-elle ? Developez une reflexion nuancee.",
            "prompt_es": "La globalizacion amenaza las identidades culturales o las enriquece? Desarrolla una reflexion matizada.",
            "min_words": 180,
            "max_words": 400,
        },
    ],
    "C2": [
        {
            "id": "c2-01",
            "title": "Progres et humanite",
            "prompt_fr": "Le progres technologique est-il synonyme de progres humain ? Menez une reflexion approfondie en mobilisant des exemples historiques et contemporains.",
            "prompt_es": "El progreso tecnologico es sinonimo de progreso humano? Lleva a cabo una reflexion profunda movilizando ejemplos historicos y contemporaneos.",
            "min_words": 250,
            "max_words": 500,
        },
        {
            "id": "c2-02",
            "title": "Langue et pouvoir",
            "prompt_fr": "En quoi la maitrise de la langue est-elle un instrument de pouvoir ? Analysez les rapports entre langue, pensee et domination.",
            "prompt_es": "En que medida el dominio del idioma es un instrumento de poder? Analiza las relaciones entre lengua, pensamiento y dominacion.",
            "min_words": 250,
            "max_words": 500,
        },
    ],
}

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class WritingPrompt(BaseModel):
    """A single writing prompt."""

    id: str
    title: str
    prompt_fr: str
    prompt_es: str
    min_words: int
    max_words: int


class PromptsResponse(BaseModel):
    """Response containing writing prompts for a given CEFR level."""

    cefr_level: str
    prompts: list[WritingPrompt]


class SubmitWritingRequest(BaseModel):
    """Request body to submit writing for evaluation."""

    prompt_id: str = Field(
        ...,
        min_length=1,
        max_length=20,
        description="ID of the writing prompt being responded to.",
    )
    prompt_text: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The prompt text (French).",
    )
    submitted_text: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="The learner's submitted French text.",
    )
    cefr_level: str = Field(
        ...,
        pattern=r"^(A1|A2|B1|B2|C1|C2)$",
        description="Learner's current CEFR level.",
    )
    lesson_id: str | None = Field(
        default=None,
        description="Optional linked lesson UUID.",
    )


class SubmitWritingResponse(BaseModel):
    """Response after submitting writing for evaluation."""

    evaluation_id: str
    status: str
    message: str


class EvaluationStatusResponse(BaseModel):
    """Response for polling evaluation status or returning completed results."""

    id: str
    status: str
    cefr_level: str
    prompt_text: str
    submitted_text: str
    grammar_score: float | None = None
    vocabulary_score: float | None = None
    coherence_score: float | None = None
    task_completion_score: float | None = None
    overall_cefr_score: str | None = None
    feedback_es: str | None = None
    evaluation_json: dict | None = None
    ai_platform: str | None = None
    created_at: str
    completed_at: str | None = None


class EvaluationHistoryResponse(BaseModel):
    """Paginated evaluation history for a user."""

    evaluations: list[EvaluationStatusResponse]
    total: int
    page: int
    page_size: int


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


def _find_prompt(prompt_id: str) -> dict[str, str] | None:
    """Look up a prompt by ID across all CEFR levels."""
    for prompts in WRITING_PROMPTS.values():
        for prompt in prompts:
            if prompt["id"] == prompt_id:
                return prompt
    return None


async def _dispatch_to_worker(
    request: Request,
    evaluation_id: str,
    user_id: str,
) -> None:
    """Dispatch the writing evaluation job to the Cloud Tasks worker.

    In development mode, creates an async_jobs row for the local polling worker.
    In production, enqueues a Cloud Tasks HTTP request.
    """
    settings = getattr(request.app.state, "settings", None)

    if settings and settings.GOOGLE_CLOUD_PROJECT and not settings.is_development:
        # Production: enqueue via Cloud Tasks
        try:
            from google.cloud import tasks_v2

            client = tasks_v2.CloudTasksClient()
            parent = client.queue_path(
                settings.GOOGLE_CLOUD_PROJECT,
                settings.CLOUD_TASKS_LOCATION,
                settings.CLOUD_TASKS_QUEUE,
            )

            task = tasks_v2.Task(
                http_request=tasks_v2.HttpRequest(
                    http_method=tasks_v2.HttpMethod.POST,
                    url=f"{settings.WORKER_SERVICE_URL}/jobs/writing_eval",
                    headers={"Content-Type": "application/json"},
                    body=json.dumps({
                        "payload": {"evaluation_id": evaluation_id},
                        "user_id": user_id,
                    }).encode(),
                )
            )
            client.create_task(
                tasks_v2.CreateTaskRequest(parent=parent, task=task)
            )
            logger.info(
                "Dispatched writing_eval job via Cloud Tasks for evaluation=%s",
                evaluation_id,
            )
        except Exception:
            logger.exception(
                "Failed to dispatch Cloud Tasks job for evaluation=%s, "
                "falling back to async_jobs table.",
                evaluation_id,
            )
            await _create_async_job(request, evaluation_id, user_id)
    else:
        # Development: insert into async_jobs table for local polling worker
        await _create_async_job(request, evaluation_id, user_id)


async def _create_async_job(
    request: Request,
    evaluation_id: str,
    user_id: str,
) -> None:
    """Insert a row into the async_jobs table for the local polling worker."""
    supabase_admin = getattr(request.app.state, "supabase_admin", None)
    if supabase_admin is None:
        logger.error("supabase_admin not available for async_jobs insertion.")
        return

    try:
        await (
            supabase_admin.table("async_jobs")
            .insert({
                "job_type": "writing_eval",
                "status": "pending",
                "payload": json.dumps({"evaluation_id": evaluation_id}),
                "user_id": user_id,
            })
            .execute()
        )
        logger.info(
            "Created async_jobs row for writing_eval evaluation=%s",
            evaluation_id,
        )
    except Exception:
        logger.exception(
            "Failed to create async_jobs row for evaluation=%s",
            evaluation_id,
        )


# ---------------------------------------------------------------------------
# GET /prompts -- Return writing prompts by CEFR level
# ---------------------------------------------------------------------------


@router.get(
    "/prompts",
    response_model=dict[str, PromptsResponse],
)
async def get_writing_prompts(
    cefr_level: str = Query(
        default="A1",
        pattern=r"^(A1|A2|B1|B2|C1|C2)$",
        description="CEFR level to filter prompts.",
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Return predefined writing prompts for the given CEFR level."""
    prompts_raw = WRITING_PROMPTS.get(cefr_level, [])
    prompts = [
        WritingPrompt(
            id=p["id"],
            title=p["title"],
            prompt_fr=p["prompt_fr"],
            prompt_es=p["prompt_es"],
            min_words=int(p["min_words"]),
            max_words=int(p["max_words"]),
        )
        for p in prompts_raw
    ]

    return {
        "data": PromptsResponse(cefr_level=cefr_level, prompts=prompts),
    }


# ---------------------------------------------------------------------------
# POST /submit -- Submit writing for evaluation
# ---------------------------------------------------------------------------


@router.post(
    "/submit",
    response_model=dict[str, SubmitWritingResponse],
    status_code=status.HTTP_201_CREATED,
)
async def submit_writing(
    request: Request,
    body: SubmitWritingRequest,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Submit a writing sample for CEFR-aligned evaluation.

    Creates a pending evaluation record and dispatches an async job
    to the worker for AI-powered evaluation via Gemini Pro.
    """
    supabase = _get_supabase(request)

    # Build the insert payload
    insert_data: dict[str, Any] = {
        "user_id": user.id,
        "cefr_level": body.cefr_level,
        "prompt_text": body.prompt_text,
        "submitted_text": body.submitted_text,
        "status": "pending",
    }
    if body.lesson_id:
        insert_data["lesson_id"] = body.lesson_id

    try:
        result = await (
            supabase.table("writing_evaluations")
            .insert(insert_data)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create writing evaluation.",
            )

        evaluation = result.data[0]
        evaluation_id = evaluation["id"]

        # Dispatch to worker asynchronously
        await _dispatch_to_worker(request, evaluation_id, user.id)

        return {
            "data": SubmitWritingResponse(
                evaluation_id=evaluation_id,
                status="pending",
                message="Tu escritura ha sido enviada para evaluacion. Consulta el estado en unos momentos.",
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to submit writing for evaluation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit writing for evaluation.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /evaluations/{id} -- Poll evaluation status
# ---------------------------------------------------------------------------


@router.get(
    "/evaluations/{evaluation_id}",
    response_model=dict[str, EvaluationStatusResponse],
)
async def get_evaluation_status(
    request: Request,
    evaluation_id: UUID,
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Poll the status of a writing evaluation.

    Returns evaluation details including scores when status is 'completed'.
    """
    supabase = _get_supabase(request)

    try:
        result = await (
            supabase.table("writing_evaluations")
            .select("*")
            .eq("id", str(evaluation_id))
            .eq("user_id", user.id)
            .execute()
        )
    except Exception as exc:
        logger.exception("Failed to fetch writing evaluation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch evaluation.",
        ) from exc

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Writing evaluation {evaluation_id} not found.",
        )

    row = result.data[0]

    return {
        "data": EvaluationStatusResponse(
            id=row["id"],
            status=row["status"],
            cefr_level=row["cefr_level"],
            prompt_text=row["prompt_text"],
            submitted_text=row["submitted_text"],
            grammar_score=row.get("grammar_score"),
            vocabulary_score=row.get("vocabulary_score"),
            coherence_score=row.get("coherence_score"),
            task_completion_score=row.get("task_completion_score"),
            overall_cefr_score=row.get("overall_cefr_score"),
            feedback_es=row.get("feedback_es"),
            evaluation_json=row.get("evaluation_json"),
            ai_platform=row.get("ai_platform"),
            created_at=row["created_at"],
            completed_at=row.get("completed_at"),
        )
    }


# ---------------------------------------------------------------------------
# GET /evaluations -- User's evaluation history with pagination
# ---------------------------------------------------------------------------


@router.get(
    "/evaluations",
    response_model=dict[str, EvaluationHistoryResponse],
)
async def get_evaluation_history(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number."),
    page_size: int = Query(default=10, ge=1, le=50, description="Results per page."),
    cefr_level: str | None = Query(
        default=None,
        pattern=r"^(A1|A2|B1|B2|C1|C2)$",
        description="Optional CEFR level filter.",
    ),
    user: UserInfo = Depends(get_current_user),
) -> dict[str, Any]:
    """Return the authenticated user's writing evaluation history.

    Results are ordered by creation date (newest first) and paginated.
    """
    supabase = _get_supabase(request)

    offset = (page - 1) * page_size

    try:
        # Build the base query
        query = (
            supabase.table("writing_evaluations")
            .select("*", count="exact")
            .eq("user_id", user.id)
            .order("created_at", desc=True)
        )

        if cefr_level:
            query = query.eq("cefr_level", cefr_level)

        query = query.range(offset, offset + page_size - 1)

        result = await query.execute()

        rows = result.data or []
        total = result.count if result.count is not None else len(rows)

        evaluations = [
            EvaluationStatusResponse(
                id=row["id"],
                status=row["status"],
                cefr_level=row["cefr_level"],
                prompt_text=row["prompt_text"],
                submitted_text=row["submitted_text"],
                grammar_score=row.get("grammar_score"),
                vocabulary_score=row.get("vocabulary_score"),
                coherence_score=row.get("coherence_score"),
                task_completion_score=row.get("task_completion_score"),
                overall_cefr_score=row.get("overall_cefr_score"),
                feedback_es=row.get("feedback_es"),
                evaluation_json=row.get("evaluation_json"),
                ai_platform=row.get("ai_platform"),
                created_at=row["created_at"],
                completed_at=row.get("completed_at"),
            )
            for row in rows
        ]

        return {
            "data": EvaluationHistoryResponse(
                evaluations=evaluations,
                total=total,
                page=page,
                page_size=page_size,
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch evaluation history")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch evaluation history.",
        ) from exc
