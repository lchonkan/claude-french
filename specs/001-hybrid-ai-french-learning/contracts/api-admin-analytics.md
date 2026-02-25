# API Contract: Admin Analytics

**Base path**: `/api/v1/admin/analytics`
**Auth**: Required (Supabase JWT with admin role)

## GET /api/v1/admin/analytics/ai/overview

Get AI platform usage overview.

**Query params**:
- `start_date` (required): ISO date
- `end_date` (required): ISO date

**Response 200**:
```json
{
  "data": {
    "period": {
      "start": "2026-02-01",
      "end": "2026-02-24"
    },
    "total_requests": 15420,
    "by_platform": {
      "huggingface": {
        "total_requests": 10250,
        "success_rate": 0.987,
        "avg_latency_ms": 125,
        "total_estimated_cost_usd": 12.50,
        "fallback_count": 3
      },
      "gemini": {
        "total_requests": 5170,
        "success_rate": 0.995,
        "avg_latency_ms": 1850,
        "total_estimated_cost_usd": 28.30,
        "fallback_count": 0
      }
    },
    "cost_per_user_per_day_usd": 0.032
  }
}
```

## GET /api/v1/admin/analytics/ai/by-task

Get latency and cost breakdown by task type.

**Query params**:
- `start_date` (required): ISO date
- `end_date` (required): ISO date

**Response 200**:
```json
{
  "data": {
    "tasks": [
      {
        "task_type": "grammar_check",
        "platform": "huggingface",
        "request_count": 4200,
        "avg_latency_ms": 85,
        "p95_latency_ms": 142,
        "p99_latency_ms": 210,
        "avg_cost_usd": 0.0001,
        "total_cost_usd": 0.42,
        "success_rate": 0.992,
        "fallback_count": 2
      },
      {
        "task_type": "writing_eval",
        "platform": "gemini",
        "request_count": 820,
        "avg_latency_ms": 3200,
        "p95_latency_ms": 5400,
        "p99_latency_ms": 8100,
        "avg_cost_usd": 0.015,
        "total_cost_usd": 12.30,
        "success_rate": 0.998,
        "fallback_count": 0
      }
    ]
  }
}
```

## GET /api/v1/admin/analytics/ai/trends

Get daily trend data for AI platform metrics.

**Query params**:
- `start_date` (required): ISO date
- `end_date` (required): ISO date
- `metric` (required): latency|cost|requests|errors
- `platform` (optional): huggingface|gemini

**Response 200**:
```json
{
  "data": {
    "metric": "latency",
    "platform": "huggingface",
    "data_points": [
      { "date": "2026-02-01", "value": 118.5 },
      { "date": "2026-02-02", "value": 122.3 },
      { "date": "2026-02-03", "value": 115.8 }
    ]
  }
}
```

## GET /api/v1/admin/analytics/users

Get user engagement analytics.

**Query params**:
- `start_date` (required): ISO date
- `end_date` (required): ISO date

**Response 200**:
```json
{
  "data": {
    "total_users": 850,
    "active_users": 620,
    "new_users": 45,
    "avg_daily_active": 380,
    "avg_session_minutes": 18.5,
    "streak_distribution": {
      "0_days": 230,
      "1_7_days": 320,
      "8_30_days": 220,
      "30_plus_days": 80
    },
    "cefr_distribution": {
      "A1": 420,
      "A2": 280,
      "B1": 110,
      "B2": 35,
      "C1": 5,
      "C2": 0
    }
  }
}
```

## GET /api/v1/admin/analytics/content

Get content accuracy and review status.

**Response 200**:
```json
{
  "data": {
    "vocabulary_items": { "total": 2000, "reviewed": 1800, "pending_review": 200 },
    "cultural_notes": { "total": 45, "reviewed": 30, "pending_review": 15, "ai_generated": 40 },
    "lessons": { "total": 72, "active": 68, "draft": 4 }
  }
}
```
