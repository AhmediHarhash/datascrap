# Phase 11 Sprint B - Intent Result Target Slice (2026-02-24)

## Scope
Improve autonomous extraction so conversational commands can request a numeric result count with zero manual configuration:
- parse targets like `120 results` / `top 50`
- tune list autopilot behavior for target/exhaustive commands
- enforce row-cap completion in list extraction runtime
- apply maps `maxResults` from intent target

## Implementation
1) Goal parser numeric target extraction
- Updated:
  - `packages/core/src/autonomous-orchestrator.mjs`
  - `packages/extension/vendor/core/src/autonomous-orchestrator.mjs`
- Added:
  - `parseResultTarget` with bounded target parsing
  - `resultTarget` on parsed goal output
  - plan summary enrichment (`resultTarget=...`)

2) Sidepanel autonomous tuning
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - `resolveIntentResultTarget`
  - `buildListAutopilotOverridesFromIntent`
  - list quick-extract start now passes load-more overrides (`attempts`, `noChangeThreshold`, `maxRows`)
  - maps quick-extract start now passes `mapsOptions.maxResults` when target present
  - `onStart`/config builders now accept scoped overrides for list/page runs

3) List runtime row-cap support
- Updated:
  - `packages/extension/background/list-extraction-engine.mjs`
- Added:
  - load-more config `maxRows` normalization
  - early-stop when row cap reached
  - summary/progress metadata includes `rowCapHit`

4) Smoke coverage
- Updated:
  - `scripts/smoke-extension-epic19.mjs` (new result-target scenario)
  - `package.json` (`smoke:extension` chain + `smoke:extension:epic23`)
- Added:
  - `scripts/smoke-extension-epic23.mjs`

## Validation
1) `node --check packages/core/src/autonomous-orchestrator.mjs`
2) `node --check packages/extension/vendor/core/src/autonomous-orchestrator.mjs`
3) `node --check packages/extension/sidepanel/index.mjs`
4) `node --check packages/extension/background/list-extraction-engine.mjs`
5) `npm run smoke:extension:epic19`
6) `npm run smoke:extension:epic23`
7) `npm run smoke:extension`

## Notes
- Targeted runs stop as soon as the requested cap is reached; exhaustive mode remains available when no target is set.
- Manual/non-intent starts remain unchanged unless explicit overrides are passed.
