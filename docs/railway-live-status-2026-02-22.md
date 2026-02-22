# Railway Live Status (2026-02-22)

## Project
- Name: `datascrap-control-plane`
- Project ID: `2ed9ceb9-3159-4067-84c6-53f1ac83902e`

## Environments
- `staging`
  - ID: `15d3f955-cf55-4e91-b7d0-75842db2810b`
- `production`
  - pre-existing default environment in project

## Services
1) `Postgres`
- Provisioned and healthy in both staging and production.

2) `control-api`
- Service ID: `955c58a3-9816-41d7-a963-68c6bcfe024a`
- Baseline env vars set in staging and production:
  - `NODE_ENV=production`
  - `APP_VERSION=0.1.0`
  - `REQUIRE_DB=false`
  - `DATABASE_URL=${{Postgres.DATABASE_URL}}`

## Public Domains
- Staging:
  - `https://control-api-staging-98c0.up.railway.app`
- Production:
  - `https://control-api-production-e750.up.railway.app`

## Health Verification
- Staging:
  - `GET /healthz` -> `200`
  - `GET /readyz` -> `200` (`db reachable`)
- Production:
  - `GET /healthz` -> `200`
  - `GET /readyz` -> `200` (`db reachable`)

## Repository Status
- GitHub repo:
  - `https://github.com/AhmediHarhash/datascrap`
- Latest push includes:
  - `services/control-api/src/server.js`
  - root `package.json` and lockfile
  - `.env.example`
  - `infra/railway/control-api.env.example`

## Current Local Railway Link
- Project: `datascrap-control-plane`
- Environment: `staging`
- Service: `control-api`

## Immediate Next Commands (Phase 2 Start)
1) Add database migrations for users/sessions/licenses/devices.
2) Implement auth endpoints and token rotation.
3) Implement license/device enforcement endpoints.
4) Enable `REQUIRE_DB=true` after migration path is stable.
