# Tasks: Hybrid AI French Learning Platform

**Input**: Design documents from `/specs/001-hybrid-ai-french-learning/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Per Constitution Principle II, every implementation task MUST include unit tests covering its business logic, achieving >=80% line coverage. Tests are written alongside each task (not as separate tasks) using pytest (backend), Vitest (web), and Jest (mobile). AI service calls MUST be mocked. Test naming: `test_<unit>_<scenario>_<expected>`. Each user story phase ends with a verification checkpoint that validates all tests pass and coverage meets the threshold.

**Organization**: Tasks grouped by user story (10 stories, P1-P10) with Setup and Foundational phases first.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US10)
- Paths follow plan.md monorepo structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize monorepo structure, tooling, and project scaffolding

- [ ] T001 Create monorepo directory structure per plan.md: services/api/, services/worker/, services/shared/, web/, mobile/, supabase/, infra/
- [ ] T002 Initialize services/api/ Python project with pyproject.toml (FastAPI, Pydantic v2, supabase-py, uvicorn, huggingface-hub, google-genai, google-cloud-tasks)
- [ ] T003 [P] Initialize services/worker/ Python project with pyproject.toml (FastAPI, google-cloud-tasks, huggingface-hub, google-genai)
- [ ] T004 [P] Initialize services/shared/ Python package with pyproject.toml (pydantic, supabase-py, huggingface-hub, google-genai, py-fsrs)
- [ ] T005 [P] Initialize web/ React 19 project with Vite, TypeScript 5.x, Tailwind CSS, react-intl, TanStack Query in web/package.json and web/vite.config.ts
- [ ] T006 [P] Initialize mobile/ React Native Expo SDK 52 project with expo-av, react-intl in mobile/package.json and mobile/app.json
- [ ] T007 [P] Configure linting: Ruff + mypy for services/, ESLint + tsc for web/ and mobile/
- [ ] T008 [P] Create .env.example files for services/api/, services/worker/, web/, and mobile/ per quickstart.md
- [ ] T009 [P] Create docker-compose.yml for local development (api, worker, Supabase) per quickstart.md
- [ ] T010 [P] Initialize supabase/ directory with config.toml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

### Database Schema

- [ ] T011 Create Supabase migration 001: all enum types (cefr_level_enum, skill_enum, module_enum, exercise_type_enum, error_type_enum, ai_platform_enum, ai_task_type_enum, eval_status_enum, exam_type_enum, badge_type_enum, activity_type_enum) in supabase/migrations/
- [ ] T012 Create Supabase migration 002: user_profiles table with RLS policies in supabase/migrations/
- [ ] T013 [P] Create Supabase migration 003: vocabulary_items table with pgvector embedding column and HNSW index in supabase/migrations/
- [ ] T014 [P] Create Supabase migration 004: lessons and lesson_exercises tables in supabase/migrations/
- [ ] T015 [P] Create Supabase migration 005: skill_mastery table with RLS in supabase/migrations/
- [ ] T016 [P] Create Supabase migration 006: ai_model_usage_logs table with indexes in supabase/migrations/

### Backend Core

- [ ] T017 Implement FastAPI application entry point with health check, CORS, and router registration in services/api/src/main.py
- [ ] T018 Implement application config (Supabase URL, keys, HF endpoints, Gemini key, Cloud Tasks) in services/api/src/config.py
- [ ] T019 Implement Supabase JWT authentication middleware in services/api/src/middleware/auth.py
- [ ] T020 [P] Implement rate limiter middleware in services/api/src/middleware/rate_limiter.py
- [ ] T021 [P] Implement PII anonymizer middleware for stripping user data before AI calls in services/shared/ai/anonymizer.py
- [ ] T022 Implement AI task router: route each task type to HF or Gemini per research.md model table, with health-check probes for platform availability in services/shared/ai/router.py
- [ ] T022b Implement AI fallback behavior in services/shared/ai/router.py: (a) async tasks (writing eval, lesson gen, cultural gen, recalibration) queue to Cloud Tasks and notify learner when ready; (b) sync tasks (grammar check, STT, scaffolding) fall back to the other platform with degraded-quality flag; (c) non-substitutable tasks (multimodal pronunciation, structured eval) return "feature temporarily unavailable" with alternative activity suggestions
- [ ] T023 [P] Implement Hugging Face Inference Endpoints client (Whisper, CamemBERT, Mistral, Wav2Vec2, embeddings) in services/shared/ai/huggingface.py
- [ ] T024 [P] Implement Gemini API client (Flash + Pro, structured JSON output, retries) in services/shared/ai/gemini.py
- [ ] T025 [P] Implement AI usage logger (logs platform, task type, latency, cost, success to ai_model_usage_logs) in services/shared/ai/logger.py
- [ ] T026 [P] Define structured output JSON schemas for all AI evaluations in services/shared/ai/schemas.py
- [ ] T027 Implement worker service entry point (Cloud Tasks HTTP handler, local polling mode) in services/worker/src/main.py
- [ ] T028 [P] Implement worker config in services/worker/src/config.py

### Shared Models

- [ ] T029 [P] Create Pydantic base models for vocabulary types in services/shared/models/vocabulary.py
- [ ] T030 [P] Create Pydantic base models for lesson and exercise types in services/shared/models/lesson.py
- [ ] T031 [P] Create Pydantic base models for evaluation types (writing, conversation, pronunciation) in services/shared/models/evaluation.py
- [ ] T032 [P] Create Pydantic base models for mastery and skill types in services/shared/models/mastery.py
- [ ] T033 [P] Create Pydantic base models for gamification types (XP, badges, streaks) in services/shared/models/gamification.py
- [ ] T034 [P] Create Pydantic base models for pronunciation types in services/shared/models/pronunciation.py

### Frontend Core

- [ ] T035 Create API client base service with Supabase auth token injection in web/src/services/api.ts
- [ ] T036 [P] Configure react-intl with Spanish translations file in web/src/i18n/es.json and provider setup
- [ ] T037 [P] Create shared TypeScript types (CEFR levels, skills, modules, API responses) in web/src/types/
- [ ] T038 [P] Create common UI components: Button, Card, ProgressBar, AudioPlayer, LoadingState, ErrorState in web/src/components/common/
- [ ] T039 Create app shell with navigation (module tabs, dashboard, profile) in web/src/App.tsx and web/src/pages/
- [ ] T040 [P] Create mobile API client service matching web in mobile/src/services/api.ts
- [ ] T041 [P] Create mobile navigation structure (bottom tabs, stack navigators) in mobile/src/navigation/

**Checkpoint**: Foundation ready — verify all foundational tests pass (auth middleware, AI router with fallback, anonymizer, logger, FSRS) with >=80% coverage. User story implementation can now begin.

---

## Phase 3: User Story 1 — Vocabulary Learning with Spaced Repetition (Priority: P1) MVP

**Goal**: Learners can study French vocabulary with SRS scheduling, difficulty classification, and semantic grouping

**Independent Test**: Create account, select A1 vocabulary, complete 10-card review, verify review intervals adjust based on recall performance

### Implementation

- [ ] T042 Create Supabase migration 007: vocabulary_progress table with RLS and FSRS columns in supabase/migrations/
- [ ] T043 Create A1 vocabulary seed data (50+ items with French text, Spanish translation, example sentences, CEFR level, difficulty scores) in supabase/seed/
- [ ] T044 Implement FSRS v5 spaced repetition algorithm in services/shared/srs/fsrs.py
- [ ] T045 Implement vocabulary routes: GET /vocabulary/items (list by CEFR), GET /vocabulary/review (due items), POST /vocabulary/review (submit rating), POST /vocabulary/classify (HF difficulty), GET /vocabulary/items/{id}/similar (embedding search) in services/api/src/routes/vocabulary.py
- [ ] T046 [P] Implement HF embedding generation for vocabulary semantic similarity via services/shared/ai/huggingface.py (paraphrase-multilingual-MiniLM-L12-v2)
- [ ] T047 [P] Implement HF vocabulary difficulty classification via CamemBERT in services/shared/ai/huggingface.py
- [ ] T048 Create vocabulary API service layer in web/src/services/vocabulary.ts
- [ ] T049 Create flashcard component with French text, flip-to-reveal Spanish translation, example sentence, and audio playback in web/src/components/vocabulary/Flashcard.tsx
- [ ] T050 Create vocabulary review session page: card queue, difficulty rating buttons (Again/Hard/Good/Easy), session progress, session summary in web/src/pages/VocabularyReview.tsx
- [ ] T051 Create vocabulary list/browse page filtered by CEFR level with semantic groupings in web/src/pages/VocabularyBrowse.tsx
- [ ] T052 [P] Create mobile vocabulary screens matching web in mobile/src/screens/VocabularyReview.tsx and mobile/src/screens/VocabularyBrowse.tsx
- [ ] T052b [P] [US1] Implement cognate detection service: identify French-Spanish and French-Portuguese cognates using embedding similarity (threshold-based) in services/shared/ai/cognates.py
- [ ] T052c [P] [US1] Create CognateHighlight component that visually marks cognates with tooltip showing Spanish/Portuguese equivalent in web/src/components/common/CognateHighlight.tsx

**Checkpoint**: MVP complete — vocabulary SRS is fully functional and independently testable. Verify tests pass with >=80% coverage for all US1 backend code.

---

## Phase 4: User Story 2 — Placement Test and CEFR Assessment (Priority: P2)

**Goal**: New learners take an adaptive placement test; periodic CEFR exit exams gate level progression

**Independent Test**: Complete placement test with varying answer patterns, verify assigned level matches expected outcomes

### Implementation

- [ ] T053 Create Supabase migration 008: exam_attempts table with RLS in supabase/migrations/
- [ ] T054 Implement adaptive placement test algorithm (start A2, adjust up/down based on 5-question windows) in services/api/src/routes/exams.py
- [ ] T055 Implement exam routes: POST /exams/placement/start, POST /exams/{id}/answer (adaptive next question), POST /exams/exit/start, GET /exams/{id}/result, GET /exams/history in services/api/src/routes/exams.py
- [ ] T056 Create exam question bank seed data (A1-B2, covering vocabulary + grammar + reading) in supabase/seed/
- [ ] T057 Implement level unlock logic: check >=80% mastery (weighted formula from data-model.md) AND exam pass in services/shared/mastery/calculator.py
- [ ] T058 Create exam API service layer in web/src/services/exams.ts
- [ ] T059 Create placement test flow page: adaptive question display, progress indicator, result screen with per-skill breakdown in web/src/pages/PlacementTest.tsx
- [ ] T060 Create CEFR exit exam page: exam question flow, result with weak-area recommendations in web/src/pages/ExitExam.tsx
- [ ] T061 [P] Create mobile exam screens matching web in mobile/src/screens/PlacementTest.tsx and mobile/src/screens/ExitExam.tsx

**Checkpoint**: Placement test and CEFR exam flow functional. Verify tests pass with >=80% coverage for adaptive algorithm and mastery unlock logic.

---

## Phase 5: User Story 3 — Grammar Lessons and Exercises (Priority: P3)

**Goal**: Structured grammar lessons with interactive exercises, AI-powered error detection (CamemBERT + Mistral), and adaptive difficulty

**Independent Test**: Complete A1 grammar lesson (present tense -er verbs), answer exercises, verify feedback identifies errors and adapts difficulty

### Implementation

- [ ] T062 Create Supabase migration 009: error_patterns table with RLS in supabase/migrations/
- [ ] T063 Create A1 grammar lesson seed data (regular -er verbs, articles, basic adjectives) with exercises in supabase/seed/
- [ ] T064 Implement grammar check route: POST /grammar/check using CamemBERT token classification + Mistral generative correction pipeline in services/api/src/routes/grammar.py
- [ ] T065 [P] Implement sentence complexity scoring route: POST /grammar/complexity using HF embeddings in services/api/src/routes/grammar.py
- [ ] T066 Implement lesson routes: GET /lessons (by module+level), GET /lessons/{id} (with exercises), POST /lessons/{id}/exercises/{eid}/submit (answer + feedback) in services/api/src/routes/lessons.py
- [ ] T067 Implement error pattern tracking: record recurring mistakes by type and category, update adaptive difficulty in services/api/src/routes/lessons.py
- [ ] T068 [P] Implement difficulty recalibration worker job using Gemini in services/worker/src/jobs/difficulty_recal.py
- [ ] T069 Create grammar API service layer in web/src/services/grammar.ts
- [ ] T070 Create grammar lesson page: concept explanation (Spanish with French examples), interactive exercises (fill-blank, reorder, conjugate, error-correct) in web/src/pages/GrammarLesson.tsx
- [ ] T071 Create grammar exercise components: FillBlank, SentenceReorder, ConjugationPractice, ErrorCorrection in web/src/components/grammar/
- [ ] T072 [P] Create mobile grammar screens matching web in mobile/src/screens/GrammarLesson.tsx

**Checkpoint**: Grammar module with AI error detection functional. Verify tests pass with >=80% coverage for grammar pipeline and error pattern tracking.

---

## Phase 6: User Story 4 — AI Conversational Practice (Priority: P4)

**Goal**: Text-based conversation with AI tutor using CEFR-appropriate scenarios, inline corrections, Spanish fallback, and post-conversation evaluation

**Independent Test**: Initiate A1 conversation, exchange 5+ messages, verify AI stays at level, corrects errors, provides evaluation

### Implementation

- [ ] T073 Create Supabase migration 010: conversation_sessions table with RLS in supabase/migrations/
- [ ] T074 Implement conversation routes: POST /conversation/sessions (start), POST /sessions/{id}/messages (send + receive), POST /sessions/{id}/end (complete), GET /sessions/{id}/evaluation in services/api/src/routes/conversation.py
- [ ] T075 Implement Mistral scaffolding for lightweight conversational turns via services/shared/ai/huggingface.py
- [ ] T076 Implement Gemini conversation evaluation (structured JSON: vocabulary, grammar, communicative scores) via services/shared/ai/gemini.py
- [ ] T077 Create conversation API service layer in web/src/services/conversation.ts
- [ ] T078 Create conversation page: scenario selection, chat interface, inline correction display, Spanish fallback, end + evaluation view in web/src/pages/Conversation.tsx
- [ ] T079 Create conversation components: ChatBubble, InlineCorrection, ScenarioSelector, EvaluationSummary in web/src/components/conversation/
- [ ] T080 [P] Create mobile conversation screens matching web in mobile/src/screens/Conversation.tsx

**Checkpoint**: AI conversation practice with evaluation functional. Verify tests pass with >=80% coverage for conversation routes and Gemini evaluation mocks.

---

## Phase 7: User Story 5 — Writing Evaluation with CEFR Scoring (Priority: P5)

**Goal**: Learners submit writing samples and receive structured CEFR-aligned evaluations via Gemini Pro, with quick grammar preview via CamemBERT

**Independent Test**: Submit A1-level description, receive evaluation with CEFR score, per-criterion ratings, and actionable feedback

### Implementation

- [ ] T081 Create Supabase migration 011: writing_evaluations table with RLS and status lifecycle in supabase/migrations/
- [ ] T082 Implement writing routes: GET /writing/prompts, POST /writing/submit (async via Cloud Tasks), GET /writing/evaluations/{id} (poll status), GET /writing/evaluations (history) in services/api/src/routes/writing.py
- [ ] T083 Implement writing evaluation worker job: Gemini Pro structured CEFR evaluation (grammar, vocabulary, coherence, task completion scores) in services/worker/src/jobs/writing_eval.py
- [ ] T084 Create writing API service layer in web/src/services/writing.ts
- [ ] T085 Create writing page: prompt display, text editor with accent toolbar, submit button, quick grammar preview (CamemBERT), evaluation result display in web/src/pages/Writing.tsx
- [ ] T086 Create writing components: WritingEditor, AccentToolbar, EvaluationResult, CriterionScore in web/src/components/writing/
- [ ] T087 [P] Create mobile writing screens matching web in mobile/src/screens/Writing.tsx

**Checkpoint**: Writing evaluation with async AI processing functional. Verify tests pass with >=80% coverage for writing routes and worker job with mocked Gemini Pro.

---

## Phase 8: User Story 6 — Pronunciation Practice with Multimodal Feedback (Priority: P6)

**Goal**: Record audio, get STT transcription (Whisper), phoneme alignment (Wav2Vec2), and multimodal evaluation (Gemini Flash) with visual phoneme accuracy map

**Independent Test**: Record A1 phrase, receive phoneme-level feedback, verify system identifies pronunciation issues

### Implementation

- [ ] T088 Create Supabase migration 012: pronunciation_scores table with RLS and status lifecycle in supabase/migrations/
- [ ] T089 Configure Supabase Storage bucket for audio files with signed URL upload policy
- [ ] T090 Implement pronunciation routes: GET /pronunciation/exercises, POST /pronunciation/upload (signed URL), POST /pronunciation/evaluate (async pipeline via Cloud Tasks), GET /pronunciation/evaluations/{id}, GET /pronunciation/history in services/api/src/routes/pronunciation.py
- [ ] T091 Implement pronunciation evaluation worker job: Whisper STT -> Wav2Vec2 phoneme alignment -> Gemini multimodal prosody+fluency evaluation in services/worker/src/jobs/pronunciation_eval.py
- [ ] T092 Create pronunciation API service layer in web/src/services/pronunciation.ts
- [ ] T093 Create audio recording hook using MediaRecorder API (web) in web/src/hooks/useAudioRecorder.ts
- [ ] T094 Create pronunciation page: target phrase display, reference audio playback (with speed control), record button, waveform visualizer, evaluation result with phoneme map in web/src/pages/Pronunciation.tsx
- [ ] T095 Create pronunciation components: PhonemeMap, WaveformVisualizer, RecordButton, SpeedControl, FluencyScore in web/src/components/pronunciation/
- [ ] T096 [P] Create mobile audio recording using expo-av in mobile/src/hooks/useAudioRecorder.ts
- [ ] T097 [P] Create mobile pronunciation screens matching web in mobile/src/screens/Pronunciation.tsx

**Checkpoint**: Full pronunciation multimodal pipeline functional. Verify tests pass with >=80% coverage for pronunciation routes and 3-stage worker pipeline (Whisper, Wav2Vec2, Gemini mocked).

---

## Phase 9: User Story 7 — Listening Comprehension (Priority: P7)

**Goal**: Listen to Paris-contextualized French audio, answer comprehension questions, get feedback with explanations

**Independent Test**: Listen to A1 dialogue, answer comprehension questions, verify correct/incorrect feedback with explanations

### Implementation

- [ ] T098 Create A1 listening exercise seed data (Paris-context dialogues with audio URLs, comprehension questions, answer keys) in supabase/seed/
- [ ] T099 Implement listening routes: GET /listening/exercises, GET /listening/exercises/{id}, POST /listening/exercises/{id}/submit, POST /listening/exercises/{id}/transcript in services/api/src/routes/listening.py
- [ ] T100 Create listening API service layer in web/src/services/listening.ts
- [ ] T101 Create listening page: audio player with speed control, comprehension questions (multiple-choice at A1, open-ended at B2+), feedback with segment replay, transcript toggle in web/src/pages/Listening.tsx
- [ ] T102 Create listening components: AudioPlayerExtended (speed, seek, segment replay), ComprehensionQuestion, TranscriptView in web/src/components/listening/
- [ ] T103 [P] Create mobile listening screens matching web in mobile/src/screens/Listening.tsx

**Checkpoint**: Listening comprehension module functional. Verify tests pass with >=80% coverage for listening routes.

---

## Phase 10: User Story 8 — Paris Cultural Notes (Priority: P8)

**Goal**: Browse and read Paris-specific cultural articles at CEFR reading level, with linked vocabulary and AI-generated content

**Independent Test**: Open A1 cultural note, verify text matches A1 vocabulary/grammar, confirm linked vocabulary items appear in SRS

### Implementation

- [ ] T104 Create Supabase migration 013: cultural_notes table in supabase/migrations/
- [ ] T105 Create initial cultural notes seed data (A1: cafes, greetings, metro basics) in supabase/seed/
- [ ] T106 Implement cultural routes: GET /cultural/notes, GET /cultural/notes/{id}, POST /cultural/notes/{id}/vocabulary/{vid}/add, POST /cultural/generate (async) in services/api/src/routes/cultural.py
- [ ] T107 Implement cultural content generation worker job using Gemini Flash in services/worker/src/jobs/cultural_gen.py
- [ ] T108 Create cultural API service layer in web/src/services/cultural.ts
- [ ] T109 Create cultural notes page: article list by category, article reader with tap-to-translate vocabulary, add-to-SRS action in web/src/pages/CulturalNotes.tsx
- [ ] T110 Create cultural components: ArticleCard, ArticleReader, VocabularyHighlight in web/src/components/cultural/
- [ ] T111 [P] Create mobile cultural screens matching web in mobile/src/screens/CulturalNotes.tsx

**Checkpoint**: Cultural notes with AI generation and vocabulary linking functional. Verify tests pass with >=80% coverage for cultural routes and generation worker.

---

## Phase 11: User Story 9 — Gamification and Progress Tracking (Priority: P9)

**Goal**: XP awards, daily streaks, CEFR badges, visual skill tree, adaptive daily challenges, and progress dashboard

**Independent Test**: Complete 3 activities, verify XP awards, streak increment, and skill tree progress update

### Implementation

- [ ] T112 Create Supabase migration 014: badges, xp_transactions, and daily_challenges tables with RLS in supabase/migrations/
- [ ] T113 Implement weighted mastery score calculation (50% accuracy + 30% consistency + 20% recency, decay=0.85) in services/shared/mastery/calculator.py
- [ ] T114 Implement progress routes: GET /progress/dashboard, GET /progress/mastery, GET /progress/skill-tree, GET /progress/streak, POST /progress/daily-challenge/{id}/complete, GET /progress/xp/history in services/api/src/routes/progress.py
- [ ] T115 Implement XP award logic: calculate and insert xp_transactions on activity completion, update user_profiles.xp_total in services/api/src/routes/progress.py
- [ ] T116 Implement streak logic: increment on daily activity, reset on missed day, preserve longest_streak in services/api/src/routes/progress.py
- [ ] T117 Implement badge award logic: grant cefr_completion on exam pass, streak badges on threshold in services/api/src/routes/progress.py
- [ ] T118 Create progress API service layer in web/src/services/progress.ts
- [ ] T119 Create progress dashboard page: CEFR progress bar, per-skill mastery percentages, streak counter, XP total, badges earned, daily challenge in web/src/pages/Dashboard.tsx
- [ ] T120 Create skill tree visualization component in web/src/components/progress/SkillTree.tsx
- [ ] T121 Create progress components: MasteryMeter, StreakCounter, BadgeGrid, XPAnimation, DailyChallenge in web/src/components/progress/
- [ ] T122 [P] Create mobile progress screens matching web in mobile/src/screens/Dashboard.tsx

**Checkpoint**: Gamification and progress tracking fully functional. Verify tests pass with >=80% coverage for mastery calculator, XP/streak/badge logic.

---

## Phase 12: User Story 10 — AI Model Performance Analytics (Priority: P10)

**Goal**: Admin dashboard showing comparative AI platform metrics (latency, cost, error rates) per task type

**Independent Test**: Trigger AI interactions across task types, view analytics dashboard, verify data captured correctly

### Implementation

- [ ] T123 Implement admin analytics routes: GET /admin/analytics/ai/overview, GET /admin/analytics/ai/by-task, GET /admin/analytics/ai/trends, GET /admin/analytics/users, GET /admin/analytics/content in services/api/src/routes/admin.py
- [ ] T124 Create admin API service layer in web/src/services/admin.ts
- [ ] T125 Create admin analytics dashboard page: platform comparison charts (latency, cost, error rate), task-type breakdown, daily trends, user engagement in web/src/pages/AdminAnalytics.tsx
- [ ] T126 Create analytics components: PlatformComparisonChart, TaskBreakdownTable, TrendGraph, CostPerUserChart in web/src/components/admin/

**Checkpoint**: AI analytics dashboard functional. Verify tests pass with >=80% coverage for analytics query routes.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Infrastructure, cron jobs, GDPR, and deployment configuration

- [ ] T127 Implement Cloud Scheduler cron job configs: daily challenges (03:00 UTC), streak reset (04:00 UTC), SRS batch (05:00 UTC), AI digest (Monday 06:00 UTC) in infra/cloud-run/scheduler.yaml
- [ ] T128 [P] Implement cron handler routes: POST /internal/cron/daily-challenges, POST /internal/cron/streak-reset, POST /internal/cron/srs-batch, POST /internal/cron/ai-digest in services/api/src/routes/admin.py
- [ ] T129 [P] Implement lesson generation worker job using Gemini Flash in services/worker/src/jobs/lesson_gen.py
- [ ] T130 [P] Implement GDPR compliance routes: data export, account deletion (cascade) in services/api/src/routes/progress.py
- [ ] T131 [P] Create Dockerfile for services/api/ in services/api/Dockerfile
- [ ] T132 [P] Create Dockerfile for services/worker/ in services/worker/Dockerfile
- [ ] T133 [P] Create Cloud Build CI/CD pipeline (lint, type-check, test, build, deploy) in infra/cloudbuild.yaml
- [ ] T134 [P] Create Cloud Run service configs for api and worker in infra/cloud-run/api.yaml and infra/cloud-run/worker.yaml
- [ ] T135 Implement cross-platform data sync: last-write-wins with 30-second periodic sync in web/src/hooks/useSync.ts
- [ ] T136 [P] Create UI glossary with canonical Spanish terms in web/src/i18n/glossary.json
- [ ] T137 Run quickstart.md validation: verify all setup steps work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phases 3-12)**: All depend on Foundational phase completion
  - User stories can proceed in parallel if staffed
  - Or sequentially in priority order (P1 -> P2 -> ... -> P10)
- **Polish (Phase 13)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Vocabulary)**: Foundational only — no cross-story dependencies. **This is the MVP.**
- **US2 (Placement/Exams)**: Foundational only — uses skill_mastery from US9 for unlock logic, but can be tested independently with mock mastery data
- **US3 (Grammar)**: Foundational only — uses error_patterns for adaptive difficulty
- **US4 (Conversation)**: Foundational only — independent
- **US5 (Writing)**: Foundational only — requires Cloud Tasks from foundational
- **US6 (Pronunciation)**: Foundational only — requires Supabase Storage + Cloud Tasks
- **US7 (Listening)**: Foundational only — uses shared lesson/exercise framework from US3
- **US8 (Cultural)**: Foundational only — links to vocabulary_items from US1
- **US9 (Gamification)**: Light dependency on all stories for XP triggers, but core progress tracking is independent
- **US10 (Analytics)**: Uses ai_model_usage_logs populated by all AI-powered stories; admin dashboard is independent

### Within Each User Story

1. Database migrations first
2. Seed data (if needed)
3. Backend routes and business logic
4. Worker jobs (if async tasks)
5. Frontend API service layer
6. Frontend pages and components
7. Mobile screens last (parallel with web components)

### Parallel Opportunities

**Phase 2 parallel groups:**
- Group A (DB): T013, T014, T015, T016 (all different tables)
- Group B (AI clients): T023, T024, T025, T026 (different files)
- Group C (Middleware): T020, T021 (different files)
- Group D (Models): T029-T034 (all different files)
- Group E (Frontend): T036, T037, T038, T040, T041 (different files)

**Cross-story parallelism after foundational:**
- US1 + US3 + US4 can all start simultaneously (no shared tables beyond foundational)
- US5 + US6 can start simultaneously (both use Cloud Tasks but different worker jobs)
- Mobile tasks within each story are always parallelizable with web tasks

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Vocabulary SRS)
4. **STOP and VALIDATE**: Test vocabulary review end-to-end
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational -> Foundation ready
2. US1 (Vocabulary) -> Test -> Deploy (MVP!)
3. US2 (Placement) -> Test -> Deploy
4. US3 (Grammar) + US4 (Conversation) -> Test -> Deploy (parallel)
5. US5 (Writing) + US6 (Pronunciation) -> Test -> Deploy (parallel, AI-heavy)
6. US7 (Listening) + US8 (Cultural) -> Test -> Deploy (parallel, content-heavy)
7. US9 (Gamification) -> Test -> Deploy (integrates with all)
8. US10 (Analytics) -> Test -> Deploy (admin dashboard)
9. Phase 13: Polish -> Final deployment

---

## Metrics

- **Total tasks**: 140
- **Setup**: 10 tasks
- **Foundational**: 32 tasks (includes T022b for AI fallback)
- **User Stories**: 87 tasks (US1: 13 incl. cognate tasks, US2: 9, US3: 11, US4: 8, US5: 7, US6: 10, US7: 6, US8: 8, US9: 11, US10: 4)
- **Polish**: 11 tasks
- **Parallelizable tasks**: 60 (marked [P])
- **Worker/async jobs**: 5 (writing eval, pronunciation eval, cultural gen, difficulty recal, lesson gen)
- **Database migrations**: 14
- **API route files**: 11
- **Testing policy**: Inline with each task per Constitution Principle II; >=80% coverage enforced at every story checkpoint
