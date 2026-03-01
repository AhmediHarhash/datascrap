# Phase 11 Sprint B - Autonomous Orchestrator Slice (2026-02-24)

## Scope
Implement the first production slice of chat-driven orchestration so users can type natural requests and let Datascrap choose the best extraction path:
- conversational intent parsing for extract/access/export/local-lead requests
- strategy planning (`maps`, `page`, `list`, `point-follow`, `access`, `export`)
- sidepanel execution wiring with phase/progress handoff across autonomous flows

## Implementation
1) Core orchestrator module
- Added:
  - `packages/core/src/autonomous-orchestrator.mjs`
  - `packages/extension/vendor/core/src/autonomous-orchestrator.mjs`
- Added capabilities:
  - parse chat-style commands (`"I want info for ..."`, `"find me ..."`, `"looking for ..."`)
  - infer extraction intent without requiring explicit scraper verbs
  - build discovery URLs (Google Search / Google Maps)
  - apply fresh-intent search bias (`latest` / `up to date` / `recent` -> Google recency filter)
  - produce execution plans with strategy + phase map
  - summarize plans for sidepanel logging/diagnostics

2) Core exports
- Updated:
  - `packages/core/src/index.mjs`
  - `packages/extension/vendor/core/src/index.mjs`
- Exported orchestrator module from both source trees.

3) Sidepanel autonomous execution wiring
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - orchestration state cache (`lastOrchestrationPlan`, `lastOrchestrationAt`)
  - orchestration helpers (`setOrchestrationPhase`, active-tab target navigation, plan caching)
  - `onIntentCommandRun` plan-first routing
  - `onQuickExtract` strategy execution branches:
    - `PAGE_AUTOPILOT` for email/phone/text/metadata extraction
    - `MAPS_AUTOPILOT` for Google Maps/local-lead extraction
    - `LIST_AUTODETECT_AUTOPILOT` with Point & Follow fallback
  - orchestration phase updates for access preflight/start/monitoring

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic16.mjs`
- Updated:
  - `package.json` (`smoke:extension:epic16`, included in `smoke:extension`)

## Validation
1) `node --check packages/extension/sidepanel/index.mjs`
2) `npm run smoke:extension:epic16`

## Notes
- Maps intents now prioritize discovery URL targets so stale non-maps start URLs do not hijack local-lead runs.
- This slice is orchestration-first and keeps existing extraction engines unchanged underneath.
