# Phase 11 Sprint B - List Two-Stage URL Enrichment Slice (2026-02-26)

## Scope
Extend one-command list quick-flow with automatic stage-2 URL enrichment:
1) stage 1 extracts list/table rows
2) stage 2 auto-processes discovered URLs for metadata + contact signals before export

## Implementation
1) List enrichment state and planning
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- added state:
  - `intentAutoListUrlEnrichPending`
  - `intentAutoListUrlEnrichAutomationId`
- behavior:
  - list quick-flow marks stage-2 enrichment plan when eligible
  - map-oriented intents are excluded from this list-stage enrichment path

2) URL discovery from extracted rows
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- added:
  - `AUTO_URL_ENRICHMENT_MAX_URLS=500`
  - URL parsing + normalization helpers
  - search-host filtering (`google/bing/duckduckgo/yahoo/yandex`) to avoid recycling SERP links
  - `resolveUrlsFromTableRows(...)` reads URLs from `rowData` and row `sourceUrl`

3) Stage-2 metadata/contact enrichment
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- added:
  - `startIntentListUrlEnrichment(urls, sourceAutomationId)`
  - `maybeHandleIntentListUrlEnrichment(eventPayload)`
- behavior:
  - runs metadata extractor automatically with manual URL source
  - forces contact-signal metadata options on
  - emits lifecycle telemetry:
    - `quick_extract_url_enrichment_starting`
    - `quick_extract_url_enrichment_started`
    - `quick_extract_url_enrichment_completed`

4) Export sequencing
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- behavior:
  - terminal handler now chains:
    1) maps enrichment transition
    2) list URL enrichment transition
  - auto-export proceeds only when neither transition defers completion

5) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic66.mjs`
- Updated:
  - `package.json`
    - added `smoke:extension:epic66`
    - aggregate `smoke:extension` now includes `epic66`

## Validation
1) `node --check packages/extension/sidepanel/index.mjs`
2) `node --check scripts/smoke-extension-epic66.mjs`
3) `npm run smoke:extension:epic66`
4) `npm run smoke:extension`

## Notes
- URL enrichment is bounded at 500 discovered URLs per stage for predictable runtime.
- If enrichment cannot start, flow safely falls back to normal completion/export path.
