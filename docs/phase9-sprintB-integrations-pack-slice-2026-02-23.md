# Phase 9 Sprint B - Integrations Pack Slice (2026-02-23)

## Scope
Deliver Workstream 3 first vertical slice:
- integration provider presets in sidepanel
- API-backed integration secret connection test
- cloud smoke coverage update for integration test path

## Implemented

1) Control API integration test endpoint
- File:
  - `services/control-api/src/routes/integrations.js`
- Added:
  - `POST /api/integrations/secrets/test`
  - webhook provider connection test flow:
    - loads stored secret from vault
    - performs outbound HTTP request to target URL
    - supports bearer or custom-header secret placement
    - returns status, ok flag, duration, response preview
  - policy/auth/rate-limit and audit logging alignment

2) Extension background cloud client wiring
- Files:
  - `packages/shared/src/messages.mjs`
  - `packages/extension/background/activation-service.mjs`
  - `packages/extension/background/service-worker.mjs`
- Added:
  - integration test message contracts
  - activation cloud function for integration test endpoint
  - service worker request/response handler

3) Sidepanel integrations UX upgrades
- Files:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - provider presets:
    - webhook
    - airtable
    - n8n
  - test connection controls:
    - target URL
    - method
    - secret placement
    - custom header name
    - test body JSON
  - test action dispatch + result rendering in observability output panel

4) Smoke updates
- File:
  - `scripts/smoke-extension-epic8.mjs`
- Added checks for:
  - new integrations UI IDs
  - integration preset/test JS handlers
  - integration test message token
  - activation service export token

5) Cloud smoke coverage update
- File:
  - `services/control-api/scripts/phase5-smoke.js`
- Added:
  - call to `/api/integrations/secrets/test` after secret upsert
  - output fields:
    - `integrationTestOk`
    - `integrationTestStatusCode`

## Validation
1) Syntax checks passed:
- `node --check services/control-api/src/routes/integrations.js`
- `node --check packages/extension/background/activation-service.mjs`
- `node --check packages/extension/background/service-worker.mjs`
- `node --check packages/extension/sidepanel/index.mjs`
- `node --check scripts/smoke-extension-epic8.mjs`

2) Extension smoke passed:
- `npm run smoke:extension`

3) Local hardening pass:
- `npm run test:local:hardening` passed

4) Railway hardening pass:
- `npm run hardening:railway` passed
- phase5 smoke confirms integration test path:
  - `integrationTestOk=true`
  - `integrationTestStatusCode=204`

## Notes
- This slice keeps extracted dataset storage local-first.
- Integration test currently supports webhook provider; provider-specific deep tests (Airtable/n8n API probes) are next increment.
