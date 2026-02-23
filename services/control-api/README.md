# Control API

Minimal control-plane bootstrap service for Datascrap.

## Local Run

```bash
npm install
npm run migrate:control-api
npm run start:control-api
```

## Endpoints

- `GET /healthz`
- `GET /readyz`
- `GET /api/config`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me` (Bearer token)
- `POST /api/license/register` (Bearer token)
- `GET /api/license/status` (Bearer token)
- `POST /api/devices/validate-devices`
- `POST /api/devices`
- `POST /api/devices/remove`
- `POST /api/devices/rename`
- `GET /api/data-handling/policy` (Bearer token)
- `POST /api/data-handling/policy` (Bearer token)
- `GET /api/integrations/secrets` (Bearer token)
- `POST /api/integrations/secrets/upsert` (Bearer token)
- `POST /api/integrations/secrets/remove` (Bearer token)
- `GET /api/jobs/policy` (Bearer token)
- `POST /api/jobs/enqueue` (Bearer token)
- `GET /api/jobs` (Bearer token)
- `GET /api/jobs/dead-letter` (Bearer token)
- `POST /api/jobs/cancel` (Bearer token)
- `GET /api/observability/slo`
- `GET /api/observability/dashboard`
- `GET /api/observability/errors/recent`
- `GET /api/observability/rate-limits`
- `GET /api/observability/jobs`
- `GET /metrics`

## Smoke Test

```bash
npm run smoke:control-api
```

## Uptime Monitor Script

```bash
node services/control-api/scripts/uptime-monitor.js
```

Environment variables:
- `UPTIME_URLS` (comma-separated, defaults to staging+production `healthz`)
- `ALERT_WEBHOOK_URL` (optional)
- `ALERT_WEBHOOK_BEARER_TOKEN` (optional)

## SLO Monitor Script

```bash
node services/control-api/scripts/slo-monitor.js
```

Environment variables:
- `OBSERVABILITY_URL_STAGING` / `OBSERVABILITY_URL_PRODUCTION` (optional)
- `OBSERVABILITY_KEY_STAGING` / `OBSERVABILITY_KEY_PRODUCTION`
- `MAX_WINDOW_5XX_RATE_PERCENT` (default `2`)
- `MAX_AUTH_P95_MS` (default `600`)
- `MAX_LICENSE_P95_MS` (default `600`)

## Cost Monitor Script

```bash
node services/control-api/scripts/cost-monitor.js
```

Environment variables:
- `MONTHLY_BUDGET_USD`
- `MONTH_TO_DATE_COST_USD`
- `COST_ALERT_THRESHOLD_PERCENT` (default `80`)
- `COST_HARD_CAP_PERCENT` (default `100`)
- `DAILY_COST_SERIES_USD` (optional comma-separated values)

## Backup Verification Script

```bash
node services/control-api/scripts/backup-verify.js
```

Environment variables:
- `BACKUP_DATABASE_URL` (or `DATABASE_URL` fallback)
- `MIN_BACKUP_BYTES` (default `10000`)
- `MIN_BACKUP_ENTRIES` (default `20`)
- `BACKUP_LABEL` (optional: `staging`/`production`)

## Chaos Check Script

```bash
node services/control-api/scripts/chaos-check.js
```

Environment variables:
- `API_BASE_URL` (default staging domain)
- `CHAOS_EMAIL` / `CHAOS_PASSWORD` (optional fixed account for repeatable drill)
- `CHAOS_DEVICE_ID` / `CHAOS_DEVICE_NAME` (optional)

## JWT Secret Generator

```bash
node services/control-api/scripts/generate-jwt-secret.js
```

Environment variables:
- `JWT_SECRET_BYTES` (default `48`)
- `JWT_NEW_KID` (optional explicit key ID)

## Jobs Worker Script

```bash
node services/control-api/scripts/jobs-worker.js
```

Environment variables:
- `ENABLE_OPTIONAL_CLOUD_FEATURES` (`true` to enable worker execution)
- `JOB_POLL_INTERVAL_MS`
- `JOB_WORKER_ID` (optional)
- `CONTROL_API_RUNTIME_MODE=jobs-worker` (when using shared `npm start` runtime wrapper)

## Phase 5 Smoke Script

```bash
node services/control-api/scripts/phase5-smoke.js
```

Environment variables:
- `API_BASE_URL`
- `SMOKE_EMAIL` / `SMOKE_PASSWORD`
- `SMOKE_DEVICE_ID`
- `SMOKE_WEBHOOK_URL`
- `SMOKE_SECRET_NAME` / `SMOKE_SECRET_VALUE`

## Job Queue Monitor Script

```bash
node services/control-api/scripts/job-queue-monitor.js
```

Environment variables:
- `OBSERVABILITY_URL_STAGING` / `OBSERVABILITY_URL_PRODUCTION`
- `OBSERVABILITY_KEY_STAGING` / `OBSERVABILITY_KEY_PRODUCTION`
- `MAX_DUE_JOBS` (default `200`)
- `MAX_DEAD_LETTER_JOBS` (default `0`)
- `ALERT_WEBHOOK_URL` / `ALERT_WEBHOOK_BEARER_TOKEN` (optional)

## Notes

- `migrate:control-api` needs `DATABASE_URL` set.
- Device limit is enforced server-side from account `max_devices` (default `2`).
- CORS can be locked down with:
  - `CORS_STRICT=true`
  - `CORS_ALLOWED_ORIGINS` (comma-separated exact origins)
  - `CORS_ALLOWED_ORIGIN_PREFIXES` (for extension origins, default `chrome-extension://`)
