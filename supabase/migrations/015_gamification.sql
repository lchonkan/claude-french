-- Migration 015: Gamification tables (badges, XP transactions, daily challenges)
--
-- Three tables supporting the gamification system:
-- 1. badges - Earned achievements per user
-- 2. xp_transactions - XP award ledger
-- 3. daily_challenges - Per-user daily skill challenges

-- =========================================================================
-- 1. Badges
-- =========================================================================

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type badge_type_enum NOT NULL,
  cefr_level cefr_level_enum,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A user can earn each badge type + CEFR level combination only once
ALTER TABLE badges
  ADD CONSTRAINT badges_unique_per_user
  UNIQUE (user_id, badge_type, cefr_level);

-- Enable RLS: users can only see their own badges
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own badges"
  ON badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert badges"
  ON badges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 2. XP Transactions
-- =========================================================================

CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type activity_type_enum NOT NULL,
  xp_amount INT NOT NULL CHECK (xp_amount > 0),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying a user's recent XP history
CREATE INDEX idx_xp_transactions_user_date
  ON xp_transactions (user_id, created_at DESC);

-- Enable RLS: users can only see their own transactions
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own xp_transactions"
  ON xp_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own xp_transactions"
  ON xp_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 3. Daily Challenges
-- =========================================================================

CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  challenge_type skill_enum NOT NULL,
  challenge_config JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT FALSE,
  xp_awarded INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each user gets one challenge per day
ALTER TABLE daily_challenges
  ADD CONSTRAINT daily_challenges_unique_per_user_date
  UNIQUE (user_id, challenge_date);

-- Enable RLS: users can only see their own challenges
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily_challenges"
  ON daily_challenges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_challenges"
  ON daily_challenges FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_challenges"
  ON daily_challenges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
