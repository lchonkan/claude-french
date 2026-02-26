-- Migration 006: AI model usage logging

CREATE TABLE ai_model_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  platform ai_platform_enum NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  task_type ai_task_type_enum NOT NULL,
  latency_ms INTEGER NOT NULL,
  estimated_cost_usd DECIMAL(10, 6),
  input_tokens INTEGER,
  output_tokens INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_logs_platform_task ON ai_model_usage_logs(platform, task_type, created_at DESC);
CREATE INDEX idx_ai_logs_created ON ai_model_usage_logs(created_at DESC);
CREATE INDEX idx_ai_logs_user ON ai_model_usage_logs(user_id, created_at DESC);

-- Write via service role only; admin read
ALTER TABLE ai_model_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert logs"
  ON ai_model_usage_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read logs"
  ON ai_model_usage_logs FOR SELECT
  TO service_role
  USING (true);
