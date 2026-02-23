# Phase 4 Cost & Performance Control (2026-02-22)

## Implemented Controls
1) Per-endpoint rate-limit tuning visibility
- endpoint: `GET /api/observability/rate-limits`
- includes per-scope request volume, limited volume, and limited-rate percent
- source: runtime counters from rate limiter middleware

2) Hot read-path cache
- cached endpoints:
  - `GET /api/license/status`
  - `POST /api/devices` (device list)
- bounded in-memory cache with TTL and max entries
- mutation-triggered invalidation for license/device updates

3) Query/index optimization
- migration: `services/control-api/migrations/0003_perf_indexes.sql`
- indexes added:
  - `idx_licenses_account_created_at`
  - `idx_devices_account_created_at`
  - `idx_devices_account_last_seen_at`
  - `idx_sessions_account_revoked_expires`
  - `idx_audit_events_created_at`

4) Cost dashboard + anomaly alerts
- monitor script: `services/control-api/scripts/cost-monitor.js`
- workflow: `.github/workflows/cost-monitor.yml`
- failure fallback: GitHub issue `Cost Monitor Incident`
- optional external alert channel via webhook secrets

## Overage Strategy
1) Budget targets
- baseline budget: `MONTHLY_BUDGET_USD` (default strategy assumes low-cost control-plane envelope)
- alert threshold: `COST_ALERT_THRESHOLD_PERCENT` (default 80%)
- hard cap threshold: `COST_HARD_CAP_PERCENT` (default 100%)

2) Alert behavior
- alert when:
  - month-to-date usage >= threshold
  - projected month-end usage >= threshold
  - spend anomaly detected from `DAILY_COST_SERIES_USD`
- hard escalation when month-to-date or projected usage crosses hard cap

3) Mitigation ladder
- stage 1: tighten rate limits on highest-abuse scopes
- stage 2: reduce non-critical TTLs/log verbosity and pause optional workflows
- stage 3: temporary feature gating for expensive optional operations
- stage 4: force plan/rate policy update before re-enabling full limits

4) Predictability rules
- keep extraction compute on client devices
- keep cloud payloads metadata-only
- avoid adding new always-on services unless justified by observed load
- require budget impact note for each new cloud feature

## Operator Loop
1) Daily
- review `Cost Monitor` result and open incidents
- update `MONTH_TO_DATE_COST_USD` and `DAILY_COST_SERIES_USD`

2) Weekly
- inspect `/api/observability/rate-limits` for hot scopes
- adjust endpoint limits using observed limited-rate percentages
- review cache hit/miss and tune TTLs

3) Monthly
- compare projected vs actual spend
- revise thresholds and mitigation ladder based on actual burn

