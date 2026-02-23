# Railway Live Status (2026-02-22)

## Project
- Name: `datascrap-control-plane`
- Project ID: `2ed9ceb9-3159-4067-84c6-53f1ac83902e`

## Environments
- `staging`
  - ID: `15d3f955-cf55-4e91-b7d0-75842db2810b`
- `production`
  - ID: `e4020a32-4f31-4b19-8a84-ff17a2c58db8`

## Services
1) `Postgres`
- Provisioned and healthy in staging and production.
- Phase 2 migration `0001_control_plane_core.sql` applied in both environments.
- Phase 3 migration `0002_idempotency_keys.sql` applied in both environments.
- Phase 4 migration `0003_perf_indexes.sql` applied in both environments.
- Phase 5 migration `0004_phase5_optional_cloud.sql` applied in both environments.

2) `control-api`
- Service ID: `955c58a3-9816-41d7-a963-68c6bcfe024a`
- Runtime env vars set in staging and production:
  - `NODE_ENV=production`
  - `APP_VERSION=0.1.0`
  - `REQUIRE_DB=true`
  - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
  - `JWT_ACCESS_SECRET` (unique per env)
  - `JWT_ISSUER=datascrap-control-api`
  - `ACCESS_TOKEN_TTL_SECONDS=900`
  - `REFRESH_TOKEN_TTL_DAYS=30`
  - `DEFAULT_MAX_DEVICES=2`
  - `CORS_STRICT=true`
  - `CORS_ALLOWED_ORIGIN_PREFIXES=chrome-extension://`
  - `RATE_LIMIT_*` policy values set
  - `IDEMPOTENCY_TTL_HOURS=24`
  - `ENABLE_METRICS_ENDPOINT=true`
  - `METRICS_WINDOW_MINUTES=60`
  - `METRICS_MAX_SAMPLES=20000`
  - `OBSERVABILITY_API_KEY` configured per environment
  - `ENABLE_OPTIONAL_CLOUD_FEATURES=true`
  - `OPT_IN_POLICY_VERSION=2026-02-23`
  - `MAX_METADATA_PAYLOAD_BYTES=32768`
  - `VAULT_MASTER_KEY` configured per environment
  - `VAULT_REQUIRE_KEY=true`

3) `jobs-worker`
- Service ID: `3d63782a-a51e-4127-9fc8-0b286834c18b`
- Dedicated background worker deployment for optional cloud jobs.
- Runtime mode:
  - `CONTROL_API_RUNTIME_MODE=jobs-worker`
- Queue/vault env vars set in staging and production:
  - `ENABLE_OPTIONAL_CLOUD_FEATURES=true`
  - `DATABASE_URL=${{Postgres.DATABASE_URL}}` (env-specific internal URL set)
  - `JOB_*` policy variables set
  - `VAULT_MASTER_KEY` configured per environment
  - `VAULT_REQUIRE_KEY=true`

## Public Domains
- Staging:
  - `https://control-api-staging-98c0.up.railway.app`
- Production:
  - `https://control-api-production-e750.up.railway.app`

## Verification
- Staging:
  - `GET /healthz` -> `200`
  - `GET /readyz` -> `200` (`db reachable`)
  - `GET /api/config` -> `200`
  - CORS checks:
    - disallowed web origin -> `403`
    - extension-style origin (`chrome-extension://...`) -> `200`
  - Observability:
    - `GET /api/observability/slo` -> `200` (with `X-Observability-Key`)
    - `GET /api/observability/dashboard` -> `200` (with `X-Observability-Key`)
    - `GET /api/observability/rate-limits` -> `200` (with `X-Observability-Key`)
    - `GET /api/observability/jobs` -> `200` (with `X-Observability-Key`)
    - `GET /api/observability/errors/recent` -> `200` (with `X-Observability-Key`)
    - `GET /metrics` -> `200` (with `X-Observability-Key`)
  - Idempotency checks:
    - `POST /api/license/register` replay returns `Idempotent-Replay: true`
    - `POST /api/devices/rename` replay returns `Idempotent-Replay: true`
  - End-to-end flow passed:
    - register
    - login with device binding
    - `GET /api/auth/me`
    - license register/status
    - device validate/list
    - token refresh/logout
