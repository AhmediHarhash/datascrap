# UWS Infrastructure Bootstrap (Mode 2, Client-Powered)

## Objective
Prepare a production-ready infrastructure path that starts cheap (around Railway hobby baseline) and scales in controlled phases.

## Locked Constraints
- Local-first product:
  - extraction compute runs on client devices
  - no default cloud row storage by us
- Cloud scope:
  - auth
  - license/subscription
  - 2-device enforcement
  - usage counters
  - minimal settings sync

## Target MVP Topology (Phase 1)
1) Extension client (Chrome MV3)
- not hosted by us for runtime compute
- user device does extraction

2) Control-plane API (Railway service)
- stateless API container
- endpoints:
  - auth/session
  - license register/validate
  - device list/add/remove/rename
  - usage counters
  - remote config fetch

3) Postgres (Railway managed)
- single source of truth for account, device, license, usage metadata

4) Optional Redis (defer to phase 3+)
- only if needed for high-throughput rate limiting, queues, or burst traffic

## Phase-by-Phase Production Plan

## Phase 0 - Repo + Secrets + Safety Rails
Deliverables:
- infra runbooks and env templates committed.
- secret inventory finalized.
- budget guardrail policy defined.
Checklist:
- [x] baseline env template prepared (`infra/railway/control-api.env.example`)
- [x] JWT key rotation policy defined (`docs/ops-hardening-policies-2026-02-23.md`)
- [x] DB backup policy defined (`docs/ops-hardening-policies-2026-02-23.md`)
- [x] Railway usage cap policy defined (`docs/ops-hardening-policies-2026-02-23.md`)
- [x] incident contact + owner defined (`docs/observability-alert-runbook-2026-02-22.md`)
Exit gate:
- no unknown secrets, no unknown owners, no unknown budget policy.

## Phase 1 - Control Plane MVP (Low Cost)
Deliverables:
- one API service + one Postgres service on Railway.
- health checks + readiness checks.
- auth + license + device-limit flows live.
Checklist:
- [x] `GET /healthz` and `GET /readyz` deployed
- [x] short-lived access token + refresh token rotation implemented
- [x] max 2 active devices enforced server-side
- [x] audit rows for auth/license/device actions
- [x] staging and production Railway environments separated
Exit gate:
- end-to-end login/license/device flow passes from extension to production API.

## Phase 2 - Production Hardening
Deliverables:
- security and operational hardening for first paying users.
Checklist:
- [x] strict CORS allowlist for extension + dashboard origins
- [x] rate limits on auth and license endpoints
- [x] idempotency on mutating device/license operations
- [x] DB migrations with rollback plan
- [x] automated daily Postgres backups verified
- [x] structured logs with correlation IDs
Verification: `Backup Verify` workflow run `22289261523` succeeded for staging and production on `2026-02-23`.
Exit gate:
- chaos test (service restart + DB failover drill) completed without data loss.
Verification: staged in `docs/ops-hardening-execution-2026-02-23.md` with control-api and Postgres redeploy continuity checks.

## Phase 3 - Observability + SLO Control
Deliverables:
- measurable reliability with actionable alerts.
Tracking doc:
- `docs/phase3-observability-kickoff-2026-02-22.md`
- `docs/observability-alert-runbook-2026-02-22.md`
Checklist:
- [x] uptime monitor on `/healthz`
- [x] error tracking enabled
- [x] auth/license/device dashboards
- [x] alert thresholds:
  - 5xx spike
  - auth failure spike
  - license validation latency spike
- [x] SLOs published:
  - API availability
  - p95 auth latency
  - p95 license-check latency
Exit gate:
- alert-to-resolution runbook tested by simulation.

## Phase 4 - Scale and Cost Control
Deliverables:
- stable operation for larger active user base while keeping margins healthy.
Tracking doc:
- `docs/phase4-cost-performance-control-2026-02-22.md`
Checklist:
- [x] per-endpoint rate-limit tuning
- [x] cache for hot read paths (only if required)
- [x] read/write query optimization and indexes
- [x] monthly cost dashboard and anomaly alerts
- [x] predictable overage strategy
Exit gate:
- cost per active user stays within target band for two billing cycles.

## Phase 5 - Optional Cloud Features
Deliverables:
- scheduling/integrations rolled out only after stable control plane.
Checklist:
- [x] background job system isolated from core auth/license APIs
- [x] queue/backoff/dead-letter policies defined
- [x] integration secrets vaulting complete
- [x] opt-in data handling policy explicitly enforced
Tracking doc:
- `docs/phase5-optional-cloud-features-2026-02-23.md`
Exit gate:
- optional features do not degrade baseline auth/license SLAs.
Verification:
- API health/readiness still returns `200` in staging and production after Phase 5 rollout.
- Staging Phase 5 smoke run passed (`phase5:smoke:control-api`) with queue job executed to success by isolated worker.
- Staging scheduler smoke run passed (`phase5:schedule:smoke:control-api`) with:
  - interval auto-trigger path validated
  - manual run-now path validated
- Queue monitor (`queue:monitor:control-api`) passed with `dueNow=0`, `deadLetters=0`, and `dueSchedules=0`.

## Environment Layout
1) `local`
- dev-only tokens and local DB

2) `staging`
- production-like config with separate DB
- smoke tests before production promotion

3) `production`
- real billing and device enforcement
- strict secrets and alerting

## Minimal Database Domains
1) `users`
2) `accounts`
3) `sessions`
4) `licenses`
5) `devices`
6) `usage_counters`
7) `audit_events`
8) `app_config`

## Security Baseline
1) JWT access token short TTL (`5-15m`)
2) refresh token rotation with server revocation list
3) hashed refresh tokens at rest
4) per-account device cap enforced in transaction
5) IP and UA capture for suspicious session detection
6) no extracted row payload in telemetry

## Cost Control Baseline
1) keep compute client-side
2) keep cloud write volume low (metadata only)
3) defer Redis and job workers until needed
4) enforce budget alerts and hard spend caps
5) review p95 latency before scaling instance size

## Immediate Execution Order
1) Create Railway project + staging + production envs.
2) Create Postgres service in each env.
3) Deploy control-plane API service with health checks.
4) Set required secrets and rotate keys.
5) Run extension end-to-end smoke test against staging.
6) Promote to production and monitor first 48 hours.

## Phase 1 Delivery Snapshot (2026-02-22)
- Railway project and env separation complete.
- Staging + production Postgres provisioned.
- Control API deployed in both environments.
- DB migration `0001_control_plane_core.sql` applied to staging and production.
- Auth/license/device flows verified end-to-end in staging.
- Production health/readiness/config endpoints verified after rollout.

## Hardening Snapshot (2026-02-22)
- DB migration `0002_idempotency_keys.sql` added for request replay safety.
- Route-level rate limiting enforced for auth/license/device endpoints.
- CORS policy tightened with strict-mode env controls and extension-origin prefix support.
- Structured JSON logs enabled with `X-Request-Id` correlation.
