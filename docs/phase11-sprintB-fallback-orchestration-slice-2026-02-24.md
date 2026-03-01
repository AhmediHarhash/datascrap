# Phase 11 Sprint B - Fallback Orchestration Slice (2026-02-24)

## Scope
Harden autonomous execution so strategy failures do not hard-stop extraction:
- fallback routing for `page` and `maps` autopilot failures
- automatic downgrade to list autodetect, then Point & Follow guidance
- smoke coverage for fallback orchestration wiring

## Implementation
1) Quick extract failover routing
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Added behaviors:
  - local fallback helpers in `onQuickExtract`:
    - `runListAutodetectAutopilot`
    - `runPointFollowFallback`
  - `PAGE_AUTOPILOT` start failure -> fallback to list autodetect
  - `MAPS_AUTOPILOT` invalid target/start failure -> fallback to list autodetect
  - list start failure -> fallback to Point & Follow
  - fallback telemetry event: `quick_extract_fallback` with `fromStrategy` / `toStrategy` / `reason`

2) Point & Follow status contract
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- `onPointAndFollow` now returns `true/false` and sets status:
  - success -> `IDLE` (awaiting guided click)
  - failure -> `ERROR`
- intent-guided point-follow path now respects this return value.

3) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic18.mjs`
- Updated:
  - `package.json` (`smoke:extension:epic18`, included in aggregate `smoke:extension`)

## Validation
1) `node --check packages/extension/sidepanel/index.mjs`
2) `npm run smoke:extension:epic18`
3) `npm run smoke:extension`

## Notes
- This slice improves resilience without changing extraction engine APIs.
- Fallback keeps simple mode moving forward even when first strategy cannot launch.
