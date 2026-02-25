# Research: Hybrid AI French Learning Platform

**Date**: 2026-02-24
**Feature**: `001-hybrid-ai-french-learning`
**Purpose**: Resolve all technical decisions and document rationale

## 1. Backend Framework

**Decision**: Python 3.12 with FastAPI

**Rationale**: FastAPI provides async-native HTTP handling critical for
AI orchestration latency. Pydantic v2 (built into FastAPI) enables
schema validation for structured AI outputs. Python's ML ecosystem
gives first-class access to Hugging Face transformers, sentence-
transformers, and the google-genai SDK without wrapper overhead.

**Alternatives considered**:
- Node.js/Express: Weaker ML library ecosystem; would require
  subprocess calls or HTTP bridges to Python ML models.
- Go: No native ML library support; would need gRPC bridges
  to Python services, adding latency and operational complexity.
- Django: Heavier framework than needed; async support less mature
  than FastAPI for high-concurrency AI proxy workloads.

## 2. Frontend Web

**Decision**: React 19 with TypeScript 5.x, Tailwind CSS, bundled via Vite

**Rationale**: Spec explicitly requested React. TypeScript enforces
type safety aligned with Constitution Principle I (Code Quality).
Tailwind CSS provides utility-first styling with consistent design
tokens, enabling rapid UI development with uniform visual language
across all learning modules. Vite provides fast HMR and optimized
production builds. React 19 concurrent features enable smooth UI
updates during AI response streaming.

**Alternatives considered**:
- Next.js: SSR adds complexity unnecessary for this SPA-like
  learning app where content is user-specific and API-driven.
- Vue 3: Not requested in spec. Would prevent code sharing with
  React Native mobile app.
- Svelte: Smaller ecosystem for component libraries needed
  (audio players, charts, progress visualizations).
- CSS Modules / styled-components: Less consistent than Tailwind
  for enforcing a uniform design system across 10+ learning modules.

## 3. Frontend Mobile

**Decision**: React Native with Expo SDK 52

**Rationale**: Maximum code sharing with React web (shared hooks,
API service layer, TypeScript types, i18n strings). Expo simplifies
native build pipeline, OTA updates, and audio recording via expo-av.
Eliminates need for separate iOS and Android codebases.

**Alternatives considered**:
- Flutter: No code sharing with React web; Dart ecosystem less
  mature for i18n (react-intl vs intl package).
- Native iOS + Android: 2x development effort, 2x maintenance.
  Not justified for this content-driven UI.
- PWA-only: Insufficient audio recording API support on iOS Safari;
  no push notifications for streak reminders.

## 4. Database & Backend Services

**Decision**: Supabase (managed PostgreSQL 15 + Auth + Storage)

**Rationale**: Supabase provides PostgreSQL (with pgvector for
embedding similarity search), built-in auth (email/password + Google
+ Apple social login), and S3-compatible storage for audio files.
Single managed platform reduces operational overhead. Row Level
Security (RLS) provides database-level access control. EU region
available for GDPR compliance.

**Alternatives considered**:
- Raw PostgreSQL on Cloud SQL: More operational overhead for auth,
  storage, and realtime features that Supabase provides out of box.
- Firebase: Firestore's document model poorly suits relational
  learning data (mastery scores, SRS scheduling, skill relationships).
- PlanetScale: MySQL-based; lacks pgvector for embedding search.

## 5. Async Job Processing

**Decision**: Google Cloud Tasks + Cloud Run worker service

**Rationale**: Cloud Tasks provides HTTP-targeted job dispatch to the
worker Cloud Run service with built-in retry logic, rate limiting,
and dead-letter handling. Each async AI job (writing evaluation,
lesson generation, pronunciation pipeline) is dispatched as an HTTP
POST to the worker's job endpoint. Cloud Tasks guarantees at-least-once
delivery and supports configurable retry backoff. The worker processes
jobs sequentially (concurrency=1) to manage GPU-bound workloads.

For multi-step pipelines (e.g., pronunciation: STT → phoneme → eval),
the worker chains tasks by dispatching follow-up Cloud Tasks from
within each step, maintaining the sequential pipeline while keeping
each step independently retriable.

**Alternatives considered**:
- Pub/Sub: More flexible for fan-out patterns, but Cloud Tasks'
  HTTP-targeting model is simpler for Cloud Run integration and
  provides built-in rate limiting per queue.
- Celery + Redis: Requires managed Redis instance; Celery workers
  less suited to Cloud Run's request-based scaling model.
- Bull/BullMQ: Node.js only; would require separate Node service.

## 5b. Scheduled Jobs

**Decision**: Google Cloud Scheduler

**Rationale**: Cloud Scheduler triggers recurring cron jobs by sending
HTTP requests to the API service. No additional infrastructure needed.
Integrates natively with Cloud Run.

### Scheduled Jobs

