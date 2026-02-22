# Phase 3 Observability Kickoff (2026-02-22)

## Scope Started
- Baseline structured request/error logging is live with `X-Request-Id` correlation.
- Hardening prerequisites are complete (CORS, rate limits, idempotency), so observability can be measured on stable behavior.

## Phase 3 Targets
1) Uptime monitor on `GET /healthz` for staging and production.
2) Error tracking integration with alert routing.
3) Dashboard panels:
- auth success/failure rates
- license validation latency
- device endpoint error rates
4) SLOs:
- API availability
- p95 auth latency
- p95 license-check latency
5) Runbook:
- alert triage
- rollback decision tree
- comms template

## Initial SLO Baseline (Draft)
- Availability (monthly):
  - target: `99.5%`
  - measurement: successful `GET /healthz` checks
- Auth p95 latency:
  - target: `< 400ms`
  - endpoints: `/api/auth/login`, `/api/auth/refresh`
- License-check p95 latency:
  - target: `< 350ms`
  - endpoints: `/api/license/status`, `/api/devices/validate-devices`

## Next Implementation Tasks
1) Add external monitors for both public domains.
2) Define alert thresholds:
- 5xx > 2% for 5 minutes
- auth failures > baseline + 3 sigma
- license p95 latency > 600ms for 10 minutes
3) Wire error tracking transport and DSN secret handling.
4) Publish on-call/owner assignments in runbook.

