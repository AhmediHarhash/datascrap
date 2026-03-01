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
- `GET /api/schedules` (Bearer token)
- `POST /api/schedules/create` (Bearer token)
- `POST /api/schedules/update` (Bearer token)
- `POST /api/schedules/toggle` (Bearer token)
- `POST /api/schedules/remove` (Bearer token)
- `POST /api/schedules/run-now` (Bearer token)
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

## Phase 5 Schedule Smoke Script

```bash
node services/control-api/scripts/phase5-schedule-smoke.js
```

Environment variables:
- `API_BASE_URL`
- `SCHEDULE_SMOKE_EMAIL` / `SCHEDULE_SMOKE_PASSWORD`
- `SCHEDULE_SMOKE_DEVICE_ID`
- `SCHEDULE_SMOKE_WEBHOOK_URL`

## Job Queue Monitor Script

```bash
node services/control-api/scripts/job-queue-monitor.js
```

Environment variables:
- `OBSERVABILITY_URL_STAGING` / `OBSERVABILITY_URL_PRODUCTION`
- `OBSERVABILITY_KEY_STAGING` / `OBSERVABILITY_KEY_PRODUCTION`
- `MAX_DUE_JOBS` (default `200`)
- `MAX_DEAD_LETTER_JOBS` (default `3`)
- `MAX_DUE_SCHEDULES` (default `200`)
- `ALERT_WEBHOOK_URL` / `ALERT_WEBHOOK_BEARER_TOKEN` (optional)

## Schedule Hygiene Script (Queue Noise Control)

```bash
node services/control-api/scripts/schedule-hygiene.js --action=list --active-only=true --limit=100
```

Pause active schedules (dry-run by default):

```bash
node services/control-api/scripts/schedule-hygiene.js --action=pause --active-only=true --limit=100
```

Apply pause changes:

```bash
node services/control-api/scripts/schedule-hygiene.js --action=pause --active-only=true --limit=100 --apply
```

Monitor-only quick variants:
- list only monitor schedules:
  - `npm run queue:hygiene:list:monitor:control-api`
- pause only monitor schedules (dry-run):
  - `npm run queue:hygiene:pause:monitor:dry-run:control-api`
- pause only monitor schedules (apply):
  - `npm run queue:hygiene:pause:monitor:apply:control-api`

Frequent-schedule quick variants (interval schedules `<= 60` min):
- list frequent interval schedules:
  - `npm run queue:hygiene:list:frequent:control-api`
- pause frequent interval schedules (dry-run):
  - `npm run queue:hygiene:pause:frequent:dry-run:control-api`
- pause frequent interval schedules (apply):
  - `npm run queue:hygiene:pause:frequent:apply:control-api`

Duplicate-schedule quick variants (keep oldest schedule per duplicate signature):
- list duplicate schedules:
  - `npm run queue:hygiene:list:duplicates:control-api`
- pause duplicate schedules (dry-run):
  - `npm run queue:hygiene:pause:duplicates:dry-run:control-api`
- pause duplicate schedules (apply):
  - `npm run queue:hygiene:pause:duplicates:apply:control-api`

Near-duplicate quick variants (target-focused signature):
- list near-duplicate schedules:
  - `npm run queue:hygiene:list:near-duplicates:control-api`
- list near-duplicate schedules + write JSON report:
  - `npm run queue:hygiene:list:near-duplicates:report:control-api`
- list near-duplicate schedules + write dated JSON report:
  - `npm run queue:hygiene:list:near-duplicates:report:dated:control-api`
- list near-duplicate schedules + write dated redacted JSON report:
  - `npm run queue:hygiene:list:near-duplicates:report:redacted:control-api`
- list near-duplicate schedules older than 180 minutes:
  - `npm run queue:hygiene:list:near-duplicates:stale:control-api`
- list near-duplicate schedules older than 180 minutes across all pages:
  - `npm run queue:hygiene:list:near-duplicates:stale:scan-all:control-api`
- list near-duplicate schedules older than 180 minutes across all pages + write reusable checkpoint:
  - `npm run queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:control-api`
- list near-duplicate schedules older than 180 minutes + write lightweight checkpoint sidecar only:
  - `npm run queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:sidecar:control-api`
- list near-duplicate schedules older than 180 minutes with uncapped operator limit (runs until exhausted or hard safety cap):
  - `npm run queue:hygiene:list:near-duplicates:stale:scan-all:uncapped:control-api`
- list near-duplicate schedules older than 180 minutes with auto-continue segments:
  - `npm run queue:hygiene:list:near-duplicates:stale:scan-all:autocontinue:control-api`
- pause near-duplicate schedules (dry-run):
  - `npm run queue:hygiene:pause:near-duplicates:dry-run:control-api`
- pause near-duplicate schedules (apply):
  - `npm run queue:hygiene:pause:near-duplicates:apply:control-api`

Force-apply variants (override pause guardrail when intentional):
- pause all matched schedules (apply + force):
  - `npm run queue:hygiene:pause:apply:force:control-api`