- Mutating `license` and `devices` endpoints support idempotency with `Idempotency-Key`.
- Request logs are structured JSON and include `X-Request-Id`.
- Observability endpoints can be protected with `OBSERVABILITY_API_KEY` using header `X-Observability-Key`.
- Optional error tracking webhook:
  - `ERROR_TRACKING_WEBHOOK_URL`
  - `ERROR_TRACKING_WEBHOOK_BEARER_TOKEN`
  - `ERROR_TRACKING_MIN_INTERVAL_SECONDS`
- Hot read paths (`/api/license/status` and `/api/devices`) use bounded in-memory cache with short TTL.
- Access tokens support no-downtime key rotation with:
  - `JWT_ACCESS_SECRETS` (CSV `kid:secret`)
  - `JWT_ACTIVE_KID`
  - legacy `JWT_ACCESS_SECRET` fallback remains supported.
- Optional cloud features are disabled by default and gated by:
  - `ENABLE_OPTIONAL_CLOUD_FEATURES=true`
- Optional cloud jobs and integrations enforce metadata-only payload checks.
- Integration secrets are encrypted at rest using `VAULT_MASTER_KEY` and AES-256-GCM.
- In production, set `VAULT_REQUIRE_KEY=true` when optional cloud features are enabled.
- Shared `npm start` supports runtime mode selection:
  - API mode (default): `CONTROL_API_RUNTIME_MODE=api`
  - worker mode: `CONTROL_API_RUNTIME_MODE=jobs-worker`

## Rollback Notes

- Migration `0002_idempotency_keys.sql` can be reverted safely with:

```sql
DROP TABLE IF EXISTS idempotency_keys;
```

- If rollback is applied, remove idempotency headers in clients or redeploy API with idempotency disabled.
- Migration `0003_perf_indexes.sql` can be reverted safely with:

```sql
DROP INDEX IF EXISTS idx_licenses_account_created_at;
DROP INDEX IF EXISTS idx_devices_account_created_at;
DROP INDEX IF EXISTS idx_devices_account_last_seen_at;
DROP INDEX IF EXISTS idx_sessions_account_revoked_expires;
DROP INDEX IF EXISTS idx_audit_events_created_at;
```

- Migration `0004_phase5_optional_cloud.sql` can be reverted safely with:

```sql
DROP TABLE IF EXISTS cloud_job_dead_letters;
DROP TABLE IF EXISTS cloud_jobs;
DROP TABLE IF EXISTS integration_secrets;
DROP TABLE IF EXISTS account_cloud_policies;
```
