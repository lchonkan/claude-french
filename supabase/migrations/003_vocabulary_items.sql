-- Migration 003: Vocabulary items with pgvector

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE vocabulary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  french_text VARCHAR(200) NOT NULL UNIQUE,
  spanish_translation VARCHAR(200) NOT NULL,
  example_sentence_fr TEXT NOT NULL,
  example_sentence_es TEXT NOT NULL,
  audio_url TEXT,
  phonetic_ipa VARCHAR(100),
  difficulty_score SMALLINT NOT NULL CHECK (difficulty_score BETWEEN 1 AND 5),
  cefr_level cefr_level_enum NOT NULL,
  tags TEXT[] DEFAULT '{}',
  embedding vector(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vocab_cefr ON vocabulary_items(cefr_level);
CREATE INDEX idx_vocab_embedding ON vocabulary_items
  USING hnsw (embedding vector_cosine_ops);

-- Read-only for authenticated users
ALTER TABLE vocabulary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read vocabulary"
  ON vocabulary_items FOR SELECT
  TO authenticated
  USING (true);
