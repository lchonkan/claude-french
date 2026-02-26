-- Migration 007: Vocabulary progress (SRS tracking)

CREATE TABLE vocabulary_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  vocabulary_item_id UUID NOT NULL REFERENCES vocabulary_items(id),
  fsrs_stability FLOAT NOT NULL DEFAULT 0,
  fsrs_difficulty FLOAT NOT NULL DEFAULT 0,
  fsrs_due_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  fsrs_interval FLOAT NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  last_review_rating SMALLINT,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, vocabulary_item_id)
);

CREATE INDEX idx_vocab_progress_user_due ON vocabulary_progress(user_id, fsrs_due_date);
CREATE INDEX idx_vocab_progress_item ON vocabulary_progress(vocabulary_item_id);

ALTER TABLE vocabulary_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON vocabulary_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress"
  ON vocabulary_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress"
  ON vocabulary_progress FOR UPDATE USING (auth.uid() = user_id);
