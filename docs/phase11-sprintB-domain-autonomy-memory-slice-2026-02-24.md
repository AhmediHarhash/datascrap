# Phase 11 Sprint B - Domain Autonomy Memory Slice (2026-02-24)

## Scope
Add host-level execution memory so autonomous list intents can adapt per-domain over time:
- persist domain strategy hints in sidepanel storage
- apply hint-based strategy override for future intents on the same domain
- continuously learn from quick-extract outcomes (list success vs guidance-required)

## Implementation
1) Domain hint model + storage
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - `state.domainAutonomyHints`
  - storage key + TTL constants:
    - `DOMAIN_AUTONOMY_HINTS_STORAGE_KEY`
    - `DOMAIN_AUTONOMY_HINT_TTL_MS`
  - helper pipeline:
    - host normalization
    - record normalization + TTL pruning
    - load/save persistence helpers

2) Intent orchestration override
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Added behavior:
  - after `createAutonomousExecutionPlan`, `applyDomainAutonomyHintToPlan` can switch
    `LIST_AUTODETECT_AUTOPILOT` -> `POINT_FOLLOW_GUIDED`
    when domain memory indicates guidance performs better
  - orchestration status line indicates when domain memory is applied

3) Runtime learning hooks
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Added behavior:
  - quick-extract fallback paths now record domain hints:
    - list autodetect start success -> remember list autopilot
    - autodetect/start failures -> remember point-follow guidance
  - point-follow readiness path also records guidance success
  - hint update telemetry event:
    - `domain_autonomy_hint_updated`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic22.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic22`
    - aggregate `smoke:extension` now includes `epic22`

## Validation
1) `node --check packages/extension/sidepanel/index.mjs`
2) `npm run smoke:extension:epic22`
3) `npm run smoke:extension`

## Notes
- Strategy memory is intentionally constrained to host-level list/guided choices.
- Explicit command intents (maps/page/export/access) still take precedence over memory.
