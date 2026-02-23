# Phase 9 Sprint D - Anti-Block Reliability Profiles Slice (2026-02-23)

## Scope
Deliver Workstream 6 foundation in extension runtime:
- reliability profile controls in sidepanel queue settings
- persisted reliability preferences and template portability
- bounded retry backoff strategy + jitter mode behavior
- optional sticky session/tab reuse mode for page extractor workers
- smoke coverage for profile normalization and runtime wiring

## Implementation
1) Sidepanel reliability controls and persistence
- Updated:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
- Added controls:
  - reliability profile (`balanced`, `conservative`, `aggressive`, `custom`)
  - backoff strategy (`fixed`, `linear`, `exponential`)
  - jitter mode (`none`, `bounded`, `full`)
  - retry min/max delay bounds
  - session reuse mode (`off`, `sticky`)
- Added sidepanel storage key:
  - `datascrap.sidepanel.reliability-settings.v1`
- Added control/status wiring:
  - load/save normalized settings
  - apply profile defaults
  - switch to `custom` when per-control overrides are changed

2) Template and queue payload wiring
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Included reliability settings in:
  - `extractCommonTemplateControls()`
  - `applyTemplatePayload(...)`
  - page/metadata queue payload generation (`queue.reliability`)

3) Page extraction runtime behavior
- Updated:
  - `packages/extension/background/page-extraction-engine.mjs`
- Added:
  - `normalizeReliabilityConfig(...)`
  - `computeRetryDelayMs(...)`
  - jitter window resolver by mode
- Runtime now applies:
  - bounded retry delay using min/max caps
  - strategy-based retry cadence (`fixed`/`linear`/`exponential`)
  - jitter mode behavior (`none`/`bounded`/`full`)
- Added optional sticky worker session reuse:
  - worker tab can be reused across URLs with `tabs.update`
  - sticky tab is closed on worker shutdown
- Added retry telemetry context and summary data:
  - retry progress events include profile/backoff/jitter/session mode
  - summary includes `retryStats`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic13.mjs`
- Updated:
  - `package.json` (`smoke:extension` chain now includes epic13)
- Epic13 validates:
  - reliability control IDs/tokens present in sidepanel files
  - queue reliability normalization behavior
  - bounded retry-delay computation behavior
  - runtime reliability/session wiring tokens

## Validation
1) `npm run smoke:extension` -> pass
2) `npm run test:local:hardening` -> pass
3) `npm run hardening:railway` -> pass

## Notes
- Sticky session reuse is intentionally optional and controlled per run via queue reliability settings.
- Reliability controls remain local-first and template-portable; no extracted row data is moved to cloud storage.
