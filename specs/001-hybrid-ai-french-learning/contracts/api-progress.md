# API Contract: Progress & Gamification

**Base path**: `/api/v1/progress`
**Auth**: Required (Supabase JWT)

## GET /api/v1/progress/dashboard

Get the learner's full progress dashboard.

**Response 200**:
```json
{
  "data": {
    "user": {
      "display_name": "Leo",
      "current_cefr_level": "A1",
      "xp_total": 1250,
      "current_streak": 7,
      "longest_streak": 14
    },
    "cefr_progress": {
      "current_level": "A1",
      "overall_mastery": 62.5,
      "skills": [
        { "skill": "vocabulary", "mastery_percentage": 75.2 },
        { "skill": "grammar", "mastery_percentage": 63.1 },
        { "skill": "writing", "mastery_percentage": 45.0 },
        { "skill": "listening", "mastery_percentage": 58.3 },
        { "skill": "pronunciation", "mastery_percentage": 52.7 },
        { "skill": "conversation", "mastery_percentage": 80.5 }
      ],
      "unlock_threshold": 80.0,
      "exam_required": true,
      "exam_available": false
    },
    "badges": [
      {
        "badge_type": "streak_7",
        "cefr_level": null,
        "earned_at": "2026-02-20T18:00:00Z"
      }
    ],
    "daily_challenge": {
      "id": "uuid",
      "challenge_type": "grammar",
      "description_es": "Completa 5 ejercicios de conjugacion de verbos irregulares",
      "completed": false,
      "xp_reward": 50
    },
    "recent_activity": [
      {
        "activity_type": "vocab_review",
        "xp_earned": 30,
        "timestamp": "2026-02-24T09:15:00Z"
      }
    ]
  }
}
```

## GET /api/v1/progress/mastery

Get detailed mastery breakdown per skill per CEFR level.

**Query params**:
- `cefr_level` (optional, defaults to current level)

**Response 200**:
```json
{
  "data": {
    "cefr_level": "A1",
    "skills": [
      {
        "skill": "vocabulary",
        "mastery_percentage": 75.2,
        "total_exercises": 120,
        "total_correct": 96,
        "time_spent_minutes": 180,
        "recent_trend": "improving",
        "last_20_results": [
          { "score": 1.0, "timestamp": "2026-02-24T09:00:00Z" },
          { "score": 0.8, "timestamp": "2026-02-23T10:00:00Z" }
        ]
      }
    ]
  }
}
```

## GET /api/v1/progress/skill-tree

Get the visual skill tree data.

**Response 200**:
```json
{
  "data": {
    "levels": [
      {
        "cefr_level": "A1",
        "status": "in_progress",
        "overall_mastery": 62.5,
        "skills": [
          { "skill": "vocabulary", "status": "mastered", "mastery": 85.0 },
          { "skill": "grammar", "status": "in_progress", "mastery": 63.1 },
          { "skill": "writing", "status": "in_progress", "mastery": 45.0 },
          { "skill": "listening", "status": "in_progress", "mastery": 58.3 },
          { "skill": "pronunciation", "status": "in_progress", "mastery": 52.7 },
          { "skill": "conversation", "status": "mastered", "mastery": 80.5 }
        ],
        "exam_status": "locked"
      },
      {
        "cefr_level": "A2",
        "status": "locked",
        "overall_mastery": 0,
        "skills": [],
        "exam_status": "locked"
      }
    ]
  }
}
```

## GET /api/v1/progress/streak

Get streak details.

**Response 200**:
```json
{
  "data": {
    "current_streak": 7,
    "longest_streak": 14,
    "last_activity_date": "2026-02-24",
    "streak_history": [
      { "date": "2026-02-24", "active": true, "xp_earned": 85 },
      { "date": "2026-02-23", "active": true, "xp_earned": 120 },
      { "date": "2026-02-22", "active": true, "xp_earned": 65 }
    ]
  }
}
```

## POST /api/v1/progress/daily-challenge/{id}/complete

Mark a daily challenge as completed.

**Response 200**:
```json
{
  "data": {
    "challenge_id": "uuid",
    "completed": true,
    "xp_awarded": 50,
    "new_xp_total": 1300
  }
}
```

## GET /api/v1/progress/xp/history

Get XP transaction history.

**Query params**:
- `limit` (optional, default 20)
- `offset` (optional, default 0)
- `start_date` (optional): ISO date filter
- `end_date` (optional): ISO date filter

**Response 200**:
```json
{
  "data": {
    "transactions": [
      {
        "activity_type": "vocab_review",
        "xp_amount": 30,
        "metadata": { "cards_reviewed": 10, "accuracy": 0.8 },
        "created_at": "2026-02-24T09:15:00Z"
      }
    ],
    "total": 150,
    "period_xp": 450
  }
}
```