- pause duplicate schedules (apply + force):
  - `npm run queue:hygiene:pause:duplicates:force:control-api`
- pause near-duplicate schedules (apply + force):
  - `npm run queue:hygiene:pause:near-duplicates:force:control-api`

Batched force-apply variants (chunked execution):
- pause all matched schedules (batched):
  - `npm run queue:hygiene:pause:apply:batched:control-api`
- pause duplicate schedules (batched):
  - `npm run queue:hygiene:pause:duplicates:batched:control-api`
- pause near-duplicate schedules (batched):
  - `npm run queue:hygiene:pause:near-duplicates:batched:control-api`
- pause near-duplicate schedules (batched + JSON report):
  - `npm run queue:hygiene:pause:near-duplicates:batched:report:control-api`
- pause near-duplicate schedules (batched + dated JSON report):
  - `npm run queue:hygiene:pause:near-duplicates:batched:report:dated:control-api`
- pause near-duplicate schedules (batched + dated redacted JSON report):
  - `npm run queue:hygiene:pause:near-duplicates:batched:report:redacted:control-api`
- pause near-duplicate schedules older than 180 minutes (dry-run):
  - `npm run queue:hygiene:pause:near-duplicates:stale:dry-run:control-api`
- pause near-duplicate schedules older than 180 minutes (batched + dated redacted JSON report):
  - `npm run queue:hygiene:pause:near-duplicates:stale:batched:report:redacted:control-api`
- pause near-duplicate schedules older than 180 minutes (resilient retries + dated redacted JSON report):
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:report:redacted:control-api`
- pause near-duplicate schedules older than 180 minutes across all pages (resilient retries + dated redacted JSON report):
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:report:redacted:control-api`
- pause near-duplicate schedules older than 180 minutes with checkpoint auto-resume orchestration (resilient retries + dated redacted JSON report):
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api`
- pause near-duplicate schedules older than 180 minutes with checkpoint auto-resume freshness guard:
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api`
- pause near-duplicate schedules from prior checkpoint (resilient retries + dated redacted JSON report):
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api`
- pause near-duplicate schedules from prior checkpoint and force restart when checkpoint is exhausted:
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:restart:report:redacted:control-api`
- pause near-duplicate schedules from prior checkpoint with strict resume cursor requirement:
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:strict:report:redacted:control-api`

Filter examples:
- `--job-type=monitor.page.diff`
- `--name-contains=daily`
- `--interval-lte=60`
- `--scan-all=true`
- `--scan-max-pages=200`
- `--scan-max-pages=0`
- `--scan-hard-max-pages=5000`
- `--scan-auto-continue=true`
- `--scan-auto-continue-max-segments=20`
- `--scan-start-cursor-created-at=2026-02-25T10:11:12.000Z`
- `--scan-start-cursor-id=11111111-1111-1111-1111-111111111111`
- `--scan-resume-file=dist/ops/queue-hygiene-near-duplicates-stale-scan.cursor.json`
- `--scan-resume-from-checkpoint=true`
- `--scan-resume-validate-api-base=true`
- `--scan-resume-require-api-base=true`
- `--scan-resume-api-base-missing-behavior=error`
- `--scan-resume-api-base-mismatch-behavior=error`
- `--scan-resume-validate-kind=true`
- `--scan-resume-kind-mismatch-behavior=error`
- `--scan-resume-validate-schema-version=true`
- `--scan-resume-schema-version-mismatch-behavior=restart`
- `--scan-resume-generated-at-source=payload-or-file-mtime`
- `--scan-resume-sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
- `--scan-resume-max-bytes=1048576`
- `--scan-resume-size-behavior=restart`
- `--scan-resume-hash-behavior=restart`
- `--scan-resume-max-future-minutes=60`
- `--scan-resume-future-behavior=restart`
- `--scan-resume-validate-filters=true`
- `--scan-resume-filter-mismatch-behavior=restart`
- `--scan-resume-max-age-minutes=720`
- `--scan-resume-stale-behavior=restart`
- `--scan-resume-allow-exhausted=true`
- `--scan-resume-exhausted-behavior=noop`
- `--scan-checkpoint-file=dist/ops/queue-hygiene-near-duplicates-stale-scan.cursor.json`
- `--scan-checkpoint-every-pages=1`
- `--list-retry-count=3`
- `--list-retry-delay-ms=500`
- `--list-retry-backoff-factor=1.5`
- `--list-retry-jitter-ms=100`
- `--list-request-timeout-ms=15000`
- `--duplicates-only=true`
- `--dedupe-keep=newest`
- `--signature-mode=target`
- `--max-pause=50`
- `--force-pause-over-limit=true`
- `--pause-batch-size=20`
- `--pause-batch-delay-ms=250`
- `--continue-on-pause-error=false`
- `--pause-retry-count=3`
- `--pause-retry-delay-ms=500`
- `--pause-retry-backoff-factor=1.5`
- `--pause-retry-jitter-ms=100`
- `--pause-request-timeout-ms=15000`
- `--output-file=dist/ops/queue-hygiene.json`
- `--output-compact=true`
- `--output-timestamp=true`
- `--output-overwrite=false`
- `--redact-signatures=true`
- output/checkpoint artifacts are written atomically (temp-file + rename) to reduce partial JSON files during interruptions
- `--min-age-minutes=180`

