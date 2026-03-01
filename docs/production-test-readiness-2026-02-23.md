# Production Test Readiness (2026-02-23)

## Current Status
- Extension runtime/features: wired and smoke-verified.
- Sidepanel parity + cloud control + templates/diagnostics: wired.
- Simple-mode quick flow + optional extension e2e harness: wired.
- Cross-platform e2e hardening wrappers (local + Railway + full release variants): wired.
- CI workflow gate for extension hardening (`.github/workflows/extension-hardening.yml`): wired.
- Branch protection automation script + playbook: wired.
- Mainline policy workflows for defense-in-depth: wired.
- Control API health/readiness smoke: passing.
- Railway-backed full hardening pass: passing (including cloud job/schedule smoke).
- Release playbook documented:
  - `docs/extension-release-playbook-2026-02-23.md`
- Release execution evidence documented:
  - `docs/release-execution-2026-02-23.md`

## Latest Validation Run (2026-02-24)
- `npm run smoke:extension` -> pass
- `npm run e2e:extension:simple` -> pass
- `npm run e2e:extension:maps` -> pass
- `npm run e2e:extension:fallback` -> pass
- `npm run e2e:extension:targeted` -> pass
- `npm run test:local:hardening:e2e` -> pass
- `npm run test:local:hardening:e2e:maps` -> pass
- `npm run test:local:hardening:e2e:fallback` -> pass
- `npm run test:local:hardening:e2e:targeted` -> pass
- `npm run github:branch-protection:plan` -> pass
- `npm run github:branch-protection:apply` -> pass
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
- e2e-enabled variants:
  - `npm run test:local:hardening:e2e`
  - `npm run test:local:hardening:e2e:maps`
  - `npm run test:local:hardening:e2e:fallback`
  - `npm run test:local:hardening:e2e:targeted`
  - `npm run test:local:hardening:e2e:long-pagination`
  - `npm run hardening:railway:e2e`
  - `npm run hardening:railway:e2e:maps`
  - `npm run hardening:railway:e2e:fallback`
  - `npm run hardening:railway:e2e:targeted`
  - `npm run hardening:railway:e2e:long-pagination`

1) Extension smoke chain
- `npm run smoke:extension`
- Includes:
  - storage/runtime
  - advanced table merge/cleanup smoke
  - epic5/epic6/epic7/epic8/epic9/epic10/epic11/epic12/epic13/epic14/epic15 UI+wiring checks

2) Optional extension e2e checks
- `npm run e2e:extension:simple`
- `npm run e2e:extension:maps`
- `npm run e2e:extension:fallback`
- `npm run e2e:extension:targeted`
- `npm run e2e:extension:long-pagination`
- For one-command hardening:
  - `npm run test:local:hardening:e2e`
  - `npm run test:local:hardening:e2e:maps`
  - `npm run test:local:hardening:e2e:fallback`
  - `npm run test:local:hardening:e2e:targeted`
  - `npm run test:local:hardening:e2e:long-pagination`

3) Control API health/readiness smoke
- `npm run smoke:control-api` (with API running)
- Verified output:
  - `/healthz` -> 200
  - `/readyz` -> 200

4) Live Railway endpoint checks (2026-02-23)
- Staging:
  - `https://control-api-staging-98c0.up.railway.app/healthz` -> 200
  - `https://control-api-staging-98c0.up.railway.app/readyz` -> 200
- Production:
  - `https://control-api-production-e750.up.railway.app/healthz` -> 200
  - `https://control-api-production-e750.up.railway.app/readyz` -> 200
5) Railway-backed full hardening
- `npm run hardening:railway`
- Verified output includes:
  - migrations complete
  - `phase5:smoke:control-api` pass (webhook + extraction + monitor job enqueue/list)
  - `phase5:schedule:smoke:control-api` pass (webhook + extraction + monitor schedules run/remove)
  - `phase9:monitor:smoke:control-api` pass (no-change/change/no-change monitor behavior)
