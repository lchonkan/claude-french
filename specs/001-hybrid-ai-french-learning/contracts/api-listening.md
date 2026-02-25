# API Contract: Listening

**Base path**: `/api/v1/listening`
**Auth**: Required (Supabase JWT)

## GET /api/v1/listening/exercises

Get listening comprehension exercises.

**Query params**:
- `cefr_level` (required): A1|A2|B1|B2|C1|C2
- `category` (optional): metro|cafe|museum|general
- `limit` (optional, default 10)

**Response 200**:
```json
{
  "data": {
    "exercises": [
      {
        "id": "uuid",
        "cefr_level": "A1",
        "title_es": "Conversacion en un cafe parisino",
        "audio_url": "/storage/v1/audio/listening/cafe-a1-01.wav",
        "duration_seconds": 45,
        "recommended_speed": 0.75,
        "category": "cafe",
        "question_count": 3
      }
    ]
  }
}
```

## GET /api/v1/listening/exercises/{id}

Get full exercise with questions.

**Response 200**:
```json
{
  "data": {
    "id": "uuid",
    "audio_url": "/storage/v1/audio/listening/cafe-a1-01.wav",
    "recommended_speed": 0.75,
    "transcript_fr": "Client: Bonjour! Un cafe creme, s'il vous plait...",
    "transcript_available": false,
    "questions": [
      {
        "id": "uuid",
        "question_es": "Que pide el cliente?",
        "question_type": "multiple_choice",
        "options": [
          { "id": "a", "text_es": "Un te" },
          { "id": "b", "text_es": "Un cafe con leche" },
          { "id": "c", "text_es": "Un jugo de naranja" }
        ]
      }
    ]
  }
}
```

Note: `transcript_available` starts as false. Learner can request
it after first listen attempt via the transcript endpoint.

## POST /api/v1/listening/exercises/{id}/submit

Submit answers to listening comprehension questions.

**Request body**:
```json
{
  "answers": [
    { "question_id": "uuid", "answer": "b" }
  ]
}
```

**Response 200**:
```json
{
  "data": {
    "results": [
      {
        "question_id": "uuid",
        "correct": true,
        "correct_answer": "b",
        "explanation_es": "El cliente dice 'un cafe creme' que es un cafe con leche.",
        "audio_segment": { "start_seconds": 3.2, "end_seconds": 6.8 }
      }
    ],
    "score": 1.0,
    "xp_awarded": 15
  }
}
```

## POST /api/v1/listening/exercises/{id}/transcript

Request the exercise transcript (unlocked after first attempt).

**Response 200**:
```json
{
  "data": {
    "transcript_fr": "Client: Bonjour! Un cafe creme, s'il vous plait.\nServeur: Bien sur! Avec du sucre?\nClient: Non, merci. C'est combien?\nServeur: Trois euros cinquante.",
    "vocabulary_highlights": [
      {
        "word_fr": "cafe creme",
        "translation_es": "cafe con leche",
        "vocabulary_item_id": "uuid"
      }
    ]
  }
}
```
