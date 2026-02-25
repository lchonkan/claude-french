# API Contract: Grammar

**Base path**: `/api/v1/grammar`
**Auth**: Required (Supabase JWT)

## POST /api/v1/grammar/check

Quick grammar check on a French text (routed to HF camembert).

**Request body**:
```json
{
  "text": "Je suis alle au magasin hier.",
  "cefr_level": "A2"
}
```

**Response 200**:
```json
{
  "data": {
    "original_text": "Je suis alle au magasin hier.",
    "corrections": [
      {
        "start": 8,
        "end": 12,
        "original": "alle",
        "suggestion": "alle(e)",
        "error_type": "gender_agreement",
        "explanation_es": "El participio pasado debe concordar con el sujeto cuando se usa con 'etre'. Si eres mujer, escribe 'allee'.",
        "confidence": 0.94
      }
    ],
    "corrected_text": "Je suis alle(e) au magasin hier.",
    "ai_platform": "huggingface",
    "latency_ms": 85
  }
}
```

## POST /api/v1/grammar/complexity

Score sentence complexity using embeddings (routed to HF).

**Request body**:
```json
{
  "text": "Bien que je sois fatigue, je continue a travailler.",
  "cefr_level": "B1"
}
```

**Response 200**:
```json
{
  "data": {
    "text": "Bien que je sois fatigue, je continue a travailler.",
    "complexity_score": 0.72,
    "estimated_cefr": "B2",
    "features": {
      "sentence_length": 10,
      "subordinate_clauses": 1,
      "subjunctive_usage": true,
      "vocabulary_difficulty_avg": 2.3
    },
    "ai_platform": "huggingface",
    "latency_ms": 32
  }
}
```
