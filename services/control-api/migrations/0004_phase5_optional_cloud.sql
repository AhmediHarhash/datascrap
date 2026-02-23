CREATE TABLE IF NOT EXISTS account_cloud_policies (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  cloud_features_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  webhook_delivery_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_only_enforced BOOLEAN NOT NULL DEFAULT TRUE,
  consent_version TEXT,
  consent_text TEXT,
  opted_in_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_secrets (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  secret_name TEXT NOT NULL,
  label TEXT,
  encrypted_payload JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, provider, secret_name)
);

CREATE INDEX IF NOT EXISTS idx_integration_secrets_account_provider
  ON integration_secrets(account_id, provider);

CREATE TABLE IF NOT EXISTS cloud_jobs (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json JSONB,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_cloud_jobs_status
    CHECK (status IN ('queued', 'running', 'retrying', 'succeeded', 'failed', 'dead_letter', 'canceled')),
  CONSTRAINT chk_cloud_jobs_attempts CHECK (attempts >= 0),
  CONSTRAINT chk_cloud_jobs_max_attempts CHECK (max_attempts >= 1)
);

CREATE INDEX IF NOT EXISTS idx_cloud_jobs_status_next_run_at
  ON cloud_jobs(status, next_run_at ASC);

CREATE INDEX IF NOT EXISTS idx_cloud_jobs_account_created_at
  ON cloud_jobs(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cloud_jobs_locked_at
  ON cloud_jobs(locked_at);

CREATE TABLE IF NOT EXISTS cloud_job_dead_letters (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES cloud_jobs(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reason_code TEXT NOT NULL,
  reason_message TEXT,
  payload_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_job_dead_letters_job_id
  ON cloud_job_dead_letters(job_id);

CREATE INDEX IF NOT EXISTS idx_cloud_job_dead_letters_account_created_at
  ON cloud_job_dead_letters(account_id, created_at DESC);