6) Extension release packaging
- `npm run release:extension`
- Runs:
  - `npm run sync:extension`
  - `npm run smoke:extension`
  - `npm run package:extension`
- Artifacts:
  - `dist/extension/datascrap-v<manifest.version>.zip`
  - `dist/extension/datascrap-latest.zip`
7) Full production gate
- `npm run release:full`
- Runs Railway hardening + extension release packaging in one command.
- e2e-enabled variants:
  - `npm run release:full:e2e`
  - `npm run release:full:e2e:maps`
  - `npm run release:full:e2e:fallback`
  - `npm run release:full:e2e:targeted`
  - `npm run release:full:e2e:long-pagination`
- Verified cloud smoke also covers integration secret connection test endpoint:
  - `POST /api/integrations/secrets/test`

8) CI hardening gate
- Workflow:
  - `.github/workflows/extension-hardening.yml`
- Trigger:
  - pull requests touching extension/core/scripts/docs/package files
  - manual dispatch (`run_maps=true` optionally enables maps e2e)
- manual dispatch (`run_fallback=true` optionally enables fallback e2e)
- manual dispatch (`run_targeted=true` optionally enables targeted-result cap e2e)
- manual dispatch (`run_long_pagination=true` optionally enables long-pagination e2e)
- manual dispatch (`targeted_results=<n>` optionally customizes targeted cap, default `12`)
- manual dispatch (`long_total_rows=<n>` optionally customizes long-pagination fixture rows, default `1500`)
- manual dispatch (`long_batch_size=<n>` optionally customizes long-pagination fixture batch size, default `6`)
 - manual dispatch targeted cap is validated (`1..500`) before targeted e2e execution
- manual dispatch long-pagination knobs are validated (`long_total_rows: 300..5000`, `long_batch_size: 1..24`) before long e2e execution
- manual dispatch (`fallback_command=<text>` optionally customizes fallback e2e intent text)
- Runs:
  - `npm run test:local:hardening:e2e`
  - optional `npm run test:local:hardening:e2e:maps`
  - optional `npm run test:local:hardening:e2e:fallback`
  - optional `npm run test:local:hardening:e2e:targeted`
  - optional `npm run test:local:hardening:e2e:long-pagination`
 - targeted CI artifact naming:
   - `extension-e2e-artifacts-targeted-<targeted_results>`
- long-pagination CI artifact naming:
  - `extension-e2e-artifacts-long-pagination-<long_total_rows>r-<long_batch_size>b`
 - targeted artifacts include:
   - `dist/e2e/e2e-targeted-result.json`
   - `dist/e2e/e2e-targeted-meta.json`
   - `dist/e2e/e2e-targeted-sidepanel.png`
   - `dist/e2e/e2e-targeted-target-page.png`
- long-pagination artifacts include:
  - `dist/e2e/e2e-long-pagination-result.json`
  - `dist/e2e/e2e-long-pagination-meta.json`
  - `dist/e2e/e2e-long-pagination-sidepanel.png`
  - `dist/e2e/e2e-long-pagination-target-page.png`

9) Branch protection gate
- Playbook:
  - `docs/branch-protection-playbook-2026-02-24.md`
- Commands:
  - `npm run github:branch-protection:plan`
  - `GITHUB_TOKEN=<repo_admin_token> npm run github:branch-protection:apply`
- Required merge check:
  - `Extension Hardening / local-hardening-e2e`
- Applied status (2026-02-24):
  - enabled on `main` for `AhmediHarhash/datascrap`
  - strict checks + admin enforcement + 1 required approval
  - required context verified via GitHub API

10) Mainline policy defense-in-depth gate
- Workflows:
  - `.github/workflows/extension-hardening.yml` (includes `push` to `main`)
  - `.github/workflows/main-push-policy.yml`
- Behavior:
  - hardening runs on every `main` push
  - main push without associated PR fails policy workflow and opens an issue

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
- simple mode command flow (`Quick Extract`, `Enable All Access`, `Point & Follow`)
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