| Job | Schedule | Target | Description |
|-----|----------|--------|-------------|
| Daily challenge generation | `0 3 * * *` (03:00 UTC) | `POST /api/v1/internal/cron/daily-challenges` | Generate adaptive challenges for all active users |
| Streak reset check | `0 4 * * *` (04:00 UTC) | `POST /api/v1/internal/cron/streak-reset` | Reset streaks for users with no activity yesterday |
| SRS batch scheduling | `0 5 * * *` (05:00 UTC) | `POST /api/v1/internal/cron/srs-batch` | Pre-compute next-day review queues for active users |
| AI usage digest | `0 6 * * 1` (Monday 06:00 UTC) | `POST /api/v1/internal/cron/ai-digest` | Aggregate weekly AI usage metrics for admin dashboard |

**Alternatives considered**:
- In-process cron (APScheduler): Tied to a single container instance;
  doesn't work reliably with Cloud Run auto-scaling.
- Supabase pg_cron: Limited to SQL operations; can't trigger
  application logic or AI pipelines.

## 6. AI Platform: Hugging Face Models

**Decision**: Hugging Face Inference Endpoints (managed, auto-scaling)

### Model Selection

| Task | Model | Justification |
|------|-------|---------------|
| Speech-to-text | openai/whisper-large-v3-turbo | Best multilingual accuracy for French; turbo variant reduces latency by ~40% vs large-v3 |
| Phoneme alignment | facebook/wav2vec2-lv-60-espeak-cv-ft | Pre-trained for phoneme recognition with IPA output; supports French phonemes; frame-level alignment enables per-phoneme accuracy scoring |
| Grammar tagging (token-level) | almanach/camembert-base | French-specific BERT; pre-trained on French web corpus; excellent for token classification — identifies error locations, POS tags, and grammatical roles at the token level |
| Grammar correction (generative) | mistralai/Mistral-7B-Instruct-v0.3 | Generates natural-language grammar explanations, corrected sentences, and contextual suggestions; complements CamemBERT's token-level detection with generative correction |
| Embeddings | sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 | 384-dim multilingual embeddings; fast inference (~5ms per sentence); supports French+Spanish+Portuguese |
| Conversational scaffolding | mistralai/Mistral-7B-Instruct-v0.3 | Lightweight conversational turns before Gemini handles complex reasoning; 7B fits single GPU with low latency |
| Sentence complexity | Same embedding model + custom classifier | Complexity scored from embedding features; no separate model needed |
| Vocabulary classification | Same camembert-base + classification head | Fine-tuned for CEFR difficulty classification |

### Grammar Pipeline: CamemBERT + Mistral (Dual Model)

The grammar checking pipeline uses both models in sequence:

1. **CamemBERT** (token classification): Scans the input text and
   identifies error tokens — positions, error types (agreement,
   conjugation, preposition), and grammatical roles. Fast (~50ms),
   deterministic, high precision for French-specific patterns.

2. **Mistral 7B** (generation): Takes CamemBERT's error annotations
   and generates human-readable corrections with Spanish explanations,
   corrected sentence variants, and grammar rule references. Provides
   the "why" behind each error.

This split keeps the fast path (error detection) on a lightweight
model while using the generative model only when errors are found,
reducing average latency and cost for correct inputs.

### Deployment Strategy

- **Inference Endpoints** (managed GPU) for Whisper, Wav2Vec2, and
  Mistral (require GPU acceleration).
- **Serverless Inference API** for embedding and CamemBERT classification
  models (CPU-sufficient, pay-per-request).
- Auto-scaling: min 0 replicas (scale to zero when idle), max 2
  replicas for Whisper, max 1 for Wav2Vec2, max 1 for Mistral.

**Alternatives considered**:
- Self-hosted on GKE: Higher operational burden for GPU node
  management, cost optimization, and model serving (Triton/vLLM).
- Replicate: Less control over model versions and endpoint regions.
- On-device models (ONNX): Not viable for Whisper-large accuracy
  requirements; mobile device GPU insufficient.
- Phoneme alignment alternatives: Montreal Forced Aligner (requires
  offline batch processing, not suitable for real-time feedback);
  Kaldi (complex setup, harder to deploy as endpoint).

## 7. AI Platform: Google Gemini

**Decision**: Gemini 2.0 Flash (primary) + Gemini 2.0 Pro (complex evaluation)

### Task Allocation

| Task | Model | Justification |
|------|-------|---------------|
| Writing evaluation (CEFR-scored) | Gemini 2.0 Pro | Highest reasoning quality for nuanced CEFR assessment; structured JSON output |
| Complex conversation | Gemini 2.0 Flash | Good reasoning at lower cost; sufficient for conversation management |
| Structured evaluation output | Gemini 2.0 Flash | Native JSON mode; reliable schema adherence |
| Multimodal pronunciation | Gemini 2.0 Flash | Audio + text input support; prosody/fluency analysis |
| Lesson generation | Gemini 2.0 Flash | Pedagogical content generation; structured lesson format |
| Difficulty recalibration | Gemini 2.0 Flash | Pattern analysis from mastery data; structured output |
| Cultural content | Gemini 2.0 Flash | Paris-specific content generation; CEFR-level alignment |

### Cost Strategy

