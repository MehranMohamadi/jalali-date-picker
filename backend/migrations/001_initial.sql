CREATE TABLE IF NOT EXISTS budgetyar_snapshots (
  user_id TEXT PRIMARY KEY,
  version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgetyar_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS budgetyar_audit_logs_user_created_idx
  ON budgetyar_audit_logs (user_id, created_at DESC);

