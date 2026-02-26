-- Migration 014: Cultural notes table
--
-- Stores bilingual (FR/ES) cultural content articles tied to CEFR levels
-- and categories. Each note can reference vocabulary items for SRS integration.

CREATE TABLE IF NOT EXISTS cultural_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cefr_level cefr_level_enum NOT NULL,
  title_es VARCHAR(200) NOT NULL,
  title_fr VARCHAR(200) NOT NULL,
  content_fr TEXT NOT NULL,
  content_es TEXT NOT NULL,
  vocabulary_ids UUID[] DEFAULT '{}',
  category VARCHAR(50) NOT NULL,
  is_generated BOOLEAN DEFAULT TRUE,
  reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for filtering by level and category
CREATE INDEX idx_cultural_notes_level_category
  ON cultural_notes (cefr_level, category);

-- Enable RLS
ALTER TABLE cultural_notes ENABLE ROW LEVEL SECURITY;

-- Read-only policy for authenticated users
CREATE POLICY "Authenticated users can read cultural notes"
  ON cultural_notes FOR SELECT
  TO authenticated
  USING (true);
