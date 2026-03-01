# Phase 11 Sprint B - Maps Two-Stage Auto-Enrichment Slice (2026-02-26)

## Scope
Upgrade one-command Google Maps quick-flow to run as a two-stage pipeline:
1) gather map place URLs from search results
2) automatically enrich place details (phone, website, hours, etc.) on those URLs before final export

## Implementation
1) Intent maps enrichment state + lifecycle
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- added state:
  - `intentAutoMapsDetailEnrichPending`
  - `intentAutoMapsDetailEnrichAutomationId`
- behavior:
  - maps quick-flow sets enrichment pending at stage start
  - terminal events clear stale pending state on stop/error
  - enrichment completion clears pending/running markers

2) Two-stage orchestration helpers
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- added:
  - `resolveMapsPlaceUrlsFromSummary(summary)`
  - `startIntentMapsDetailEnrichment(urls, sourceAutomationId)`
  - `maybeHandleIntentMapsDetailEnrichment(eventPayload)`
- stage-2 launch rules:
  - trigger only on completed maps run with pending enrichment
  - source URLs from summary `successfulUrls` fallback `inputUrls`
  - filter to Google Maps place URLs
  - start page extractor with maps action in detail mode (`autoScrollResults=false`, `untilNoMore=false`)

3) Export sequencing
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- behavior:
  - export is deferred while stage-2 enrichment starts/runs
  - export proceeds after enrichment completion when auto-export is enabled

4) Telemetry
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- events:
  - `quick_extract_maps_enrichment_starting`
  - `quick_extract_maps_enrichment_started`
  - `quick_extract_maps_enrichment_completed`
- quick extract start metadata includes:
  - `autoMapDetailsEnrichPlanned`

5) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic65.mjs`
- Updated:
  - `package.json`
    - added `smoke:extension:epic65`
    - aggregate `smoke:extension` now includes `epic65`

## Validation
1) `node --check packages/extension/sidepanel/index.mjs`
2) `node --check scripts/smoke-extension-epic65.mjs`
3) `npm run smoke:extension:epic65`
4) `npm run smoke:extension`

## Notes
- Stage-2 enrichment is bounded (max 2000 discovered place URLs) to keep runs predictable.
- If stage-2 cannot start, the flow safely falls back to standard completion/export behavior.
