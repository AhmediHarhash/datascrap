CREATE TABLE IF NOT EXISTS cloud_schedules (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  schedule_kind TEXT NOT NULL,
  interval_minutes INTEGER,
  cron_expr TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  target_job_type TEXT NOT NULL,
  target_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_job_id UUID REFERENCES cloud_jobs(id) ON DELETE SET NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_cloud_schedules_kind
    CHECK (schedule_kind IN ('interval', 'cron')),
  CONSTRAINT chk_cloud_schedules_interval
    CHECK (
      (schedule_kind = 'interval' AND interval_minutes IS NOT NULL AND interval_minutes BETWEEN 1 AND 10080 AND cron_expr IS NULL)
      OR
      (schedule_kind = 'cron' AND cron_expr IS NOT NULL AND interval_minutes IS NULL)
    ),
  CONSTRAINT chk_cloud_schedules_max_attempts
    CHECK (max_attempts BETWEEN 1 AND 10)
);

CREATE INDEX IF NOT EXISTS idx_cloud_schedules_active_next_run_at
  ON cloud_schedules(is_active, next_run_at ASC);

CREATE INDEX IF NOT EXISTS idx_cloud_schedules_account_created_at
  ON cloud_schedules(account_id, created_at DESC);
