# Phase 5 Optional Cloud Features (2026-02-23)

## Scope
Enable optional scheduling/integration infrastructure without impacting core auth/license APIs.

## What Was Implemented

1. Isolated background job system
- Migration:
  - `services/control-api/migrations/0004_phase5_optional_cloud.sql`
- Queue tables:
  - `cloud_jobs`
  - `cloud_job_dead_letters`
- Worker process:
  - `services/control-api/scripts/jobs-worker.js`
- Worker/queue services:
  - `services/control-api/src/services/jobs.js`
  - `services/control-api/src/services/job-processor.js`
- API route surface:
  - `services/control-api/src/routes/jobs.js`

2. Queue/backoff/dead-letter policy
- Retry statuses: `queued`, `retrying`
- Terminal statuses: `succeeded`, `dead_letter`, `failed`, `canceled`
- Backoff policy:
  - `JOB_BACKOFF_BASE_SECONDS` (default `15`)
  - `JOB_BACKOFF_MULTIPLIER` (default `2`)
  - `JOB_BACKOFF_MAX_SECONDS` (default `900`)
- Max attempts:
  - default `JOB_MAX_ATTEMPTS_DEFAULT` (default `5`)
  - per-job override allowed (capped to `1..10`)
- Dead-letter behavior:
  - terminal failures inserted into `cloud_job_dead_letters`
  - stale lock recovery moves exhausted jobs to dead-letter
- Lock timeout policy:
  - `JOB_LOCK_TIMEOUT_SECONDS` (default `300`)

3. Integration secrets vaulting
- Vault table:
  - `integration_secrets`
- Service:
  - `services/control-api/src/services/integration-vault.js`
- Encryption:
  - AES-256-GCM with `VAULT_MASTER_KEY`
  - supports 64-char hex or base64 key input
- Key enforcement:
  - `VAULT_REQUIRE_KEY=true` recommended for production
- API:
  - `GET /api/integrations/secrets`
  - `POST /api/integrations/secrets/upsert`
  - `POST /api/integrations/secrets/remove`

4. Explicit opt-in data handling enforcement
- Policy table:
  - `account_cloud_policies`
- Policy service:
  - `services/control-api/src/services/cloud-policy.js`
- Metadata guardrail service:
  - `services/control-api/src/services/metadata-policy.js`
- API:
  - `GET /api/data-handling/policy`
  - `POST /api/data-handling/policy`
- Enforcement:
  - cloud features require explicit account opt-in
  - webhook jobs require webhook opt-in
  - metadata-only payload validation blocks row/raw content keys
  - payload size cap via `MAX_METADATA_PAYLOAD_BYTES`

5. Scheduler core (interval + cron + timezone)
- Migration:
  - `services/control-api/migrations/0005_phase5_scheduler.sql`
- Scheduler table:
  - `cloud_schedules`
- Scheduler services:
  - `services/control-api/src/services/cron.js`
  - `services/control-api/src/services/schedules.js`
- Scheduler API:
  - `GET /api/schedules`
  - `POST /api/schedules/create`
  - `POST /api/schedules/update`
  - `POST /api/schedules/toggle`
  - `POST /api/schedules/remove`
  - `POST /api/schedules/run-now`
- Worker integration:
  - `jobs-worker` sweeps due schedules and enqueues jobs with schedule metadata.

## Isolation Model
1. Core API remains stateless auth/license/device control-plane.
2. Optional cloud features are behind `ENABLE_OPTIONAL_CLOUD_FEATURES`.
3. Job execution occurs in a separate worker process (`jobs-worker`), not in request path.

## Observability Additions
- New endpoint:
  - `GET /api/observability/jobs`
- Dashboard now includes queue summary block.
- Dashboard includes queue + schedule summary.
- Monitor script/workflow:
  - `services/control-api/scripts/job-queue-monitor.js`
  - `.github/workflows/job-queue-monitor.yml`

## Rollout Notes
1. Apply migrations `0004` and `0005` before enabling feature flag.
2. Keep `ENABLE_OPTIONAL_CLOUD_FEATURES=false` until worker service is deployed.
3. Set `VAULT_MASTER_KEY` and `VAULT_REQUIRE_KEY=true` before storing secrets in production.
4. Launch worker as dedicated deployment with:
  - `npm run jobs:worker:control-api`

## Verification Snapshot
1. Database migration:
- `0004_phase5_optional_cloud.sql` applied on staging and production.
- `0005_phase5_scheduler.sql` applied on staging and production.

2. API status:
- `GET /healthz` and `GET /readyz` returned `200` on staging and production after rollout.
- `GET /api/config` reports:
  - `optionalCloudFeaturesEnabled=true`
  - `metadataOnlyEnforced=true`

3. Staging smoke:
- command: `npm run phase5:smoke:control-api`
- result: success
- generated job id: `72861f2e-c0c0-43bc-bd81-4369c2bc4bcc`

4. Worker execution proof:
- `jobs-worker` logs contain:
  - `jobs.worker.claimed` for smoke job id
  - `jobs.worker.succeeded` for smoke job id

5. Queue observability:
- `GET /api/observability/jobs` returned queue stats for staging and production.
- `npm run queue:monitor:control-api` passed with:
  - `dueNow=0`
  - `deadLetters=0`
  - `dueSchedules=0`

6. Scheduler API smoke:
- command: `npm run phase5:schedule:smoke:control-api`
- result: success
- created schedule and executed `run-now` enqueue path

7. Post-rollout policy-fix validation:
- schedule update policy now enforces webhook/metadata checks using effective target job type (including updates that only change payload).
- staging and production `control-api` redeployed after fix.
- queue monitor passed on both environments after redeploy.
