# Phase 11 Sprint B - List Segmented Auto-Continue Slice (2026-02-27)

## Scope
Allow exhaustive list quick-flow runs to continue much longer in one automation execution while preserving safety boundaries.

## Implementation
1) Segmented auto-continue in list extraction engine
- Updated:
  - `packages/extension/background/list-extraction-engine.mjs`
- changes:
  - added load-more controls:
    - `autoContinueSegments`
    - `autoContinueMaxSegments`
    - `hardRoundCap`
  - exhaustive runs can now extend pagination rounds in segments when round safety is reached and rows are still growing
  - added explicit terminal diagnostics in summary:
    - `terminationReason`
    - `autoContinueSegmentsUsed`
    - segment/hard-cap metadata

2) Quick-flow defaults for segmented continuation
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- changes:
  - list autopilot now sends segmented continuation defaults for exhaustive runs:
    - `autoContinueSegments=true`
    - `autoContinueMaxSegments=24`
    - `hardRoundCap=5000`
  - segmented settings now propagate through direct quick-flow start and guided fallback carry-over
  - quick-flow status text now indicates segmented auto-continue mode
  - terminal status line now surfaces safety-cap outcomes with explicit wording

3) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic67.mjs`
- Updated:
  - `package.json`
    - added script `smoke:extension:epic67`
    - aggregate `smoke:extension` now includes `epic67`

## Validation
1) `node --check packages/extension/background/list-extraction-engine.mjs`
2) `node --check packages/extension/sidepanel/index.mjs`
3) `node --check scripts/smoke-extension-epic67.mjs`
4) `npm run smoke:extension:epic67`
5) `npm run smoke:extension`

## Notes
- Continuation remains safety-bounded via per-segment round windows plus hard round cap.
- Runs still terminate early on row-cap, no-change threshold, or terminal load-more signals.
