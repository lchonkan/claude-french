# Implementation Plan: Hybrid AI French Learning Platform

**Branch**: `001-hybrid-ai-french-learning` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-hybrid-ai-french-learning/spec.md`

## Summary

Build a cross-platform French learning application (web + mobile) for
Spanish-speaking learners, featuring CEFR-aligned curriculum, spaced
repetition vocabulary, grammar exercises, AI conversation, writing
evaluation, pronunciation analysis, listening comprehension, and Paris
cultural content. The system orchestrates between Hugging Face (low-latency
NLP tasks) and Google Gemini (complex reasoning and multimodal tasks),
with full AI usage analytics. Backend runs as containerized Python services
on Google Cloud Run, backed by Supabase for auth, database, and storage.

## Technical Context

**Language/Version**: Python 3.12 (backend services), TypeScript 5.x (frontend)
**Primary Dependencies**:
- Backend: FastAPI, Pydantic v2, supabase-py, huggingface-hub, google-genai,
  google-cloud-tasks
- Web: React 19, Vite, Tailwind CSS, react-intl, TanStack Query
- Mobile: React Native (Expo SDK 52), expo-av (audio recording)
- Shared: Zod (schema validation), shared TypeScript types package
**Storage**: Supabase-managed PostgreSQL 15 (EU region), Supabase Storage
  (audio files), pgvector extension (embedding similarity search)
**Testing**: pytest + pytest-cov (backend), Vitest (web), Jest (mobile)
**Target Platform**: Google Cloud Run (EU region), web browsers, iOS 16+,
  Android 13+
**Project Type**: Web application + mobile app + backend API services
**Performance Goals**: 100ms UI interactions, 200ms grammar check, 8s
  pronunciation pipeline, 10s writing evaluation, 1000 concurrent learners
**Constraints**: GDPR (EU), 99.5% uptime, PII anonymization before
  external AI calls, last-write-wins sync (30s interval)
**Scale/Scope**: 1000 concurrent users, 6 CEFR levels, 7 learning modules,
  ~2000 vocabulary items at launch (A1-A2 focus)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality | Single responsibility per module; linting (Ruff + ESLint) enforced in CI; type checking (mypy + tsc) with zero warnings; dependencies version-pinned via lock files | PASS |
| II. Testing Standards | pytest (backend) + Vitest/Jest (frontend); 80% coverage enforced in CI; AI service calls mocked in tests; test naming: `test_<unit>_<scenario>_<expected>` | PASS |
| III. UX Consistency | react-intl for Spanish i18n; shared component library across web/mobile; loading/empty/error states required per component; accessibility via semantic HTML + ARIA | PASS |
| IV. Performance | Client-side rendering for <100ms interactions; CDN for static assets; pgvector for embedding queries <100ms; Cloud Run auto-scaling for 1000 concurrent users | PASS |

All gates pass. No complexity violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-hybrid-ai-french-learning/
├── plan.md              # This file
├── research.md          # Phase 0: technology decisions
├── data-model.md        # Phase 1: database schema
├── quickstart.md        # Phase 1: local dev setup
├── contracts/           # Phase 1: API contracts
│   ├── api-vocabulary.md
│   ├── api-lessons.md
│   ├── api-grammar.md
│   ├── api-conversation.md
│   ├── api-writing.md
│   ├── api-pronunciation.md
│   ├── api-listening.md
│   ├── api-progress.md
│   ├── api-exams.md
│   ├── api-cultural.md
│   └── api-admin-analytics.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
services/
├── api/                          # FastAPI sync endpoints (Cloud Run)
│   ├── src/
│   │   ├── routes/               # Route handlers by domain
│   │   │   ├── vocabulary.py
│   │   │   ├── lessons.py
│   │   │   ├── grammar.py
│   │   │   ├── conversation.py
│   │   │   ├── writing.py
│   │   │   ├── pronunciation.py
│   │   │   ├── listening.py
│   │   │   ├── progress.py
│   │   │   ├── exams.py
│   │   │   ├── cultural.py
│   │   │   └── admin.py
│   │   ├── middleware/
│   │   │   ├── auth.py           # Supabase JWT validation
│   │   │   ├── anonymizer.py     # PII stripping before AI calls
│   │   │   └── rate_limiter.py
│   │   ├── main.py
│   │   └── config.py
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── conftest.py
│   ├── Dockerfile
│   └── pyproject.toml
│
├── worker/                       # Async AI job processor (Cloud Run)
│   ├── src/
│   │   ├── jobs/
│   │   │   ├── writing_eval.py
│   │   │   ├── lesson_gen.py
│   │   │   ├── cultural_gen.py
│   │   │   ├── difficulty_recal.py
│   │   │   └── pronunciation_eval.py
│   │   ├── main.py               # Cloud Tasks HTTP handler
│   │   └── config.py
│   ├── tests/
│   ├── Dockerfile
│   └── pyproject.toml
│
└── shared/                       # Shared Python package
    ├── ai/
    │   ├── router.py             # AI task routing (HF vs Gemini)
    │   ├── huggingface.py        # HF Inference Endpoints client
    │   ├── gemini.py             # Gemini API client
    │   ├── anonymizer.py         # PII anonymization utilities
    │   ├── schemas.py            # Structured output JSON schemas
    │   └── logger.py             # AI usage logging
    ├── models/                   # Pydantic models (shared types)
    │   ├── vocabulary.py
    │   ├── lesson.py
    │   ├── evaluation.py
    │   ├── pronunciation.py
    │   ├── mastery.py
    │   └── gamification.py
    ├── srs/
    │   └── fsrs.py               # FSRS spaced repetition algorithm
    ├── mastery/
    │   └── calculator.py         # Weighted mastery score computation
    └── pyproject.toml

web/                              # React web application
├── src/
│   ├── components/
│   │   ├── common/               # Shared UI components
│   │   ├── vocabulary/
│   │   ├── grammar/
│   │   ├── conversation/
│   │   ├── writing/
│   │   ├── pronunciation/
│   │   ├── listening/
│   │   ├── cultural/
│   │   ├── progress/
│   │   └── exams/
│   ├── pages/
│   ├── services/                 # API client layer
│   ├── hooks/
│   ├── i18n/
│   │   ├── es.json               # Spanish translations
│   │   └── glossary.json         # Canonical UI terms
│   ├── types/                    # Shared TypeScript types
│   └── App.tsx
├── tests/
├── vite.config.ts
├── package.json
└── tsconfig.json

mobile/                           # React Native (Expo) mobile app
├── src/
│   ├── components/
│   ├── screens/
│   ├── services/
│   ├── hooks/
│   ├── i18n/
│   └── navigation/
├── tests/
├── app.json
└── package.json

supabase/                         # Supabase configuration
├── migrations/                   # SQL migration files
├── seed/                         # Seed data (A1 vocabulary, etc.)
├── functions/                    # Edge functions (if needed)
└── config.toml

infra/                            # Infrastructure config
├── cloudbuild.yaml               # CI/CD pipeline
├── cloud-run/
│   ├── api.yaml
│   ├── worker.yaml
│   └── scheduler.yaml            # Cloud Scheduler cron jobs
└── terraform/                    # Optional IaC
```

**Structure Decision**: Multi-service monorepo with `services/` (Python
backend), `web/` (React + Tailwind), `mobile/` (React Native), and
`supabase/` (database migrations). The `services/shared/` package
contains AI orchestration, models, and algorithms shared between `api`
and `worker`. Cloud Scheduler triggers cron jobs (daily challenge
generation, streak resets, SRS batch scheduling) via HTTP to the API
service. Cloud Tasks dispatches async AI jobs to the worker service.
This structure enables independent container deployment while sharing
Python types and business logic.

## Complexity Tracking

No constitution violations. All services follow single responsibility.
The multi-service architecture is justified by the explicit requirement
for separate sync (api) and async (worker) processing containers.
