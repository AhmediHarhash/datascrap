# Phase 11 Sprint B - E2E Fallback Gate Slice (2026-02-24)

## Scope
Add runtime e2e coverage for autonomous fallback transitions and expose one-command hardening/release variants.

## Implementation
1) Extension fallback e2e harness
- Added:
  - `scripts/e2e-extension-fallback.mjs`
- Scenario:
  - runs intent command with maps strategy + non-maps URL (`maps https://example.com`)
  - verifies maps strategy planning
  - verifies fallback signal appears in UI/log state
  - captures artifacts in `dist/e2e`

2) Hardening wrapper + local pass flags
- Updated:
  - `scripts/run-hardening-with-flags.mjs`
  - `scripts/local-hardening-pass.mjs`
- Added flag support:
  - `--fallback` -> `RUN_EXTENSION_E2E_FALLBACK=true`
- Local hardening now optionally executes:
  - `npm run e2e:extension:fallback`

3) Package scripts
- Updated:
  - `package.json`
- Added:
  - `e2e:extension:fallback`
  - `test:local:hardening:e2e:fallback`
  - `hardening:railway:e2e:fallback`
  - `release:full:e2e:fallback`

4) Playbook/readiness docs
- Updated:
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`
  - `docs/production-test-readiness-2026-02-23.md`

## Validation
1) `npm run e2e:extension:fallback`
2) `npm run smoke:extension`

## Notes
- Fallback e2e focuses on transition proof (`maps -> fallback`) and keeps assertions resilient to host-permission/runtime variability.
