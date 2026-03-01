# Phase 11 Sprint B - List Until-No-More Slice (2026-02-24)

## Scope
Strengthen autonomous list extraction so exhaustive commands truly continue until the search is exhausted:
- add explicit `untilNoMore` semantics to list config/runtime
- carry exhaustive intent flags from quick-flow planner to runtime
- bound long-running loops with a safety round cap

## Implementation
1) Sidepanel intent-to-runtime propagation
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - exhaustive override fields in list autopilot:
    - `untilNoMore`
    - `maxRoundsSafety`
  - status messaging clarifies exhaustive behavior ("running until no more results")
  - list config builder now accepts these overrides when intent quick extract starts

2) List extraction runtime continuation semantics
- Updated:
  - `packages/extension/background/list-extraction-engine.mjs`
- Added:
  - load-more normalization for:
    - `untilNoMore`
    - `maxRoundsSafety`
  - round loop behavior:
    - non-exhaustive: stop at configured attempts
    - exhaustive: continue until no-change/terminal condition with bounded safety cap
  - run summary/progress context now includes `untilNoMore`

3) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic24.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic24`
    - aggregate `smoke:extension` includes `epic24`

## Validation
1) `node --check packages/extension/sidepanel/index.mjs`
2) `node --check packages/extension/background/list-extraction-engine.mjs`
3) `node --check scripts/smoke-extension-epic24.mjs`
4) `npm run smoke:extension:epic24`
5) `npm run smoke:extension`

## Notes
- This is still safely bounded: exhaustive runs stop when no new rows appear repeatedly or when safety cap is hit.
- Targeted runs (`extract 120 ...`) still stop early at the row cap before exhaustive ceiling.
