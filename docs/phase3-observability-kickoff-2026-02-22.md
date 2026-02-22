# Phase 3 Observability Kickoff (2026-02-22)

## Scope Started
- Baseline structured request/error logging is live with `X-Request-Id` correlation.
- Hardening prerequisites are complete (CORS, rate limits, idempotency), so observability can be measured on stable behavior.
- Observability endpoints are now exposed:
  - `GET /api/observability/slo`
  - `GET /metrics`
- Scheduled uptime monitor workflow added:
  - `.github/workflows/uptime-monitor.yml`
  - `services/control-api/scripts/uptime-monitor.js`
- GitHub repo variable set:
  - `UPTIME_URLS` for staging+production `healthz` targets
- Alert runbook published:
  - `docs/observability-alert-runbook-2026-02-22.md`

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
1) Set `OBSERVABILITY_API_KEY` and dashboard/monitor secrets in all environments.
2) Configure `vars.UPTIME_URLS` and optional alert webhooks in GitHub Actions.
3) Connect `ERROR_TRACKING_WEBHOOK_URL` to your incident channel destination.
4) Assign primary/secondary owners in runbook.
