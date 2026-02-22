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

## Repository Status
- GitHub repo:
  - `https://github.com/AhmediHarhash/datascrap`
- Phase 2 local changes include:
  - `services/control-api/src/routes/auth.js`
  - `services/control-api/src/routes/license.js`
  - `services/control-api/src/routes/devices.js`
  - `services/control-api/src/db/migrations.js`
  - `services/control-api/migrations/0001_control_plane_core.sql`
  - `services/control-api/scripts/migrate.js`
  - `.env.example`
  - `infra/railway/control-api.env.example`

## Current Local Railway Link
- Project: `datascrap-control-plane`
- Environment: `staging`
- Service: `control-api`

## Next Phase Focus (Hardening)
1) Strict CORS allowlist for extension/dashboard origins.
2) Auth/license rate limiting.
3) Idempotency keys on mutating operations.
4) Backup/restore drill and alerting setup.
