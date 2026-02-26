-- Migration 012: Pronunciation scores table for audio evaluation results
--
-- Stores pronunciation attempts and multimodal evaluation results from the
-- 3-stage pipeline: Whisper STT -> Wav2Vec2 phoneme alignment -> Gemini
-- multimodal prosody + fluency evaluation.

CREATE TABLE pronunciation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_text TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  transcription TEXT,
  phoneme_alignment JSONB,
  phoneme_accuracy_score FLOAT CHECK (phoneme_accuracy_score IS NULL OR (phoneme_accuracy_score >= 0 AND phoneme_accuracy_score <= 1)),
  prosody_score FLOAT CHECK (prosody_score IS NULL OR (prosody_score >= 0 AND prosody_score <= 1)),
  fluency_score FLOAT CHECK (fluency_score IS NULL OR (fluency_score >= 0 AND fluency_score <= 1)),
  overall_score FLOAT CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 1)),
  improvement_suggestions JSONB,
  status eval_status_enum NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for efficient listing of user pronunciation attempts ordered by recency
CREATE INDEX idx_pronunciation_scores_user_created
  ON pronunciation_scores (user_id, created_at DESC);

-- Index for filtering pending evaluations (worker queue)
CREATE INDEX idx_pronunciation_scores_status
  ON pronunciation_scores (status)
  WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE pronunciation_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own pronunciation scores
CREATE POLICY "Users can view own pronunciation scores"
  ON pronunciation_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pronunciation scores"
  ON pronunciation_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pronunciation scores"
  ON pronunciation_scores FOR UPDATE
  USING (auth.uid() = user_id);
