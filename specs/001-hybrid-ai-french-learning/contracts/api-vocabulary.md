# API Contract: Vocabulary

**Base path**: `/api/v1/vocabulary`
**Auth**: Required (Supabase JWT)

## GET /api/v1/vocabulary/items

List vocabulary items filtered by CEFR level.

**Query params**:
- `cefr_level` (required): A1|A2|B1|B2|C1|C2
- `limit` (optional, default 50, max 200): Number of items
- `offset` (optional, default 0): Pagination offset
- `tags` (optional): Comma-separated tag filter

**Response 200**:
```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "french_text": "bonjour",
        "spanish_translation": "hola",
        "example_sentence_fr": "Bonjour, comment allez-vous?",
        "example_sentence_es": "Hola, como esta usted?",
        "audio_url": "/storage/v1/audio/bonjour.wav",
        "phonetic_ipa": "/bɔ̃.ʒuʁ/",
        "difficulty_score": 1,
        "cefr_level": "A1",
        "tags": ["greetings", "daily"]
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

## GET /api/v1/vocabulary/items/{id}/similar

Get semantically similar vocabulary items using embedding search.

**Path params**: `id` (UUID)
**Query params**: `limit` (optional, default 5, max 20)

**Response 200**:
```json
{
  "data": {
    "source_item_id": "uuid",
    "similar_items": [
      {
        "id": "uuid",
        "french_text": "salut",
        "similarity_score": 0.92
      }
    ]
  }
}
```

## GET /api/v1/vocabulary/review

Get vocabulary items due for SRS review.

**Query params**:
- `limit` (optional, default 20, max 50): Session size

**Response 200**:
```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "vocabulary_item": { "...full item..." },
        "fsrs_due_date": "2026-02-24T10:00:00Z",
        "review_count": 3,
        "correct_count": 2
      }
    ],
    "total_due": 45,
    "new_available": 10
  }
}
```

## POST /api/v1/vocabulary/review

Submit a review rating for a vocabulary item.

**Request body**:
```json
{
  "vocabulary_item_id": "uuid",
  "rating": 3
}
```

`rating`: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy) — FSRS scale

**Response 200**:
```json
{
  "data": {
    "vocabulary_item_id": "uuid",
    "next_review_date": "2026-02-26T10:00:00Z",
    "new_interval_days": 2.5,
    "stability": 3.1,
    "difficulty": 0.4,
    "xp_awarded": 10
  }
}
```

## POST /api/v1/vocabulary/classify

Classify vocabulary difficulty (triggers HF model).

**Request body**:
```json
{
  "text": "aujourd'hui",
  "cefr_level": "A1"
}
```

**Response 200**:
```json
{
  "data": {
    "text": "aujourd'hui",
    "difficulty_score": 2,
    "confidence": 0.89,
    "ai_platform": "huggingface",
    "latency_ms": 45
  }
}
```
