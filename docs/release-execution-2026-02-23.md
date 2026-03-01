# Release Execution Evidence (2026-02-23)

## Scope
Record the actual production gate execution and resulting artifacts.

## Commands Executed

1) Extension-only release gate
- Command:
  - `npm run release:extension`
- Result:
  - pass
- Includes:
  - extension sync
  - extension smoke chain (storage, table-advanced, runtime, epic5, epic6, epic7, epic8)
  - extension packaging with archive validation

2) Full production gate
- Command:
  - `npm run release:full`
- Result:
  - pass
- Includes:
  - `npm run hardening:railway`
  - `npm run release:extension`

3) Local e2e hardening wrappers (2026-02-24)
- Commands:
  - `npm run test:local:hardening:e2e`
  - `npm run test:local:hardening:e2e:maps`
- Result:
  - pass
- Includes:
  - extension smoke chain
  - extension Playwright e2e (`simple`, and `maps` for maps variant)
  - control API health/readiness smoke

4) Branch protection automation (2026-02-24)
- Commands:
  - `npm run github:branch-protection:plan`
  - `npm run github:branch-protection:apply` (with `GITHUB_TOKEN` from authenticated CLI)
- Result:
  - pass
  - required context applied:
    - `Extension Hardening / local-hardening-e2e`
  - protection verification:
    - strict checks enabled
    - admin enforcement enabled
    - required approvals = 1
    - linear history + conversation resolution enabled

5) Mainline policy workflow wiring (2026-02-24)
- Added workflows:
  - `.github/workflows/extension-hardening.yml` updated with `push` on `main`
  - `.github/workflows/main-push-policy.yml`
- Purpose:
  - enforce hardening execution on `main` pushes
  - detect and incident-log direct/non-PR `main` updates
- Status:
  - active defense-in-depth policy alongside branch protection

6) Full railway hardening E2E matrix + release packaging (2026-02-28 to 2026-03-01 UTC)
- Commands:
  - `npm run hardening:railway:e2e`
  - `npm run hardening:railway:e2e:maps`
  - `npm run hardening:railway:e2e:fallback`
  - `npm run hardening:railway:e2e:targeted`
  - `npm run hardening:railway:e2e:long-pagination`
  - `npm run hardening:railway:e2e:navigate-cycle`
  - `npm run release:extension`
- Result:
  - pass (strict serial execution)
- Evidence:
  - `dist/manual-signoff/2026-02-28/01-hardening-railway-e2e-simple.log`
  - `dist/manual-signoff/2026-02-28/02-hardening-railway-e2e-maps.log`
  - `dist/manual-signoff/2026-02-28/03-hardening-railway-e2e-fallback.log`
  - `dist/manual-signoff/2026-02-28/04-hardening-railway-e2e-targeted.log`
  - `dist/manual-signoff/2026-02-28/05b-hardening-railway-e2e-long-pagination-retry.log`
  - `dist/manual-signoff/2026-02-28/06-hardening-railway-e2e-navigate-cycle.log`
  - `dist/manual-signoff/2026-02-28/07-release-extension.log`
- Hardening note:
  - fixed intermittent health-check race by isolating control API port allocation in `scripts/local-hardening-pass.mjs`.

## Cloud Smoke Evidence (from full production gate)
- Phase5 smoke:
  - `integrationTestOk=true`
  - `integrationTestStatusCode=204`
  - `jobId=5e5eacbc-ce35-4c96-aa7d-27dff609fa82`
  - `extractionJobId=53f4f090-3fdb-4d85-bf10-bf0978ef52e6`
- Phase5 schedule smoke:
  - `scheduleId=0a78d714-2d81-4a49-8a5a-9c6f5864880a`
  - `extractionScheduleId=210752f4-4096-436f-bd9c-0f81095a6872`
  - `jobId=f4e09e6a-c8d1-46c3-8375-e1c6635b285f`
  - `extractionJobId=36022f6b-8f31-489e-be50-1a0ddb8dc673`

## Packaged Artifact
- Versioned zip:
  - `dist/extension/datascrap-v0.1.0.zip`
- Latest alias zip:
  - `dist/extension/datascrap-latest.zip`
- Archive integrity check:
  - pass
  - entries counted: `50`

## Status
- Automated release gates: pass.
- Artifact generation: pass.
- Manual UI parity sign-off: pass.
  - execution checklist: `docs/manual-ui-parity-signoff-checklist-2026-02-28.md`
