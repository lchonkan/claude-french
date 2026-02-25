# Data Model: Hybrid AI French Learning Platform

**Date**: 2026-02-24
**Storage**: Supabase-managed PostgreSQL 15 with pgvector extension
**Auth**: Supabase Auth (manages `auth.users` table)

## Entity Relationship Overview

```text
auth.users (Supabase-managed)
  └─── user_profiles (1:1)
         ├─── vocabulary_progress (1:N per vocab item)
         ├─── skill_mastery (1:N per skill per CEFR level)
         ├─── writing_evaluations (1:N)
         ├─── pronunciation_scores (1:N)
         ├─── error_patterns (1:N)
         ├─── exam_attempts (1:N)
         ├─── xp_transactions (1:N)
         ├─── badges (1:N)
         ├─── daily_challenges (1:N)
         └─── conversation_sessions (1:N)

vocabulary_items (reference data)
  └─── vocabulary_progress (N:1 from users)

lessons (reference data, per module per CEFR level)
  └─── lesson_exercises (1:N)

cultural_notes (reference data, per CEFR level)

ai_model_usage_logs (cross-cutting, per AI interaction)
```

## Tables

### user_profiles

Extends Supabase `auth.users` with application-specific data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, FK → auth.users.id | Supabase user ID |
| display_name | VARCHAR(100) | NOT NULL | User display name |
| native_language | VARCHAR(5) | NOT NULL, DEFAULT 'es' | ISO 639-1 code |
| interface_language | VARCHAR(5) | NOT NULL, DEFAULT 'es' | UI language |
| current_cefr_level | cefr_level_enum | NOT NULL, DEFAULT 'A1' | Current level |
| xp_total | INTEGER | NOT NULL, DEFAULT 0 | Lifetime XP |
| current_streak | INTEGER | NOT NULL, DEFAULT 0 | Consecutive days active |
| longest_streak | INTEGER | NOT NULL, DEFAULT 0 | All-time record |
| last_activity_date | DATE | NULL | Last day with completed activity |
| placement_completed | BOOLEAN | NOT NULL, DEFAULT FALSE | Has taken placement test |
| gdpr_consent_at | TIMESTAMPTZ | NULL | GDPR processing consent timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Auto-updated via trigger |

**Indexes**: `idx_profiles_cefr` on (current_cefr_level)

### vocabulary_items

Reference table of all French vocabulary in the curriculum.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| french_text | VARCHAR(200) | NOT NULL, UNIQUE | French word/phrase |
| spanish_translation | VARCHAR(200) | NOT NULL | Primary translation |
| example_sentence_fr | TEXT | NOT NULL | French example sentence |
| example_sentence_es | TEXT | NOT NULL | Spanish translation of example |
| audio_url | TEXT | NULL | Supabase Storage path to audio |
| phonetic_ipa | VARCHAR(100) | NULL | IPA transcription |
| difficulty_score | SMALLINT | NOT NULL, CHECK (1-5) | AI-classified difficulty |
| cefr_level | cefr_level_enum | NOT NULL | Target CEFR level |
| tags | TEXT[] | DEFAULT '{}' | Semantic tags for grouping |
| embedding | vector(384) | NULL | Multilingual MiniLM embedding |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Indexes**:
- `idx_vocab_cefr` on (cefr_level)
- `idx_vocab_embedding` using HNSW on (embedding vector_cosine_ops)

### vocabulary_progress

Per-user SRS scheduling state for each vocabulary item.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → user_profiles.id ON DELETE CASCADE | |
| vocabulary_item_id | UUID | NOT NULL, FK → vocabulary_items.id | |
| fsrs_stability | FLOAT | NOT NULL, DEFAULT 0 | FSRS stability parameter |
| fsrs_difficulty | FLOAT | NOT NULL, DEFAULT 0 | FSRS difficulty parameter |
| fsrs_due_date | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Next review date |
| fsrs_interval | FLOAT | NOT NULL, DEFAULT 0 | Current interval in days |
| review_count | INTEGER | NOT NULL, DEFAULT 0 | Total reviews |
| correct_count | INTEGER | NOT NULL, DEFAULT 0 | Correct reviews |
| last_review_rating | SMALLINT | NULL | Last FSRS rating (1-4) |
| last_reviewed_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Constraints**: UNIQUE(user_id, vocabulary_item_id)
**Indexes**:
- `idx_vocab_progress_user_due` on (user_id, fsrs_due_date)
- `idx_vocab_progress_item` on (vocabulary_item_id)

### skill_mastery

