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
    - `GET /metrics` -> `200` (with `X-Observability-Key`)
  - Auth/license check:
    - register/login successful
    - license register replay returns `Idempotent-Replay: true`

## Repository Status
- GitHub repo:
  - `https://github.com/AhmediHarhash/datascrap`
- Phase 2/3 local changes include:
  - `services/control-api/src/routes/auth.js`
  - `services/control-api/src/routes/license.js`
  - `services/control-api/src/routes/devices.js`
  - `services/control-api/src/db/migrations.js`
  - `services/control-api/migrations/0001_control_plane_core.sql`
  - `services/control-api/migrations/0002_idempotency_keys.sql`
  - `services/control-api/src/middleware/cors.js`
  - `services/control-api/src/middleware/rate-limit.js`
  - `services/control-api/src/middleware/request.js`
  - `services/control-api/src/services/idempotency.js`
  - `services/control-api/src/utils/logger.js`
  - `services/control-api/src/services/metrics.js`
  - `services/control-api/src/services/error-tracker.js`
  - `services/control-api/src/routes/observability.js`
  - `.github/workflows/uptime-monitor.yml`
  - `services/control-api/scripts/uptime-monitor.js`
  - `services/control-api/scripts/migrate.js`
  - `.env.example`
  - `infra/railway/control-api.env.example`

## Current Local Railway Link
- Project: `datascrap-control-plane`
- Environment: `staging`
- Service: `control-api`

## Next Phase Focus (Observability)
1) Uptime monitor + alert wiring for `/healthz`.
2) Error tracking integration and alert routing.
3) Auth/license/device dashboards with p95 latency.
4) SLO document + alert-to-resolution runbook drill.

## GitHub Automation
- Workflow committed:
  - `.github/workflows/uptime-monitor.yml`
- Repo variable configured:
  - `UPTIME_URLS=https://control-api-staging-98c0.up.railway.app/healthz,https://control-api-production-e750.up.railway.app/healthz`
- Optional secrets to configure:
  - `ALERT_WEBHOOK_URL`
  - `ALERT_WEBHOOK_BEARER_TOKEN`
