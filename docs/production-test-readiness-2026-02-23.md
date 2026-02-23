# Production Test Readiness (2026-02-23)

## Current Status
- Extension runtime/features: wired and smoke-verified.
- Sidepanel parity + cloud control + templates/diagnostics: wired.
- Control API health/readiness smoke: passing.
- Railway-backed full hardening pass: passing (including cloud job/schedule smoke).
- Release playbook documented:
  - `docs/extension-release-playbook-2026-02-23.md`
- Release execution evidence documented:
  - `docs/release-execution-2026-02-23.md`

## Latest Validation Run (2026-02-23)
- `npm run smoke:extension` -> pass
- `npm run test:local:hardening` -> pass (`hasDatabase=false`, cloud smoke intentionally skipped)
- `npm run hardening:railway` -> pass (`hasDatabase=true`, `cloudSmoke=true`)
- Cloud smoke verified all cloud job types:
  - `integration.webhook.deliver`
  - `extraction.page.summary`
  - `monitor.page.diff`

## Verified Commands

0) One-command local hardening pass
- `npm run test:local:hardening`
- Runs extension smoke + control-api smoke and conditionally cloud smoke when DB exists.
- Railway-backed variant: `npm run hardening:railway` (pulls Railway vars automatically, then runs the same pass).

1) Extension smoke chain
- `npm run smoke:extension`
- Includes:
  - storage/runtime
  - advanced table merge/cleanup smoke
  - epic5/epic6/epic7/epic8/epic9/epic10/epic11/epic12/epic13/epic14 UI+wiring checks

2) Control API health/readiness smoke
- `npm run smoke:control-api` (with API running)
- Verified output:
  - `/healthz` -> 200
  - `/readyz` -> 200

3) Live Railway endpoint checks (2026-02-23)
- Staging:
  - `https://control-api-staging-98c0.up.railway.app/healthz` -> 200
  - `https://control-api-staging-98c0.up.railway.app/readyz` -> 200
- Production:
  - `https://control-api-production-e750.up.railway.app/healthz` -> 200
  - `https://control-api-production-e750.up.railway.app/readyz` -> 200
4) Railway-backed full hardening
- `npm run hardening:railway`
- Verified output includes:
  - migrations complete
  - `phase5:smoke:control-api` pass (webhook + extraction + monitor job enqueue/list)
  - `phase5:schedule:smoke:control-api` pass (webhook + extraction + monitor schedules run/remove)
  - `phase9:monitor:smoke:control-api` pass (no-change/change/no-change monitor behavior)
5) Extension release packaging
- `npm run release:extension`
- Runs:
  - `npm run sync:extension`
  - `npm run smoke:extension`
  - `npm run package:extension`
- Artifacts:
  - `dist/extension/datascrap-v<manifest.version>.zip`
  - `dist/extension/datascrap-latest.zip`
6) Full production gate
- `npm run release:full`
- Runs Railway hardening + extension release packaging in one command.
- Verified cloud smoke also covers integration secret connection test endpoint:
  - `POST /api/integrations/secrets/test`

## What Is Wired For Testing

1) Core extraction flows
- list/page/email/phone/text/maps/metadata
- data table + exports + image downloader
- data table advanced ops: cleanup/density + merge columns
- URL generator (range/seed/pattern) + recovery controls (retry failed/resume checkpoint/failure report)
- activation/license/device management
- list speed profile editor + reset defaults
- reliability profiles (bounded backoff/jitter/session reuse) + retry telemetry summary

2) Home hub + onboarding
- menu/history/data/tools/latest views
- per-tool quick-start + first-3-visits welcome behavior
- roadmap notify interactions

3) Cloud control panel
- policy load/save
- integration secrets list/upsert/remove
- jobs enqueue/list/dead/cancel
- job presets for `integration.webhook.deliver` and `extraction.page.summary`
- schedules create/list/toggle/run-now/remove
- observability fetch actions

4) Templates & diagnostics panel
- template save/apply/run/delete
- runtime snapshot capture
- diagnostics report generation/copy
- run artifact and failure packet summary visibility

## Required Env For Full Cloud E2E

Control API must run with:
- `ENABLE_OPTIONAL_CLOUD_FEATURES=true`
- valid `DATABASE_URL`
- auth/login + account policy opt-in via cloud policy controls
- optional `VAULT_MASTER_KEY` for integration secrets in stricter environments

## Recommended Immediate Test Order

1) Activation login + license status/device validation
2) List extractor run -> table load -> export CSV/XLSX/JSON
3) Email/text/maps/metadata runs on sample URLs
4) Cloud policy opt-in
5) Integration secret upsert
6) Job enqueue/list/cancel
7) Schedule create/run-now/toggle/remove
8) Observability dashboard/errors/jobs pull
9) Template save/apply/run
10) Diagnostics report generate/copy
