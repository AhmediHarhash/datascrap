# Phase 11 Sprint B - Intent Goldens Slice (2026-02-24)

## Scope
Lock autonomous command behavior with executable golden scenarios:
- conversational extraction commands
- fresh-query behavior
- strategy routing for access/export/page/maps/list/point-follow

## Implementation
1) Orchestrator scenario smoke
- Added:
  - `scripts/smoke-extension-epic19.mjs`
- Coverage includes:
  - conversational lead intent (`I want info for home services ...`) -> maps autopilot
  - fresh non-maps intent (`latest ...`) -> Google search with recency filter
  - export-only intent -> export strategy
  - access-only intent -> access strategy
  - email intent with explicit URL -> page autopilot
  - point-and-follow intent -> guided strategy
  - generic business discovery -> list autodetect autopilot

2) Smoke chain wiring
- Updated:
  - `package.json`
- Added:
  - `smoke:extension:epic19`
  - aggregate inclusion in `smoke:extension`

## Validation
1) `npm run smoke:extension:epic19`
2) `npm run smoke:extension`

## Notes
- This slice validates intent semantics directly from code exports, reducing regression risk for chat-command routing.
