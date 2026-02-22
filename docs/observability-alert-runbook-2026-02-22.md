# Observability Alert Runbook (2026-02-22)

## Scope
- Control API endpoints on:
  - `https://control-api-staging-98c0.up.railway.app`
  - `https://control-api-production-e750.up.railway.app`
- Data sources:
  - `GET /healthz` uptime monitor checks
  - structured API logs (`http.request.completed`)
  - `GET /api/observability/slo`
  - `GET /api/observability/errors/recent`
  - `GET /metrics`

## Automatic Alert Channel
- GitHub workflow `Uptime Monitor` automatically opens or comments on issue:
  - title: `Uptime Monitor Incident`
- GitHub workflow `SLO Monitor` automatically opens or comments on issue:
  - title: `SLO Monitor Incident`
- This is active even when external webhook secrets are not configured.

## Alert Thresholds
1) Availability alert:
- condition: health check failures for 2 consecutive runs (10 minutes)
- severity: high

2) 5xx spike alert:
- condition: `5xx / total requests > 2%` for 5 minutes
- severity: high

3) Auth latency alert:
- condition: auth p95 (`/api/auth/login` + `/api/auth/refresh`) > `600ms` for 10 minutes
- severity: medium

4) License latency alert:
- condition: license p95 (`/api/license/status` + `/api/devices/validate-devices`) > `600ms` for 10 minutes
- severity: medium

## Triage Steps
1) Confirm blast radius:
- check staging vs production
- identify failing endpoint family from `/api/observability/slo` and logs

2) Classify incident:
- dependency outage (DB/network)
- deployment regression
- abuse/traffic spike

3) Apply immediate mitigation:
- rollback to previous Railway deployment if regression
- tighten temporary rate limits if abuse
- place incident banner if auth/license unavailable

4) Verify recovery:
- 3 consecutive healthy checks
- error rate and p95 latencies return within threshold

## Rollback Decision Tree
1) Did failure start after latest deployment?
- yes: rollback immediately
- no: continue to step 2

2) Is database reachable (`/readyz` DB check)?
- no: treat as DB incident, pause writes if required
- yes: continue to step 3

3) Is failure limited to one endpoint family?
- yes: apply route-specific mitigation (rate limit/config)
- no: global mitigation + rollback

## Communications Template
- Subject: `Datascrap API Incident - <severity> - <timestamp>`
- Include:
  - impact summary
  - affected endpoints
  - start time (UTC)
  - mitigation actions
  - ETA for next update

## Owners
- Primary owner: `TBD`
- Secondary owner: `TBD`
- Escalation contact: `TBD`
