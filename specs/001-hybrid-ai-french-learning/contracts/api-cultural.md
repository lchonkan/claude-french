# API Contract: Cultural Notes

**Base path**: `/api/v1/cultural`
**Auth**: Required (Supabase JWT)

## GET /api/v1/cultural/notes

List cultural notes for the learner's level.

**Query params**:
- `cefr_level` (required): A1|A2|B1|B2|C1|C2
- `category` (optional): history|neighborhoods|etiquette|cuisine|daily_life
- `limit` (optional, default 10)
- `offset` (optional, default 0)

**Response 200**:
```json
{
  "data": {
    "notes": [
      {
        "id": "uuid",
        "cefr_level": "A1",
        "title_es": "Los cafes de Paris: una tradicion cultural",
        "title_fr": "Les cafes de Paris: une tradition culturelle",
        "category": "cuisine",
        "preview_es": "Descubre por que los cafes son el corazon de la vida social parisina...",
        "vocabulary_count": 8,
        "reviewed": true
      }
    ],
    "total": 15
  }
}
```

## GET /api/v1/cultural/notes/{id}

Get full cultural note content.

**Response 200**:
```json
{
  "data": {
    "id": "uuid",
    "cefr_level": "A1",
    "title_es": "Los cafes de Paris: una tradicion cultural",
    "title_fr": "Les cafes de Paris: une tradition culturelle",
    "content_fr": "Les cafes de Paris sont tres importants...",
    "content_es": "Los cafes de Paris son muy importantes...",
    "vocabulary": [
      {
        "id": "uuid",
        "french_text": "un cafe creme",
        "spanish_translation": "un cafe con leche",
        "in_user_review_queue": false
      }
    ],
    "cultural_comparison_es": "En Espana, los cafes tambien son lugares sociales, pero en Paris es comun sentarse por horas con un solo cafe. No hay prisa!",
    "category": "cuisine"
  }
}
```

## POST /api/v1/cultural/notes/{id}/vocabulary/{vocab_id}/add

Add a vocabulary item from a cultural note to the learner's SRS queue.

**Response 201**:
```json
{
  "data": {
    "vocabulary_item_id": "uuid",
    "added_to_review": true,
    "first_review_date": "2026-02-24T12:00:00Z"
  }
}
```

## POST /api/v1/cultural/generate

Request generation of a new cultural note (async, admin or triggered
by curriculum progression).

**Request body**:
```json
{
  "cefr_level": "A1",
  "category": "neighborhoods",
  "topic_hint": "Le Marais",
  "align_with_vocabulary": ["uuid1", "uuid2"]
}
```

**Response 202**:
```json
{
  "data": {
    "generation_id": "uuid",
    "status": "pending",
    "ai_platform": "gemini",
    "estimated_completion_seconds": 15
  }
}
```
