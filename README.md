# French Learning Platform

A cross-platform French learning application for Spanish-speaking learners, featuring CEFR-aligned curriculum, spaced repetition vocabulary, grammar exercises, AI conversation practice, writing evaluation, pronunciation analysis, listening comprehension, and Paris cultural content.

## Architecture

```
services/
  api/          FastAPI sync endpoints (port 8000)
  worker/       Async AI job processor (port 8001)
  shared/       Shared Python package (AI orchestration, models, algorithms)
web/            React 19 + Vite + Tailwind CSS
mobile/         React Native (Expo SDK 52)
supabase/       Database migrations and seed data
infra/          Cloud Run, Cloud Build, Cloud Scheduler configs
```

**Backend**: Python 3.12, FastAPI, Pydantic v2, Supabase (PostgreSQL 15 + Auth + Storage + pgvector)

**AI Pipeline**: Hugging Face (Whisper, CamemBERT, Mistral-7B, Wav2Vec2, MiniLM embeddings) + Google Gemini (Flash + Pro)

**Frontend**: React 19, TypeScript 5.x, Vite, Tailwind CSS, TanStack Query, react-intl (Spanish UI)

**Mobile**: React Native, Expo SDK 52, expo-av (audio recording)

## Features

| Module | Description |
|--------|-------------|
| Vocabulary | FSRS v5 spaced repetition, flashcards, cognate detection, semantic search |
| Grammar | CamemBERT + Mistral dual-model error detection, 4 exercise types, adaptive difficulty |
| Conversation | AI text chat with inline corrections, Spanish fallback, post-session evaluation |
| Writing | Async Gemini Pro CEFR evaluation, accent toolbar, criterion-level scoring |
| Pronunciation | 3-stage pipeline (Whisper STT, Wav2Vec2 phonemes, Gemini prosody), phoneme map |
| Listening | Paris-contextualized audio, segment replay, bilingual transcript sync |
| Cultural Notes | Paris cultural articles, AI content generation, vocabulary linking to SRS |
| Exams | Adaptive placement test, CEFR exit exams, mastery-gated level progression |
| Gamification | XP system, daily streaks, CEFR badges, skill tree, daily challenges |
| Analytics | Admin dashboard with AI platform comparison, cost tracking, usage trends |

## Prerequisites

- **Python** 3.12+
- **Node.js** 20+
- **Docker Desktop** (for local Supabase)
- **Supabase CLI** (`brew install supabase/tap/supabase`)

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/lchonkan/claude-french.git
cd claude-french

# Python — create a shared venv for all backend services
cd services
python3 -m venv .venv
source .venv/bin/activate
pip install -e "./shared[dev]" -e "./api[dev]" -e "./worker[dev]"
cd ..

# Web frontend
cd web && npm install && cd ..

# Mobile (optional)
cd mobile && npm install && cd ..
```

### 2. Start Supabase

Make sure Docker Desktop is running, then:

```bash
supabase start
```

Note the **Publishable** and **Secret** keys from the output — you'll need them for the `.env` files.

### 3. Configure environment variables

```bash
cp services/api/.env.example services/api/.env
cp services/worker/.env.example services/worker/.env
cp web/.env.example web/.env
cp mobile/.env.example mobile/.env
```

Update each `.env` file with your keys:

**services/api/.env** and **services/worker/.env**:
```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<publishable key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<secret key from supabase start>
HF_API_TOKEN=<your Hugging Face API token>
GOOGLE_GEMINI_API_KEY=<your Gemini API key>
```

**web/.env**:
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<publishable key from supabase start>
VITE_API_URL=http://localhost:8000
```

For local development without real AI services, you can use `dummy-for-local` as the HF and Gemini keys — the app will run but AI-powered features will return errors.

### 4. Apply database migrations and seed data

