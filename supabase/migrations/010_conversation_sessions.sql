-- Migration 010: Conversation sessions table for AI conversation practice

CREATE TABLE conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  cefr_level cefr_level_enum NOT NULL,
  scenario_title VARCHAR(200) NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluation_json JSONB,
  vocabulary_score FLOAT,
  grammar_score FLOAT,
  communicative_score FLOAT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for efficient listing of user sessions ordered by recency
CREATE INDEX idx_conversation_sessions_user_created
  ON conversation_sessions (user_id, created_at DESC);

-- Index for filtering by status
CREATE INDEX idx_conversation_sessions_status
  ON conversation_sessions (status)
  WHERE status = 'active';

-- Enable Row Level Security
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own conversation sessions
CREATE POLICY "Users can view own conversation sessions"
  ON conversation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation sessions"
  ON conversation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation sessions"
  ON conversation_sessions FOR UPDATE
  USING (auth.uid() = user_id);
