CREATE TABLE IF NOT EXISTS cloud_monitor_states (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  monitor_key TEXT NOT NULL,
  target_url TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  run_count INTEGER NOT NULL DEFAULT 0,
  change_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_change_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, monitor_key),
  CONSTRAINT chk_cloud_monitor_states_run_count CHECK (run_count >= 0),
  CONSTRAINT chk_cloud_monitor_states_change_count CHECK (change_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_cloud_monitor_states_account_last_seen_at
  ON cloud_monitor_states(account_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_cloud_monitor_states_account_last_change_at
  ON cloud_monitor_states(account_id, last_change_at DESC);