Per-user, per-skill, per-CEFR-level mastery tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → user_profiles.id ON DELETE CASCADE | |
| skill | skill_enum | NOT NULL | vocabulary, grammar, writing, listening, pronunciation, conversation |
| cefr_level | cefr_level_enum | NOT NULL | |
| mastery_percentage | FLOAT | NOT NULL, DEFAULT 0, CHECK (0-100) | Weighted score |
| exercise_results | JSONB | NOT NULL, DEFAULT '[]' | Last 20 results: [{score, timestamp}] |
| total_exercises | INTEGER | NOT NULL, DEFAULT 0 | |
| total_correct | INTEGER | NOT NULL, DEFAULT 0 | |
| time_spent_seconds | INTEGER | NOT NULL, DEFAULT 0 | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Constraints**: UNIQUE(user_id, skill, cefr_level)
**Indexes**: `idx_mastery_user_level` on (user_id, cefr_level)

**Mastery Calculation** (computed on write):
```
mastery = (0.50 * accuracy_last_20)
        + (0.30 * consistency_score)
        + (0.20 * recency_weighted_accuracy)

where:
  accuracy_last_20 = correct / total in last 20 exercises
  consistency_score = 1.0 - stddev(last 20 scores) (normalized 0-1)
  recency_weighted_accuracy = sum(score_i * decay^(20-i)) / sum(decay^(20-i))
  decay = 0.85
```

### lessons

Structured curriculum content per module per CEFR level.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| module | module_enum | NOT NULL | vocabulary, grammar, writing, listening, pronunciation, conversation, cultural |
| cefr_level | cefr_level_enum | NOT NULL | |
| title_es | VARCHAR(200) | NOT NULL | Spanish title |
| title_fr | VARCHAR(200) | NOT NULL | French title |
| description_es | TEXT | NULL | Spanish description |
| content | JSONB | NOT NULL | Lesson content (structure varies by module) |
| order_index | INTEGER | NOT NULL | Sequence within module+level |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Constraints**: UNIQUE(module, cefr_level, order_index)
**Indexes**: `idx_lessons_module_level` on (module, cefr_level, order_index)

### lesson_exercises

Individual exercises within a lesson.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| lesson_id | UUID | NOT NULL, FK → lessons.id ON DELETE CASCADE | |
| exercise_type | exercise_type_enum | NOT NULL | fill_blank, reorder, conjugate, error_correct, multiple_choice, open_ended |
| prompt_es | TEXT | NOT NULL | Spanish prompt/instruction |
| content | JSONB | NOT NULL | Exercise data (question, options, correct answer) |
| difficulty_tier | SMALLINT | NOT NULL, DEFAULT 1, CHECK (1-3) | Within-level difficulty |
| order_index | INTEGER | NOT NULL | Sequence within lesson |

**Indexes**: `idx_exercises_lesson` on (lesson_id, order_index)

### writing_evaluations

Stores submitted writing and AI-generated evaluations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → user_profiles.id ON DELETE CASCADE | |
| lesson_id | UUID | NULL, FK → lessons.id | Optional lesson association |
| cefr_level | cefr_level_enum | NOT NULL | Level at time of submission |
| prompt_text | TEXT | NOT NULL | The writing prompt |
| submitted_text | TEXT | NOT NULL | Learner's submission |
| grammar_score | FLOAT | NULL, CHECK (0-1) | |
| vocabulary_score | FLOAT | NULL, CHECK (0-1) | |
| coherence_score | FLOAT | NULL, CHECK (0-1) | |
| task_completion_score | FLOAT | NULL, CHECK (0-1) | |
| overall_cefr_score | cefr_level_enum | NULL | Assessed writing level |
| feedback_es | TEXT | NULL | Spanish feedback text |
| evaluation_json | JSONB | NULL | Full structured evaluation |
| status | eval_status_enum | NOT NULL, DEFAULT 'pending' | pending, processing, completed, failed |
| ai_platform | ai_platform_enum | NULL | huggingface, gemini |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| completed_at | TIMESTAMPTZ | NULL | |

**Indexes**:
- `idx_writing_user` on (user_id, created_at DESC)
- `idx_writing_status` on (status) WHERE status = 'pending'

### pronunciation_scores

Stores pronunciation attempts and multimodal evaluation results.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → user_profiles.id ON DELETE CASCADE | |
| target_text | TEXT | NOT NULL | Expected French text |
| audio_url | TEXT | NOT NULL | Supabase Storage path |
| transcription | TEXT | NULL | Whisper transcription output |
| phoneme_alignment | JSONB | NULL | Per-phoneme accuracy data |
| phoneme_accuracy_score | FLOAT | NULL, CHECK (0-1) | |
| prosody_score | FLOAT | NULL, CHECK (0-1) | |
| fluency_score | FLOAT | NULL, CHECK (0-1) | |
| overall_score | FLOAT | NULL, CHECK (0-1) | |
| improvement_suggestions | JSONB | NULL | Structured suggestions |
| status | eval_status_enum | NOT NULL, DEFAULT 'pending' | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| completed_at | TIMESTAMPTZ | NULL | |