- Production:
  - `GET /healthz` -> `200`
  - `GET /readyz` -> `200` (`db reachable`)
  - `GET /api/config` -> `200`
  - CORS checks:
    - disallowed web origin -> `403`
    - extension-style origin -> `200`
  - Observability:
    - `GET /api/observability/slo` -> `200` (with `X-Observability-Key`)
    - `GET /api/observability/dashboard` -> `200` (with `X-Observability-Key`)
    - `GET /api/observability/rate-limits` -> `200` (with `X-Observability-Key`)
    - `GET /api/observability/jobs` -> `200` (with `X-Observability-Key`)
    - `GET /api/observability/errors/recent` -> `200` (with `X-Observability-Key`)
    - `GET /metrics` -> `200` (with `X-Observability-Key`)
  - Auth/license check:
    - register/login successful
    - license register replay returns `Idempotent-Replay: true`

## Phase 5 Live Validation
- Staging smoke run:
  - command: `npm run phase5:smoke:control-api`
  - result: success (`jobId=72861f2e-c0c0-43bc-bd81-4369c2bc4bcc`)
  - account: `1fcdfafb-eb39-42ba-bdf3-b634c3c62523`
- Worker execution proof (staging `jobs-worker` logs):
  - `jobs.worker.claimed` for smoke job id
  - `jobs.worker.succeeded` for smoke job id

## Repository Status
- GitHub repo:
  - `https://github.com/AhmediHarhash/datascrap`
- Phase 2/3/4/5 local changes include:
  - `services/control-api/src/routes/auth.js`
  - `services/control-api/src/routes/license.js`
  - `services/control-api/src/routes/devices.js`
  - `services/control-api/src/db/migrations.js`
  - `services/control-api/migrations/0001_control_plane_core.sql`
  - `services/control-api/migrations/0002_idempotency_keys.sql`
  - `services/control-api/migrations/0003_perf_indexes.sql`
  - `services/control-api/src/middleware/cors.js`
  - `services/control-api/src/middleware/rate-limit.js`
  - `services/control-api/src/middleware/request.js`
  - `services/control-api/src/services/idempotency.js`
  - `services/control-api/src/utils/logger.js`
  - `services/control-api/src/services/metrics.js`
  - `services/control-api/src/services/error-tracker.js`
  - `services/control-api/src/services/cache.js`
  - `services/control-api/src/services/error-store.js`
  - `services/control-api/src/services/cloud-policy.js`
  - `services/control-api/src/services/metadata-policy.js`
  - `services/control-api/src/services/integration-vault.js`
  - `services/control-api/src/services/jobs.js`
  - `services/control-api/src/services/job-processor.js`
  - `services/control-api/src/routes/observability.js`
  - `services/control-api/src/routes/data-handling.js`
  - `services/control-api/src/routes/integrations.js`
  - `services/control-api/src/routes/jobs.js`
  - `services/control-api/src/middleware/optional-cloud.js`
  - `services/control-api/src/utils/security.js` (JWT keyring rotation support)
  - `services/control-api/src/config.js` (JWT keyring config)
  - `services/control-api/migrations/0004_phase5_optional_cloud.sql`
  - `.github/workflows/uptime-monitor.yml`
  - `.github/workflows/slo-monitor.yml`
  - `.github/workflows/cost-monitor.yml`
  - `.github/workflows/backup-verify.yml`
  - `.github/workflows/job-queue-monitor.yml`
  - `services/control-api/scripts/uptime-monitor.js`
  - `services/control-api/scripts/slo-monitor.js`
  - `services/control-api/scripts/cost-monitor.js`
  - `services/control-api/scripts/backup-verify.js`
  - `services/control-api/scripts/jobs-worker.js`
  - `services/control-api/scripts/job-queue-monitor.js`
  - `services/control-api/scripts/phase5-smoke.js`
  - `services/control-api/scripts/start-runtime.js`
  - `services/control-api/scripts/chaos-check.js`
  - `services/control-api/scripts/generate-jwt-secret.js`
  - `services/control-api/scripts/migrate.js`
  - `.env.example`
  - `infra/railway/control-api.env.example`

