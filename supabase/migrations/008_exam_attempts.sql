-- Migration 008: Exam attempts for placement tests and CEFR exit exams

CREATE TABLE exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  exam_type exam_type_enum NOT NULL,
  cefr_level cefr_level_enum NOT NULL,
  score FLOAT CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  passed BOOLEAN,
  skill_breakdown JSONB NOT NULL DEFAULT '{}',
  answers JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Composite index for efficient querying of user exam history by type and level
CREATE INDEX idx_exam_attempts_user_type_level
  ON exam_attempts(user_id, exam_type, cefr_level);

-- Index for filtering by status (e.g. finding in-progress attempts)
CREATE INDEX idx_exam_attempts_status
  ON exam_attempts(user_id, status);

-- Timestamp index for ordering history
CREATE INDEX idx_exam_attempts_started
  ON exam_attempts(user_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exam attempts"
  ON exam_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exam attempts"
  ON exam_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exam attempts"
  ON exam_attempts FOR UPDATE
  USING (auth.uid() = user_id);