Auth/environment:
- `CONTROL_API_BEARER_TOKEN` (or `--token=<jwt>`)
- `API_BASE_URL` (default `http://127.0.0.1:3000`)
- optional auto-login fallback when token is not provided:
  - `CONTROL_API_EMAIL` (or `--email=<email>`)
  - `CONTROL_API_PASSWORD` (or `--password=<password>`)
  - optional `CONTROL_API_DEVICE_ID` / `CONTROL_API_DEVICE_NAME`
  - optional `CONTROL_API_REGISTER_IF_MISSING=true` (or `--register-if-missing=true`)
- optional duplicate-mode defaults:
  - `CONTROL_API_SCHEDULE_HYGIENE_DUPLICATES_ONLY=true`
  - `CONTROL_API_SCHEDULE_HYGIENE_DEDUPE_KEEP=oldest|newest`
  - `CONTROL_API_SCHEDULE_HYGIENE_SIGNATURE_MODE=strict|target`
- pause guardrail defaults:
  - `CONTROL_API_SCHEDULE_HYGIENE_MAX_PAUSE=25`
  - `CONTROL_API_SCHEDULE_HYGIENE_FORCE_PAUSE_OVER_LIMIT=false`
- pause batching defaults:
  - `CONTROL_API_SCHEDULE_HYGIENE_PAUSE_BATCH_SIZE=20`
  - `CONTROL_API_SCHEDULE_HYGIENE_PAUSE_BATCH_DELAY_MS=0`
  - `CONTROL_API_SCHEDULE_HYGIENE_CONTINUE_ON_PAUSE_ERROR=true`
- pause retry defaults:
  - `CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_COUNT=1`
  - `CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_DELAY_MS=250`
  - `CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_BACKOFF_FACTOR=1.5`
  - `CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_JITTER_MS=100`
  - `CONTROL_API_SCHEDULE_HYGIENE_PAUSE_REQUEST_TIMEOUT_MS=15000`
- scan-all defaults:
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_ALL=false`
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_MAX_PAGES=100`
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_HARD_MAX_PAGES=5000`
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_AUTO_CONTINUE=false`
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_AUTO_CONTINUE_MAX_SEGMENTS=20`
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_START_CURSOR_CREATED_AT` (optional)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_START_CURSOR_ID` (optional)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FILE` (optional)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FROM_CHECKPOINT=true`
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_API_BASE=true`
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_REQUIRE_API_BASE=false`
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_API_BASE_MISSING_BEHAVIOR=restart` (`restart|error`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_API_BASE_MISMATCH_BEHAVIOR=error` (`error|restart`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_KIND=true`
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_KIND_MISMATCH_BEHAVIOR=error` (`error|restart`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_SCHEMA_VERSION=true`
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SCHEMA_VERSION_MISMATCH_BEHAVIOR=restart` (`restart|error`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_GENERATED_AT_SOURCE=payload-or-file-mtime` (`payload|file-mtime|payload-or-file-mtime`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SHA256` (optional expected checkpoint hash)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_BYTES=0` (disabled when `0`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SIZE_BEHAVIOR=restart` (`restart|error`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_HASH_BEHAVIOR=restart` (`restart|error`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_FUTURE_MINUTES=0` (disabled when `0`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FUTURE_BEHAVIOR=restart` (`restart|error`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_FILTERS=true`
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FILTER_MISMATCH_BEHAVIOR=restart` (`restart|error`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_AGE_MINUTES=0` (disabled when `0`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_STALE_BEHAVIOR=restart` (`restart|error`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_ALLOW_EXHAUSTED=true`
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_EXHAUSTED_BEHAVIOR=noop` (`noop|restart`)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_CHECKPOINT_FILE` (optional)
  - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_CHECKPOINT_EVERY_PAGES=1`
- list retry defaults:
  - `CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_COUNT=1`
  - `CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_DELAY_MS=250`
  - `CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_BACKOFF_FACTOR=1.5`
  - `CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_JITTER_MS=100`
  - `CONTROL_API_SCHEDULE_HYGIENE_LIST_REQUEST_TIMEOUT_MS=15000`
- report output defaults:
  - `CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_FILE` (optional file path)
  - `CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_COMPACT=false`
  - `CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_TIMESTAMP=false`
  - `CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_OVERWRITE=true`
  - `CONTROL_API_SCHEDULE_HYGIENE_REDACT_SIGNATURES=false`
- age safety default:
  - `CONTROL_API_SCHEDULE_HYGIENE_MIN_AGE_MINUTES=0`

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
- Scheduler supports:
  - `interval` schedules (`intervalMinutes`)
  - `cron` schedules (`cronExpr`, 5-field expression) with `timezone`

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

- Migration `0005_phase5_scheduler.sql` can be reverted safely with:

```sql
DROP TABLE IF EXISTS cloud_schedules;
```