**Indexes**: `idx_pronunciation_user` on (user_id, created_at DESC)

### conversation_sessions

Tracks AI conversation sessions and evaluations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → user_profiles.id ON DELETE CASCADE | |
| cefr_level | cefr_level_enum | NOT NULL | |
| scenario_title | VARCHAR(200) | NOT NULL | e.g., "Ordering at a Parisian cafe" |
| messages | JSONB | NOT NULL, DEFAULT '[]' | Array of {role, content, timestamp} |
| evaluation_json | JSONB | NULL | Post-conversation structured eval |
| vocabulary_score | FLOAT | NULL | |
| grammar_score | FLOAT | NULL | |
| communicative_score | FLOAT | NULL | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | active, completed, evaluated |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| completed_at | TIMESTAMPTZ | NULL | |

**Indexes**: `idx_conversation_user` on (user_id, created_at DESC)

### error_patterns

Tracks recurring learner mistakes for adaptive difficulty.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → user_profiles.id ON DELETE CASCADE | |
| error_type | error_type_enum | NOT NULL | grammar, pronunciation, vocabulary, spelling |
| error_category | VARCHAR(100) | NOT NULL | e.g., "verb_conjugation_irregular", "nasal_vowels" |
| cefr_level | cefr_level_enum | NOT NULL | |
| occurrence_count | INTEGER | NOT NULL, DEFAULT 1 | |
| last_occurrence_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| examples | JSONB | NOT NULL, DEFAULT '[]' | Recent error examples |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Constraints**: UNIQUE(user_id, error_type, error_category, cefr_level)
**Indexes**: `idx_errors_user_type` on (user_id, error_type, occurrence_count DESC)

### exam_attempts

Placement tests and CEFR exit exams.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → user_profiles.id ON DELETE CASCADE | |
| exam_type | exam_type_enum | NOT NULL | placement, exit |
| cefr_level | cefr_level_enum | NOT NULL | Target level for exit exams |
| score | FLOAT | NULL, CHECK (0-100) | Overall percentage |
| passed | BOOLEAN | NULL | |
| skill_breakdown | JSONB | NULL | Per-skill scores |
| answers | JSONB | NULL | Question-answer pairs |
| started_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| completed_at | TIMESTAMPTZ | NULL | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'in_progress' | in_progress, completed, abandoned |

**Indexes**: `idx_exams_user` on (user_id, exam_type, cefr_level)

### cultural_notes

Paris-specific cultural enrichment content.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| cefr_level | cefr_level_enum | NOT NULL | |
| title_es | VARCHAR(200) | NOT NULL | |
| title_fr | VARCHAR(200) | NOT NULL | |
| content_fr | TEXT | NOT NULL | French article text |
| content_es | TEXT | NOT NULL | Spanish translation/summary |
| vocabulary_ids | UUID[] | DEFAULT '{}' | Linked vocabulary items |
| category | VARCHAR(50) | NOT NULL | history, neighborhoods, etiquette, cuisine, daily_life |
| is_generated | BOOLEAN | NOT NULL, DEFAULT TRUE | AI-generated flag |
| reviewed | BOOLEAN | NOT NULL, DEFAULT FALSE | Human review status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Indexes**: `idx_cultural_level_cat` on (cefr_level, category)

### badges

Earned badges (CEFR level completion, achievements).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → user_profiles.id ON DELETE CASCADE | |
| badge_type | badge_type_enum | NOT NULL | cefr_completion, streak_7, streak_30, first_conversation, etc. |
| cefr_level | cefr_level_enum | NULL | For CEFR badges |
| earned_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Constraints**: UNIQUE(user_id, badge_type, cefr_level)

### xp_transactions

XP award log for all activities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → user_profiles.id ON DELETE CASCADE | |
| activity_type | activity_type_enum | NOT NULL | vocab_review, grammar_exercise, conversation, writing, pronunciation, listening, exam, daily_challenge |
| xp_amount | INTEGER | NOT NULL | |
| metadata | JSONB | NULL | Additional context (accuracy, etc.) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Indexes**: `idx_xp_user_date` on (user_id, created_at DESC)

### daily_challenges

