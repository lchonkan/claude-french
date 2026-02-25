# API Contract: Lessons

**Base path**: `/api/v1/lessons`
**Auth**: Required (Supabase JWT)

## GET /api/v1/lessons

List lessons for a module and CEFR level.

**Query params**:
- `module` (required): vocabulary|grammar|writing|listening|pronunciation|conversation|cultural
- `cefr_level` (required): A1|A2|B1|B2|C1|C2
- `limit` (optional, default 20)
- `offset` (optional, default 0)

**Response 200**:
```json
{
  "data": {
    "lessons": [
      {
        "id": "uuid",
        "module": "grammar",
        "cefr_level": "A1",
        "title_es": "Presente de los verbos regulares -er",
        "title_fr": "Le present des verbes reguliers en -er",
        "description_es": "Aprende a conjugar verbos como parler, manger...",
        "order_index": 1,
        "exercise_count": 8
      }
    ],
    "total": 12
  }
}
```

## GET /api/v1/lessons/{id}

Get full lesson content with exercises.

**Path params**: `id` (UUID)

**Response 200**:
```json
{
  "data": {
    "id": "uuid",
    "module": "grammar",
    "cefr_level": "A1",
    "title_es": "Presente de los verbos regulares -er",
    "title_fr": "Le present des verbes reguliers en -er",
    "content": {
      "explanation_es": "En frances, los verbos regulares en -er...",
      "examples": [
        { "fr": "Je parle", "es": "Yo hablo" }
      ]
    },
    "exercises": [
      {
        "id": "uuid",
        "exercise_type": "fill_blank",
        "prompt_es": "Completa con la forma correcta del verbo 'parler'",
        "content": {
          "sentence": "Je ___ francais.",
          "correct_answer": "parle",
          "options": ["parle", "parles", "parlent", "parlez"]
        },
        "difficulty_tier": 1,
        "order_index": 1
      }
    ]
  }
}
```

## POST /api/v1/lessons/{id}/exercises/{exercise_id}/submit

Submit an exercise answer.

**Request body**:
```json
{
  "answer": "parle"
}
```

**Response 200**:
```json
{
  "data": {
    "correct": true,
    "correct_answer": "parle",
    "feedback_es": "Correcto! 'Je parle' es la primera persona singular.",
    "xp_awarded": 10,
    "mastery_update": {
      "skill": "grammar",
      "new_mastery_percentage": 65.2
    }
  }
}
```

**Response 200 (incorrect)**:
```json
{
  "data": {
    "correct": false,
    "user_answer": "parles",
    "correct_answer": "parle",
    "feedback_es": "Casi! 'parles' es la segunda persona (tu parles). Para 'je', usa 'parle' sin la 's'.",
    "error_type": "verb_conjugation",
    "error_category": "person_agreement",
    "xp_awarded": 0,
    "mastery_update": {
      "skill": "grammar",
      "new_mastery_percentage": 63.1
    }
  }
}
```
