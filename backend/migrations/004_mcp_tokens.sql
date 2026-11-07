CREATE TABLE IF NOT EXISTS budgetyar_mcp_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES budgetyar_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  can_write BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS budgetyar_mcp_tokens_user_idx ON budgetyar_mcp_tokens(user_id);
