# API Contract: Writing

**Base path**: `/api/v1/writing`
**Auth**: Required (Supabase JWT)

## GET /api/v1/writing/prompts

Get writing prompts for the learner's current CEFR level.

**Query params**:
- `cefr_level` (required): A1|A2|B1|B2|C1|C2
- `limit` (optional, default 5)

**Response 200**:
```json
{
  "data": {
    "prompts": [
      {
        "id": "uuid",
        "cefr_level": "A1",
        "prompt_es": "Describe tu rutina diaria en 5 oraciones.",
        "prompt_fr": "Decrivez votre routine quotidienne en 5 phrases.",
        "expected_length": "3-5 sentences",
        "focus_areas": ["present_tense", "daily_vocabulary", "time_expressions"]
      }
    ]
  }
}
```

## POST /api/v1/writing/submit

Submit a writing sample for evaluation. Returns immediately with
a pending status; full evaluation is processed asynchronously by
the worker service.

**Request body**:
```json
{
  "prompt_id": "uuid",
  "prompt_text": "Describe tu rutina diaria en 5 oraciones.",
  "submitted_text": "Je me leve a sept heures. Je prend le petit-dejeuner. Je vais a l'ecole. Je mange a midi. Je dors a dix heures.",
  "cefr_level": "A1"
}
```

**Response 202** (accepted for processing):
```json
{
  "data": {
    "evaluation_id": "uuid",
    "status": "pending",
    "quick_grammar_check": {
      "corrections": [
        {
          "original": "Je prend",
          "suggestion": "Je prends",
          "error_type": "verb_conjugation",
          "explanation_es": "El verbo 'prendre' en primera persona es 'prends' con 's'."
        }
      ],
      "ai_platform": "huggingface",
      "latency_ms": 78
    },
    "estimated_completion_seconds": 8
  }
}
```

## GET /api/v1/writing/evaluations/{id}

Get full writing evaluation (poll until status is completed).

**Response 200** (completed):
```json
{
  "data": {
    "evaluation_id": "uuid",
    "status": "completed",
    "submitted_text": "Je me leve a sept heures...",
    "evaluation": {
      "grammar_score": 0.70,
      "vocabulary_score": 0.65,
      "coherence_score": 0.80,
      "task_completion_score": 0.90,
      "overall_cefr_score": "A1",
      "feedback_es": "Buen trabajo para nivel A1! Tu texto describe una rutina completa. Puntos a mejorar:",
      "detailed_feedback_es": [
        {
          "criterion": "Gramatica",
          "score": 0.70,
          "comment": "Errores menores de conjugacion ('prend' → 'prends'). Buen uso del presente simple.",
          "examples": [
            {
              "original": "Je prend le petit-dejeuner",
              "corrected": "Je prends le petit-dejeuner",
              "rule_es": "Los verbos del tercer grupo como 'prendre' llevan 's' en la primera persona."
            }
          ]
        },
        {
          "criterion": "Vocabulario",
          "score": 0.65,
          "comment": "Vocabulario basico apropiado. Intenta variar: en lugar de repetir 'Je...', usa conectores como 'ensuite', 'puis', 'apres'.",
          "suggestions_fr": ["ensuite", "puis", "apres"]
        },
        {
          "criterion": "Coherencia",
          "score": 0.80,
          "comment": "Buena estructura cronologica. Las ideas siguen un orden logico."
        },
        {
          "criterion": "Completitud",
          "score": 0.90,
          "comment": "Cumple con las 5 oraciones solicitadas y describe una rutina completa."
        }
      ],
      "sentence_complexity": {
        "average_score": 0.25,
        "estimated_cefr": "A1",
        "ai_platform": "huggingface"
      }
    },
    "ai_platform": "gemini",
    "xp_awarded": 20
  }
}
```

**Response 200** (still processing):
```json
{
  "data": {
    "evaluation_id": "uuid",
    "status": "processing",
    "estimated_completion_seconds": 5
  }
}
```

## GET /api/v1/writing/evaluations

List the learner's past writing evaluations.

**Query params**:
- `cefr_level` (optional): Filter by level
- `limit` (optional, default 10)
- `offset` (optional, default 0)

**Response 200**:
```json
{
  "data": {
    "evaluations": [
      {
        "id": "uuid",
        "cefr_level": "A1",
        "prompt_text": "Describe tu rutina diaria...",
        "overall_cefr_score": "A1",
        "grammar_score": 0.70,
        "created_at": "2026-02-24T10:30:00Z"
      }
    ],
    "total": 5
  }
}
```
