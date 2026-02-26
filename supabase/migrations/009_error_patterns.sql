-- Migration 009: Error patterns tracking
-- Tracks recurring grammar/vocabulary/spelling/pronunciation errors per user
-- to enable adaptive difficulty and targeted review.

CREATE TABLE error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  error_type error_type_enum NOT NULL,
  error_category VARCHAR(100) NOT NULL,
  cefr_level cefr_level_enum NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  last_occurrence_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  examples JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, error_type, error_category, cefr_level)
);

CREATE INDEX idx_error_patterns_user_type_count
  ON error_patterns(user_id, error_type, occurrence_count DESC);

CREATE TRIGGER error_patterns_updated_at
  BEFORE UPDATE ON error_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: users can only access their own error patterns
ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own error patterns"
  ON error_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own error patterns"
  ON error_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own error patterns"
  ON error_patterns FOR UPDATE
  USING (auth.uid() = user_id);
