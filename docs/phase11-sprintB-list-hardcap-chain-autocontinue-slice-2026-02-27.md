# Phase 11 Sprint B - List Hard-Cap Chain Auto-Continue Slice (2026-02-27)

## Scope
Remove manual rerun dependency when exhaustive list extraction reaches hard safety caps, while keeping bounded safeguards.

## Implementation
1) Hard-cap auto-resume chaining in list runtime
- Updated:
  - `packages/extension/background/list-extraction-engine.mjs`
- changes:
  - added hard-cap chain controls:
    - `hardCapAutoContinue`
    - `hardCapAutoContinueMaxChains`
    - `hardRoundAbsoluteLimit`
  - when an exhaustive run reaches `hardRoundCap`, runtime can extend the effective hard cap in bounded chains
  - chain continuation remains inside the same automation run/table path
  - progress and summary telemetry now include:
    - `hardCapAutoContinueUsed`
    - `hardCapAutoContinueMaxChains`
    - `hardRoundAbsoluteLimit`
    - `effectiveHardRoundCap`

2) Sidepanel quick-flow defaults and plumbing
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- changes:
  - quick-flow now sends hard-cap chain controls in list load-more config
  - exhaustive defaults include bounded hard-cap auto-resume settings for autonomous continuation
  - status/telemetry now surface hard-cap auto-resume configuration

3) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic69.mjs`
- Updated:
  - `package.json`
    - added script `smoke:extension:epic69`
    - aggregate `smoke:extension` now includes `epic69`

## Validation
1) `node --check packages/extension/background/list-extraction-engine.mjs`
2) `node --check packages/extension/sidepanel/index.mjs`
3) `node --check scripts/smoke-extension-epic69.mjs`
4) `npm run smoke:extension:epic69`
5) `npm run smoke:extension`

## Notes
- This keeps continuation autonomous without removing safety limits.
- Absolute ceiling still enforces upper-bounded runtime behavior.
