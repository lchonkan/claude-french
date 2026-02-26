-- Migration 005: Skill mastery tracking

CREATE TABLE skill_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  skill skill_enum NOT NULL,
  cefr_level cefr_level_enum NOT NULL,
  mastery_percentage FLOAT NOT NULL DEFAULT 0 CHECK (mastery_percentage BETWEEN 0 AND 100),
  exercise_results JSONB NOT NULL DEFAULT '[]',
  total_exercises INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill, cefr_level)
);

CREATE INDEX idx_mastery_user_level ON skill_mastery(user_id, cefr_level);

CREATE TRIGGER skill_mastery_updated_at
  BEFORE UPDATE ON skill_mastery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE skill_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mastery"
  ON skill_mastery FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mastery"
  ON skill_mastery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mastery"
  ON skill_mastery FOR UPDATE
  USING (auth.uid() = user_id);
