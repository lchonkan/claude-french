# API Contract: Pronunciation

**Base path**: `/api/v1/pronunciation`
**Auth**: Required (Supabase JWT)

## GET /api/v1/pronunciation/exercises

Get pronunciation exercises for the learner's level.

**Query params**:
- `cefr_level` (required): A1|A2|B1|B2|C1|C2
- `limit` (optional, default 10)

**Response 200**:
```json
{
  "data": {
    "exercises": [
      {
        "id": "uuid",
        "target_text": "Bonjour, je m'appelle Marie.",
        "phonetic_ipa": "/bɔ̃.ʒuʁ, ʒə ma.pɛl ma.ʁi/",
        "reference_audio_url": "/storage/v1/audio/ref/bonjour-marie.wav",
        "cefr_level": "A1",
        "focus_phonemes": ["ɔ̃", "ʒ", "ʁ"],
        "recommended_speed": 0.75
      }
    ]
  }
}
```

## POST /api/v1/pronunciation/upload

Upload an audio recording for pronunciation evaluation. Returns
a signed upload URL for direct client-to-storage upload.

**Request body**:
```json
{
  "exercise_id": "uuid",
  "file_name": "recording.wav",
  "content_type": "audio/wav"
}
```

**Response 200**:
```json
{
  "data": {
    "upload_url": "https://supabase.co/storage/v1/upload/signed/...",
    "storage_path": "recordings/user-uuid/2026-02-24/recording.wav",
    "expires_in_seconds": 300
  }
}
```

## POST /api/v1/pronunciation/evaluate

Start pronunciation evaluation (multimodal pipeline).
This triggers the async pipeline: HF Whisper (STT) → HF phoneme
alignment → Gemini multimodal evaluation.

**Request body**:
```json
{
  "exercise_id": "uuid",
  "audio_storage_path": "recordings/user-uuid/2026-02-24/recording.wav",
  "target_text": "Bonjour, je m'appelle Marie."
}
```

**Response 202** (accepted for processing):
```json
{
  "data": {
    "evaluation_id": "uuid",
    "status": "pending",
    "pipeline_steps": ["stt", "phoneme_alignment", "multimodal_evaluation"],
    "estimated_completion_seconds": 8
  }
}
```

## GET /api/v1/pronunciation/evaluations/{id}

Get pronunciation evaluation result (poll until completed).

**Response 200** (completed):
```json
{
  "data": {
    "evaluation_id": "uuid",
    "status": "completed",
    "target_text": "Bonjour, je m'appelle Marie.",
    "transcription": "Bonjour, je mapelle Marie.",
    "pipeline_results": {
      "stt": {
        "transcription": "Bonjour, je mapelle Marie.",
        "confidence": 0.91,
        "ai_platform": "huggingface",
        "latency_ms": 1200
      },
      "phoneme_alignment": {
        "phonemes": [
          { "target": "b", "actual": "b", "score": 1.0 },
          { "target": "ɔ̃", "actual": "ɔ̃", "score": 0.92 },
          { "target": "ʒ", "actual": "ʒ", "score": 0.88 },
          { "target": "u", "actual": "u", "score": 0.95 },
          { "target": "ʁ", "actual": "r", "score": 0.45, "issue": "uvular_r" }
        ],
        "phoneme_accuracy_score": 0.78,
        "ai_platform": "huggingface",
        "latency_ms": 800
      },
      "multimodal_evaluation": {
        "prosody_score": 0.72,
        "fluency_score": 0.80,
        "overall_score": 0.76,
        "improvement_suggestions_es": [
          "La 'r' francesa es uvular (producida en la garganta), no la 'r' espanola. Practica diciendo 'ʁ' como si hicieras gargaras suavemente.",
          "Buena entonacion general. Intenta separar mejor 'je m'appelle' (ye ma-pel)."
        ],
        "ai_platform": "gemini",
        "latency_ms": 2500
      }
    },
    "total_latency_ms": 4500,
    "xp_awarded": 15
  }
}
```

## GET /api/v1/pronunciation/history

List past pronunciation attempts.

**Query params**:
- `limit` (optional, default 10)
- `offset` (optional, default 0)

**Response 200**:
```json
{
  "data": {
    "attempts": [
      {
        "id": "uuid",
        "target_text": "Bonjour, je m'appelle Marie.",
        "overall_score": 0.76,
        "phoneme_accuracy_score": 0.78,
        "created_at": "2026-02-24T11:00:00Z"
      }
    ],
    "total": 12
  }
}
```
