# API Contract: Conversation

**Base path**: `/api/v1/conversation`
**Auth**: Required (Supabase JWT)

## POST /api/v1/conversation/sessions

Start a new conversation session.

**Request body**:
```json
{
  "cefr_level": "A1",
  "scenario": "ordering_at_cafe"
}
```

**Response 201**:
```json
{
  "data": {
    "session_id": "uuid",
    "scenario_title": "Pedir en un cafe parisino",
    "opening_message": {
      "role": "assistant",
      "content": "Bonjour! Bienvenue au Cafe de Flore. Qu'est-ce que vous desirez?",
      "translation_es": "Hola! Bienvenido al Cafe de Flore. Que desea?"
    }
  }
}
```

## POST /api/v1/conversation/sessions/{id}/messages

Send a message in the conversation.

**Path params**: `id` (UUID session ID)

**Request body**:
```json
{
  "content": "Je voudrais un cafe, s'il vous plait."
}
```

**Response 200**:
```json
{
  "data": {
    "user_message": {
      "role": "user",
      "content": "Je voudrais un cafe, s'il vous plait."
    },
    "assistant_message": {
      "role": "assistant",
      "content": "Tres bien! Un cafe. Vous le voulez avec du sucre?",
      "corrections": [],
      "translation_es": "Muy bien! Un cafe. Lo quiere con azucar?"
    },
    "ai_platforms_used": ["huggingface", "gemini"]
  }
}
```

**Response 200 (with correction)**:
```json
{
  "data": {
    "user_message": {
      "role": "user",
      "content": "Je veux un croissant aussi."
    },
    "assistant_message": {
      "role": "assistant",
      "content": "Bien sur, un croissant! *Petite note: 'Je voudrais' est plus poli que 'je veux' dans un cafe.* Autre chose?",
      "corrections": [
        {
          "original": "Je veux",
          "suggestion": "Je voudrais",
          "explanation_es": "'Je voudrais' (me gustaria) es mas cortez que 'je veux' (quiero) en un restaurante o cafe."
        }
      ]
    }
  }
}
```

## POST /api/v1/conversation/sessions/{id}/end

End the conversation and request evaluation.

**Response 200**:
```json
{
  "data": {
    "session_id": "uuid",
    "status": "completed",
    "message_count": 8,
    "evaluation_status": "pending",
    "evaluation_id": "uuid"
  }
}
```

## GET /api/v1/conversation/sessions/{id}/evaluation

Get the post-conversation evaluation (async, may be pending).

**Response 200**:
```json
{
  "data": {
    "session_id": "uuid",
    "status": "completed",
    "evaluation": {
      "vocabulary_score": 0.75,
      "grammar_score": 0.82,
      "communicative_score": 0.90,
      "overall_cefr": "A1",
      "strengths_es": [
        "Buena cortesia (uso de 's'il vous plait')",
        "Vocabulario apropiado para el contexto del cafe"
      ],
      "improvements_es": [
        "Practica la diferencia entre 'je veux' y 'je voudrais'",
        "Intenta usar mas adjetivos para describir lo que deseas"
      ]
    },
    "xp_awarded": 25,
    "ai_platform": "gemini"
  }
}
```
