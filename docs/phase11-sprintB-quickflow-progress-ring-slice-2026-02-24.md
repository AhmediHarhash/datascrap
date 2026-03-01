# Phase 11 Sprint B - Quickflow Progress Ring Slice (2026-02-24)

## Scope
Add a clear autonomous loading circle to simple mode so users can see extraction progress fill visually from start to completion:
- dedicated quickflow progress ring UI in command strip
- live phase text bound to orchestration/runtime state
- smoke coverage for HTML/CSS/JS progress-ring wiring

## Implementation
1) Simple-mode quickflow loader UI
- Updated:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/styles.css`
- Added:
  - quickflow progress block (`quick-flow-progress`)
  - radial ring (`quick-flow-progress-ring`) with percentage center label
  - phase line (`quick-flow-progress-phase`) for human-readable run stage
  - running/error/complete visual states and pulse animation

2) Sidepanel render wiring
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - quickflow progress DOM refs in `elements`
  - `renderQuickFlowProgress()` using existing `state.statusProgressPct` + `state.statusPhase`
  - ring rendering tied into `renderStatusPill()` so all existing phase/progress updates automatically drive the new loader
  - startup render call to ensure consistent initial state

3) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic17.mjs`
- Updated:
  - `package.json` (`smoke:extension:epic17`, included in aggregate `smoke:extension`)

## Validation
1) `node --check packages/extension/sidepanel/index.mjs`
2) `npm run smoke:extension:epic17`
3) `npm run smoke:extension`

## Notes
- This slice is visual/state-layer only; extraction engines and runtime contracts remain unchanged.
