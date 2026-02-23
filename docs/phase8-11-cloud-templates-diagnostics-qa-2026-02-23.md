# Phase 8-11 Cloud, Templates, Diagnostics, QA Wiring (2026-02-23)

## Scope
Deliver production-test wiring beyond Epic 7:
- cloud control UI/API wiring (policy, integrations, jobs, schedules, observability)
- template save/apply/run workflow
- diagnostics report workflow
- smoke coverage expansion
- real cloud extraction job type (`extraction.page.summary`) with API validation + processor execution path
- sidepanel presets for job/schedule payloads and advanced table tooling coverage

## Implemented

1) Shared message contract expansion
- File:
  - `packages/shared/src/messages.mjs`
- Added message types for:
  - cloud policy get/set
  - integration secrets list/upsert/remove
  - jobs policy/enqueue/list/dead-list/cancel
  - schedules list/create/update/toggle/remove/run-now
  - observability dashboard/slo/errors/jobs

2) Extension background cloud client wiring
- File:
  - `packages/extension/background/activation-service.mjs`
- Added authenticated API functions for optional cloud endpoints.
- Added observability key header support (`x-observability-key` optional).

3) Service worker handlers for cloud endpoints
- File:
  - `packages/extension/background/service-worker.mjs`
- Added request/response handling for all new activation cloud message types.

4) Sidepanel production test control surfaces
- Files:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
- Added `Cloud Control` panel:
  - policy load/save
  - integration secrets list/upsert/remove
  - jobs enqueue/list/dead/cancel
  - schedules create/list/toggle/run-now/remove
  - observability fetch actions
- Added `Templates & Diagnostics` panel:
  - save/apply/run/delete extraction templates (local storage)
  - runtime snapshot report
  - diagnostics report generation + clipboard copy

5) QA/smoke expansion
- File:
  - `scripts/smoke-extension-epic8.mjs`
- Added checks for:
  - cloud panel IDs
  - template/diagnostic IDs
  - message contract tokens
  - service-worker cloud handler wiring
  - activation service cloud exports
  - job/schedule preset controls
  - table cleanup/merge controls
  - speed profile save/reset controls
- Updated script chain:
  - `package.json` includes `smoke:extension:epic8` in `smoke:extension`.

6) Control API cloud extraction job support
- Files:
  - `services/control-api/src/services/job-processor.js`
  - `services/control-api/src/routes/jobs.js`
  - `services/control-api/src/routes/schedules.js`
  - `services/control-api/scripts/phase5-smoke.js`
  - `services/control-api/scripts/phase5-schedule-smoke.js`
- Added:
  - supported job type list including `extraction.page.summary`
  - payload validation for extraction jobs/schedules
  - safe URL guardrails + summary extraction execution in job processor
  - cloud smoke coverage for both webhook and extraction schedule/job paths

7) Sidepanel cloud/job UX presets
- Files:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - one-click job payload presets (webhook vs extraction summary)
  - one-click schedule payload presets (webhook vs extraction summary)
  - job type datalist includes `extraction.page.summary`

8) Advanced table/speed quality surfaces wired
- Files:
  - `packages/extension/background/data-table-service.mjs`
  - `packages/extension/background/service-worker.mjs`
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
  - `scripts/smoke-extension-table-advanced.mjs`
- Added:
  - table cleanup pipeline (empty/duplicate/repeating/mostly-empty/image filters)
  - multi-column merge operation with source-removal option
  - user-editable speed profiles with save/reset persistence
  - dedicated advanced table smoke script included in extension smoke chain

## Notes
- This delivers full extension-side wiring to the existing control API cloud endpoints for active testing.
- Cloud operations require:
  - valid activation login/session
  - optional cloud features enabled server-side (`ENABLE_OPTIONAL_CLOUD_FEATURES=true`)
  - account policy opt-in (`cloudFeaturesOptIn=true`) for cloud jobs/schedules/integrations.
- Validation status:
  - `npm run smoke:extension` passes with epic8 + advanced table checks.
  - `npm run hardening:railway` passes including cloud smoke for webhook + extraction schedules/jobs.
