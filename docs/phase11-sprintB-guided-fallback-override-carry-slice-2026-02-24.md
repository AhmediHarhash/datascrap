# Phase 11 Sprint B - Guided Fallback Override Carry Slice (2026-02-24)

## Scope
Ensure intent-driven extraction targets/exhaustive flags are not lost when autonomous flow falls back to Point & Follow:
- carry list start overrides into guided mode
- use carried overrides when picker learning starts extraction
- clear guided override state after terminal guided interactions

## Implementation
1) Guided override state
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - `state.pointFollowStartOptions`
  - `onPointAndFollow(options)` now accepts/records `startOptions`

2) Fallback propagation
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - `runPointFollowFallback` supports `startOptions`
  - list fallback callers pass inherited overrides:
    - `maxRows`
    - `untilNoMore`
    - `maxRoundsSafety`
    - tuned attempts/no-change threshold

3) Guided start consumption + cleanup
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - guided picker completion now calls `onStart(state.pointFollowStartOptions || {})`
  - override state reset on:
    - guided success
    - picker cancel
    - picker error
    - point-follow setup failure

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic25.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic25`
    - aggregate `smoke:extension` includes `epic25`

## Validation
1) `node --check packages/extension/sidepanel/index.mjs`
2) `node --check scripts/smoke-extension-epic25.mjs`
3) `npm run smoke:extension:epic25`
4) `npm run smoke:extension`

## Notes
- This closes the gap where fallback guidance could have restarted extraction with default limits instead of the user’s intent target.