- Flash for 6/7 tasks (~$0.10/1M input tokens) keeps costs low.
- Pro reserved only for writing evaluation where quality difference
  is measurable (~$1.25/1M input tokens).
- Estimated cost per active user per day: ~$0.02-0.05 (assuming
  1 writing eval + 3 conversations + misc).

**Alternatives considered**:
- Gemini 1.5 Pro/Flash: Older generation; 2.0 improves structured
  output reliability and multimodal quality.
- Anthropic API: Not requested in spec; adding a third AI platform
  would increase orchestration complexity without clear benefit.
- GPT-4o: Higher cost; no advantage for French language tasks over
  Gemini for this use case.

## 8. Spaced Repetition Algorithm

**Decision**: FSRS (Free Spaced Repetition Scheduler) v5

**Rationale**: FSRS outperforms SM-2 in empirical studies (lower
average retrieval failure rate). Open-source Python implementation
available (py-fsrs). Parameters are optimizable per-user from review
history. The algorithm outputs stability and difficulty metrics that
map cleanly to the spec's mastery calculation requirements.

**Alternatives considered**:
- SM-2: Simpler but empirically less effective. Fixed ease factor
  doesn't adapt well to individual learner patterns.
- Leitner system: Too simplistic for a production system; no
  continuous difficulty tracking.
- Anki's modified SM-2: Proprietary modifications; harder to
  implement from specification.

## 9. Internationalization

**Decision**: react-intl (FormatJS) for web and mobile

**Rationale**: ICU message format supports pluralization rules
critical for French (different from Spanish). Single i18n framework
across React web and React Native. Spanish translation files shared
between platforms.

**Alternatives considered**:
- i18next: Similar capability but react-intl has better TypeScript
  integration and compile-time message extraction.
- Custom solution: Unnecessary when mature libraries exist.

## 10. Hosting & Infrastructure

**Decision**: Google Cloud Run (EU region: europe-west1)

**Rationale**: Serverless containers auto-scale to zero when idle
(cost efficient for early-stage product). EU region satisfies GDPR
data residency. Native integration with Cloud Tasks for async job
dispatch and Cloud Scheduler for cron jobs. Cloud Run supports
WebSocket connections for future real-time features.

### Container & Service Configuration

| Service | Type | CPU | Memory | Min/Max Instances | Concurrency |
|---------|------|-----|--------|-------------------|-------------|
| api | Cloud Run | 2 vCPU | 1 GiB | 1 / 10 | 80 |
| worker | Cloud Run | 2 vCPU | 2 GiB | 0 / 5 | 1 (sequential) |
| scheduler | Cloud Scheduler | N/A | N/A | N/A | N/A (cron triggers) |

**Alternatives considered**:
- GKE: Over-provisioned for initial scale; higher baseline cost.
- AWS ECS/Fargate: Spec requested GCP; Supabase is cloud-agnostic.
- Fly.io: Less mature auto-scaling; limited GPU support for future
  self-hosted model migration.

## 11. Authentication

**Decision**: Supabase Auth

**Rationale**: Built into Supabase platform. Supports email/password
and social login (Google, Apple) as required by spec assumptions.
JWT tokens validated in FastAPI middleware. Row Level Security (RLS)
policies enforce per-user data isolation at database level.

**Alternatives considered**:
- Auth0: Additional monthly cost; separate service to manage.
- Firebase Auth: Would mix Firebase and Supabase; unnecessary.
- Custom JWT: Unnecessary complexity; security risk.

## 12. Audio Handling

**Decision**: Supabase Storage for audio files, expo-av for recording

### Pipeline

1. Client records audio via expo-av (mobile) or MediaRecorder API (web).
2. Audio encoded as WAV (16kHz, mono) for Whisper compatibility.
3. Uploaded to Supabase Storage via signed URL (direct client upload).
4. API receives storage path, passes to worker for processing.
5. Processed results stored in database; audio retained for playback.

**Alternatives considered**:
- Google Cloud Storage: Additional service; Supabase Storage is
  S3-compatible and already in the stack.
- Client-side Whisper (whisper.cpp/WASM): Insufficient accuracy
  for production pronunciation assessment.

## 13. Embedding Search (pgvector)

**Decision**: pgvector extension in Supabase PostgreSQL

**Rationale**: Vocabulary semantic grouping and lesson personalization
require similarity search over sentence embeddings. pgvector provides
HNSW indexing for <10ms similarity queries at the expected scale
(~10K vocabulary embeddings). No separate vector database needed.

**Alternatives considered**:
- Pinecone/Weaviate: Additional service and cost for a scale that
  PostgreSQL handles natively.
- FAISS: In-memory only; doesn't persist across container restarts.

## 14. CI/CD

**Decision**: Google Cloud Build

**Rationale**: Native GCP integration. Triggers on push to feature
branches. Runs lint (Ruff + ESLint), type check (mypy + tsc), tests
(pytest + vitest + jest), coverage check (>=80%), and deploys
containers to Cloud Run on merge to main.

**Alternatives considered**:
- GitHub Actions: Would work but adds external dependency when
  Cloud Build is native to GCP.
- GitLab CI: Not using GitLab.
