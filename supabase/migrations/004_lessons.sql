-- Migration 004: Lessons and exercises

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module module_enum NOT NULL,
  cefr_level cefr_level_enum NOT NULL,
  title_es VARCHAR(200) NOT NULL,
  title_fr VARCHAR(200) NOT NULL,
  description_es TEXT,
  content JSONB NOT NULL,
  order_index INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module, cefr_level, order_index)
);

CREATE INDEX idx_lessons_module_level ON lessons(module, cefr_level, order_index);

CREATE TRIGGER lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE lesson_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  exercise_type exercise_type_enum NOT NULL,
  prompt_es TEXT NOT NULL,
  content JSONB NOT NULL,
  difficulty_tier SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty_tier BETWEEN 1 AND 3),
  order_index INTEGER NOT NULL
);

CREATE INDEX idx_exercises_lesson ON lesson_exercises(lesson_id, order_index);

-- Read-only for authenticated users
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read lessons"
  ON lessons FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read exercises"
  ON lesson_exercises FOR SELECT
  TO authenticated
  USING (true);