```bash
# Apply all 15 migrations
supabase db push --local

# Seed initial data
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  -f supabase/seed/a1_vocabulary.sql \
  -f supabase/seed/a1_grammar.sql \
  -f supabase/seed/exam_questions.sql \
  -f supabase/seed/a1_listening.sql \
  -f supabase/seed/a1_cultural.sql
```

### 5. Run the application

```bash
# Terminal 1 — API server
cd services
source .venv/bin/activate
PYTHONPATH=/path/to/claude-french uvicorn services.api.src.main:app --reload --port 8000

# Terminal 2 — Web app
cd web
npm run dev

# Terminal 3 — Worker (optional, for async AI jobs)
cd services
source .venv/bin/activate
PYTHONPATH=/path/to/claude-french python -m services.worker.src.main --local
```

Replace `/path/to/claude-french` with the absolute path to the repo root.

The app is now available at:

| Service | URL |
|---------|-----|
| Web app | http://localhost:5173 |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Supabase Studio | http://127.0.0.1:54323 |

### 6. Create a test user

Open Supabase Studio at http://127.0.0.1:54323, go to **Authentication** > **Users**, and create a new user with email and password. You can then sign in through the app.

## Running tests

```bash
# Backend
cd services
source .venv/bin/activate
PYTHONPATH=.. pytest api/ --cov=api/src --cov-report=term-missing
PYTHONPATH=.. pytest shared/ --cov-report=term-missing

# Web
cd web
npm test

# Mobile
cd mobile
npm test
```

## Project structure

```
services/
  api/src/
    main.py                 App entry point, router registration
    config.py               Pydantic settings (env-based)
    middleware/              Auth (Supabase JWT), rate limiter
    routes/                  11 route modules (vocabulary, grammar, exams, etc.)
  worker/src/
    main.py                 Cloud Tasks HTTP handler + local polling
    jobs/                   Async AI jobs (writing eval, pronunciation, etc.)
  shared/
    ai/                     AI orchestration (router, HF client, Gemini client, anonymizer, logger)
    models/                 Pydantic models (vocabulary, lesson, evaluation, mastery, etc.)
    srs/fsrs.py             FSRS v5 spaced repetition algorithm
    mastery/calculator.py   Weighted mastery score computation

web/src/
  components/               40+ React components organized by module
  pages/                    13 page components (lazy-loaded)
  services/                 API client layer (one file per module)
  hooks/                    useAudioRecorder, useSync
  i18n/                     Spanish translations (140+ keys)
  types/                    Shared TypeScript types

mobile/src/
  screens/                  10 screens matching web pages
  navigation/               Tab + stack navigators
  hooks/                    Audio recording (expo-av)

supabase/
  migrations/               15 SQL migrations (enums, tables, RLS, storage)
  seed/                     A1 vocabulary, grammar, exams, listening, cultural data

infra/
  cloudbuild.yaml           CI/CD pipeline (lint, test, build, deploy)
  cloud-run/                Service configs (api, worker, scheduler)
```

## Database

15 migrations covering: user profiles, vocabulary items (with pgvector embeddings), lessons and exercises, skill mastery, AI usage logs, vocabulary progress, exam attempts, error patterns, conversation sessions, writing evaluations, pronunciation scores, audio storage bucket, cultural notes, and gamification (badges, XP, daily challenges). All tables include Row Level Security (RLS) policies.

## Deployment

The app is designed for Google Cloud Run (EU region). See `infra/` for:

- `cloudbuild.yaml` — CI/CD pipeline (Ruff, mypy, pytest, tsc, Vitest, Docker build)
- `cloud-run/api.yaml` — API service config (2 vCPU, 1 GiB, 1-10 instances)
- `cloud-run/worker.yaml` — Worker service config (2 vCPU, 2 GiB, 0-5 instances, concurrency=1)
- `cloud-run/scheduler.yaml` — 4 cron jobs (daily challenges, streak reset, SRS batch, AI digest)

## License

All rights reserved.
