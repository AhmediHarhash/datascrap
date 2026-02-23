CREATE INDEX IF NOT EXISTS idx_licenses_account_created_at
  ON licenses(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_devices_account_created_at
  ON devices(account_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_devices_account_last_seen_at
  ON devices(account_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_account_revoked_expires
  ON sessions(account_id, revoked_at, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at
  ON audit_events(created_at DESC);