Generated adaptive daily challenges.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → user_profiles.id ON DELETE CASCADE | |
| challenge_date | DATE | NOT NULL | |
| challenge_type | skill_enum | NOT NULL | Focus skill |
| challenge_config | JSONB | NOT NULL | Exercise configuration |
| completed | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| xp_awarded | INTEGER | NOT NULL, DEFAULT 0 | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Constraints**: UNIQUE(user_id, challenge_date)

### ai_model_usage_logs

Cross-platform AI interaction tracking for analytics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| session_id | UUID | NOT NULL | Internal correlation ID (not user ID) |
| user_id | UUID | NULL, FK → user_profiles.id ON DELETE SET NULL | For aggregate analytics only |
| platform | ai_platform_enum | NOT NULL | huggingface, gemini |
| model_name | VARCHAR(100) | NOT NULL | e.g., "whisper-large-v3-turbo", "gemini-2.0-flash" |
| task_type | ai_task_type_enum | NOT NULL | grammar_check, stt, phoneme_alignment, embedding, text_generation, writing_eval, conversation, pronunciation_analysis, lesson_generation, difficulty_recalibration, cultural_content |
| latency_ms | INTEGER | NOT NULL | Response time in milliseconds |
| estimated_cost_usd | DECIMAL(10, 6) | NULL | Estimated cost |
| input_tokens | INTEGER | NULL | |
| output_tokens | INTEGER | NULL | |
| success | BOOLEAN | NOT NULL | |
| error_message | TEXT | NULL | |
| is_fallback | BOOLEAN | NOT NULL, DEFAULT FALSE | Was this a fallback routing? |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Indexes**:
- `idx_ai_logs_platform_task` on (platform, task_type, created_at DESC)
- `idx_ai_logs_created` on (created_at DESC)
- `idx_ai_logs_user` on (user_id, created_at DESC)

**Partitioning**: Consider range-partitioning by `created_at` (monthly)
when log volume exceeds 10M rows.

## Enums

```sql
CREATE TYPE cefr_level_enum AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE skill_enum AS ENUM ('vocabulary', 'grammar', 'writing', 'listening', 'pronunciation', 'conversation');
CREATE TYPE module_enum AS ENUM ('vocabulary', 'grammar', 'writing', 'listening', 'pronunciation', 'conversation', 'cultural');
CREATE TYPE exercise_type_enum AS ENUM ('fill_blank', 'reorder', 'conjugate', 'error_correct', 'multiple_choice', 'open_ended');
CREATE TYPE error_type_enum AS ENUM ('grammar', 'pronunciation', 'vocabulary', 'spelling');
CREATE TYPE ai_platform_enum AS ENUM ('huggingface', 'gemini');
CREATE TYPE ai_task_type_enum AS ENUM (
  'grammar_check', 'stt', 'phoneme_alignment', 'embedding',
  'text_generation', 'writing_eval', 'conversation',
  'pronunciation_analysis', 'lesson_generation',
  'difficulty_recalibration', 'cultural_content'
);
CREATE TYPE eval_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE exam_type_enum AS ENUM ('placement', 'exit');
CREATE TYPE badge_type_enum AS ENUM (
  'cefr_completion', 'streak_7', 'streak_30', 'streak_100',
  'first_conversation', 'first_writing', 'first_pronunciation',
  'vocab_100', 'vocab_500', 'vocab_1000'
);
CREATE TYPE activity_type_enum AS ENUM (
  'vocab_review', 'grammar_exercise', 'conversation', 'writing',
  'pronunciation', 'listening', 'exam', 'daily_challenge'
);
```

## Row Level Security (RLS)

All user-data tables enforce RLS via Supabase:

```sql
-- Example for vocabulary_progress
ALTER TABLE vocabulary_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON vocabulary_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON vocabulary_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON vocabulary_progress FOR UPDATE
  USING (auth.uid() = user_id);
```

Same pattern applied to: skill_mastery, writing_evaluations,
pronunciation_scores, error_patterns, exam_attempts, badges,
xp_transactions, daily_challenges, conversation_sessions.

**Exceptions**:
- vocabulary_items, lessons, lesson_exercises, cultural_notes:
  Read-only for authenticated users (no RLS write policies).
- ai_model_usage_logs: Write via service role only (API/worker);
  read via admin role for analytics dashboard.

## State Transitions

### Writing Evaluation Lifecycle

```
pending → processing → completed
                    → failed (→ pending on retry)
```

### Pronunciation Score Lifecycle

```
pending → processing → completed
                    → failed (→ pending on retry)
```

### Exam Attempt Lifecycle

```
in_progress → completed (score calculated, passed/failed set)
           → abandoned (if not completed within session timeout)
```

### Conversation Session Lifecycle

```
active → completed (user ends conversation)
      → evaluated (post-conversation AI evaluation received)
```
