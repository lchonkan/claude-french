# API Contract: Exams

**Base path**: `/api/v1/exams`
**Auth**: Required (Supabase JWT)

## POST /api/v1/exams/placement/start

Start the placement test.

**Response 201**:
```json
{
  "data": {
    "exam_id": "uuid",
    "exam_type": "placement",
    "first_question": {
      "id": "uuid",
      "cefr_level": "A2",
      "question_type": "multiple_choice",
      "skill": "vocabulary",
      "prompt_es": "Que significa 'maison' en espanol?",
      "options": [
        { "id": "a", "text": "carro" },
        { "id": "b", "text": "casa" },
        { "id": "c", "text": "mesa" },
        { "id": "d", "text": "libro" }
      ]
    },
    "total_questions_estimate": "15-25 (adaptive)"
  }
}
```

## POST /api/v1/exams/{id}/answer

Submit an answer and get the next adaptive question.

**Request body**:
```json
{
  "question_id": "uuid",
  "answer": "b"
}
```

**Response 200** (next question):
```json
{
  "data": {
    "correct": true,
    "questions_answered": 5,
    "current_difficulty": "B1",
    "next_question": {
      "id": "uuid",
      "cefr_level": "B1",
      "question_type": "fill_blank",
      "skill": "grammar",
      "prompt_es": "Completa la frase con la forma correcta:",
      "content": {
        "sentence": "Si j'___ le temps, je voyagerais.",
        "options": ["ai", "avais", "aurai", "aurais"]
      }
    },
    "is_last": false
  }
}
```

**Response 200** (exam complete):
```json
{
  "data": {
    "correct": true,
    "questions_answered": 20,
    "is_last": true,
    "next_question": null,
    "exam_complete": true,
    "result": {
      "assigned_level": "A2",
      "confidence": 0.85,
      "skill_breakdown": {
        "vocabulary": { "level": "A2", "score": 0.78 },
        "grammar": { "level": "A2", "score": 0.65 },
        "reading": { "level": "B1", "score": 0.70 }
      },
      "recommendation_es": "Tu nivel general es A2. Tu comprension lectora es ligeramente superior. Te recomendamos comenzar en A2 y enfocarte en gramatica."
    }
  }
}
```

## POST /api/v1/exams/exit/start

Start a CEFR exit exam for the current level.

**Request body**:
```json
{
  "cefr_level": "A1"
}
```

**Response 201**:
```json
{
  "data": {
    "exam_id": "uuid",
    "exam_type": "exit",
    "cefr_level": "A1",
    "sections": ["vocabulary", "grammar", "reading", "listening", "writing"],
    "total_questions": 30,
    "time_limit_minutes": 45,
    "first_question": { "..." }
  }
}
```

## GET /api/v1/exams/{id}/result

Get exam result after completion.

**Response 200**:
```json
{
  "data": {
    "exam_id": "uuid",
    "exam_type": "exit",
    "cefr_level": "A1",
    "score": 85.0,
    "passed": true,
    "passing_threshold": 70.0,
    "skill_breakdown": {
      "vocabulary": 90.0,
      "grammar": 80.0,
      "reading": 85.0,
      "listening": 82.0,
      "writing": 88.0
    },
    "weak_areas_es": ["Verbos irregulares en presente"],
    "level_unlocked": "A2",
    "badge_earned": {
      "badge_type": "cefr_completion",
      "cefr_level": "A1"
    },
    "xp_awarded": 100
  }
}
```

## GET /api/v1/exams/history

List past exam attempts.

**Query params**:
- `exam_type` (optional): placement|exit
- `limit` (optional, default 10)

**Response 200**:
```json
{
  "data": {
    "exams": [
      {
        "id": "uuid",
        "exam_type": "placement",
        "cefr_level": "A2",
        "score": 72.0,
        "passed": null,
        "completed_at": "2026-02-20T14:00:00Z"
      }
    ]
  }
}
```