## Current Local Railway Link
- Project: `datascrap-control-plane`
- Environment: `staging`
- Service: `control-api`

## Next Phase Focus
1) Observe queue depth/dead-letter trends and tune `JOB_*` policy thresholds.
2) Add scheduling and n8n/webhook UX from extension side to drive the Phase 5 APIs.
3) Keep optional cloud feature usage behind explicit account opt-in policy.
4) Validate first billing cycle impact of worker traffic before raising concurrency.

## GitHub Automation
- Workflow committed:
  - `.github/workflows/uptime-monitor.yml`
  - `.github/workflows/slo-monitor.yml`
  - `.github/workflows/cost-monitor.yml`
  - `.github/workflows/backup-verify.yml`
  - `.github/workflows/job-queue-monitor.yml`
- Repo variable configured:
  - `UPTIME_URLS=https://control-api-staging-98c0.up.railway.app/healthz,https://control-api-production-e750.up.railway.app/healthz`
  - `OBSERVABILITY_URL_STAGING=https://control-api-staging-98c0.up.railway.app`
  - `OBSERVABILITY_URL_PRODUCTION=https://control-api-production-e750.up.railway.app`
  - SLO thresholds (`MAX_*`, `MIN_*`) configured for workflow defaults
  - cost thresholds and budget vars (`MONTHLY_BUDGET_USD`, `MONTH_TO_DATE_COST_USD`, `COST_*`, `DAILY_COST_SERIES_USD`)
  - backup verification vars (`MIN_BACKUP_BYTES`, `MIN_BACKUP_ENTRIES`)
  - queue monitor thresholds (`MAX_DUE_JOBS`, `MAX_DEAD_LETTER_JOBS`)
- Failure fallback enabled:
  - workflow auto-creates/updates issue `Uptime Monitor Incident`
  - workflow auto-creates/updates issue `SLO Monitor Incident`
  - workflow auto-creates/updates issue `Cost Monitor Incident`
  - workflow auto-creates/updates issue `Backup Verification Incident`
  - workflow auto-creates/updates issue `Job Queue Monitor Incident`
- Repo secrets configured:
  - `OBSERVABILITY_KEY_STAGING`
  - `OBSERVABILITY_KEY_PRODUCTION`
  - `BACKUP_DATABASE_URL_STAGING`
  - `BACKUP_DATABASE_URL_PRODUCTION`
- Optional additional secrets:
  - `ALERT_WEBHOOK_URL`
  - `ALERT_WEBHOOK_BEARER_TOKEN`

## Error Tracking
- API endpoint available:
  - `GET /api/observability/errors/recent` (protected by `X-Observability-Key`)
- Dashboard endpoint available:
  - `GET /api/observability/dashboard` (protected by `X-Observability-Key`)
- Errors logged through `logError(...)` are retained in bounded in-memory buffer for fast triage.

## Ops Hardening Notes (2026-02-23)
- JWT access token rotation is now no-downtime capable with `JWT_ACCESS_SECRETS` + `JWT_ACTIVE_KID`.
- Daily backup verification workflow is committed, scheduled, and verified.
  - successful run id: `22289261523`
  - both jobs (`verify-staging`, `verify-production`) passed.
- Staging chaos drill completed without data loss.
  - control-api redeploy id: `45e51365-b59e-4b70-97f6-b8da96080233`
  - Postgres redeploy id: `3f764566-3912-4830-a89d-0d2d87c8a6fb`
  - continuity preserved for account `a4f827e3-97d0-4149-885a-7dd86729c525`.

## Phase 5 Notes (2026-02-23)
- Optional cloud features are enabled in staging and production with explicit opt-in enforcement.
- Integration secrets are encrypted at rest using per-environment `VAULT_MASTER_KEY`.
- Jobs are processed by dedicated `jobs-worker` service, isolated from `control-api` request path.
