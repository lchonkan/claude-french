-- Migration 011: Writing evaluations table for CEFR-aligned writing practice

CREATE TABLE writing_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  cefr_level cefr_level_enum NOT NULL,
  prompt_text TEXT NOT NULL,
  submitted_text TEXT NOT NULL,
  grammar_score FLOAT CHECK (grammar_score >= 0 AND grammar_score <= 1),
  vocabulary_score FLOAT CHECK (vocabulary_score >= 0 AND vocabulary_score <= 1),
  coherence_score FLOAT CHECK (coherence_score >= 0 AND coherence_score <= 1),
  task_completion_score FLOAT CHECK (task_completion_score >= 0 AND task_completion_score <= 1),
  overall_cefr_score cefr_level_enum,
  feedback_es TEXT,
  evaluation_json JSONB,
  status eval_status_enum NOT NULL DEFAULT 'pending',
  ai_platform ai_platform_enum,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for efficient listing of user evaluations ordered by recency
CREATE INDEX idx_writing_evaluations_user_created
  ON writing_evaluations (user_id, created_at DESC);

-- Partial index for pending evaluations (worker polling)
CREATE INDEX idx_writing_evaluations_pending
  ON writing_evaluations (status)
  WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE writing_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own writing evaluations
CREATE POLICY "Users can view own writing evaluations"
  ON writing_evaluations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own writing evaluations"
  ON writing_evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own writing evaluations"
  ON writing_evaluations FOR UPDATE
  USING (auth.uid() = user_id);
