CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY,
  scope_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (scope_key, operation, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

