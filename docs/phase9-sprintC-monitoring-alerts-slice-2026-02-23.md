# Phase 9 Sprint C - Monitoring Alerts Slice (2026-02-23)

## Scope
Ship the first monitoring/change-alert vertical slice:
- new cloud job type: `monitor.page.diff`
- persisted monitor hash/snapshot state
- field-level diff summary on changes
- optional webhook notify on change only
- sidepanel presets for jobs/schedules
- smoke coverage for monitor enqueue/schedule and no-change/change execution

## Implementation
1) Control API payload validation
- Added `services/control-api/src/services/job-payload-validator.js`
  - `validateMonitorPageDiffPayload`
  - centralized per-job payload validation
  - centralized webhook opt-in resolver (`requiresWebhookOptIn`)
- Updated routes:
  - `services/control-api/src/routes/jobs.js`
  - `services/control-api/src/routes/schedules.js`

2) Monitor state persistence
- Added migration:
  - `services/control-api/migrations/0006_phase9_monitor_states.sql`
- Added monitor state service:
  - `services/control-api/src/services/monitor-state.js`
  - key resolution, state read, atomic upsert with run/change counters

3) Monitor job execution
- Updated:
  - `services/control-api/src/services/job-processor.js`
- Added:
  - `monitor.page.diff` to supported job types
  - compare option normalization
  - deterministic snapshot hashing
  - field-level diff generation
  - optional webhook delivery only when `changed=true`
  - persisted monitor state update after each run

4) Sidepanel preset wiring
- Updated:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - jobs preset button: `jobs-fill-monitor-diff-btn`
  - schedules preset button: `schedule-fill-monitor-diff-btn`
  - datalist option: `monitor.page.diff`
  - payload template: `buildMonitorDiffJobPayloadTemplate(...)`

5) Smoke coverage updates
- Added extension smoke:
  - `scripts/smoke-extension-epic11.mjs`
- Updated extension smoke chain:
  - `package.json` (`smoke:extension` includes `smoke:extension:epic11`)
- Updated cloud smoke:
  - `services/control-api/scripts/phase5-smoke.js` (monitor enqueue)
  - `services/control-api/scripts/phase5-schedule-smoke.js` (monitor schedule create/run/remove)
- Added monitor behavior smoke:
  - `services/control-api/scripts/phase9-monitor-smoke.js`
  - validates baseline/no-change/change/no-change transitions
  - validates persisted run/change counters
- Updated hardening pass:
  - `scripts/local-hardening-pass.mjs` now runs `phase9:monitor:smoke:control-api` in cloud mode
  - `package.json` adds `phase9:monitor:smoke:control-api`

## Validation
1) `npm run smoke:extension` -> pass
2) `npm run test:local:hardening` -> pass
3) `npm run hardening:railway` -> pass
- Migration applied:
  - `0006_phase9_monitor_states.sql`
- Phase5 cloud smoke passed with monitor enqueue/schedule paths.
- Phase9 monitor smoke passed:
  - first run unchanged baseline
  - second run unchanged
  - third run changed (diff detected)
  - fourth run unchanged again
  - persisted state counters updated (`runCount >= 4`, `changeCount >= 1`)
