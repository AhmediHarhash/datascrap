# Phase 3 Page/Bulk Extraction Slice (2026-02-23)

## Scope
Deliver Epic 3 baseline:
- page/bulk extraction engine with queue controls
- URL source modes (`manual`, `csv`, `datasource`)
- sidepanel flow for action types and queue configuration
- background data-source resolution from local table data

## Implemented

1. Shared contracts extended
- URL source mode constants:
  - `manual`
  - `csv`
  - `datasource`
- page action type constants:
  - `EXTRACT_PAGES`
  - `EXTRACT_PAGES_EMAIL`
  - `EXTRACT_PAGES_PHONE`
  - `EXTRACT_PAGES_TEXT`
  - `EXTRACT_PAGES_GOOGLE_MAPS`
- datasource message contracts:
  - `DATA_SOURCE_LIST_*`
  - `DATA_SOURCE_URLS_*`
- files:
  - `packages/shared/src/events.mjs`
  - `packages/shared/src/messages.mjs`

2. Core runtime page-engine delegation
- `pageExtractorRunner` now delegates to capability engine when provided:
  - `capabilities.pageExtractionEngine.extractPages(...)`
- runtime permission context now uses first bulk URL when `startUrl` is absent.
- files:
  - `packages/core/src/runners/page-extractor-runner.mjs`
  - `packages/core/src/automation-runtime.mjs`

3. Background page extraction engine
- concurrent worker queue for bulk URL tasks.
- queue controls implemented:
  - `maxConcurrentTabs`
  - `delayBetweenRequestsMs`
  - `pageTimeoutMs`
  - `maxRetries`
  - `retryDelayMs`
  - `jitterMs`
  - `waitForPageLoad`
  - `waitForSelector`
  - `waitForSelectorTimeoutMs`
- extraction modes implemented in page context:
  - custom field extraction (`EXTRACT_PAGES`)
  - email extraction
  - phone extraction
  - text extraction (title/description/author/publishDate/content/wordCount)
  - maps-oriented extraction baseline
- files:
  - `packages/extension/background/page-extraction-engine.mjs`
  - `packages/extension/background/chrome-utils.mjs`

4. Background datasource service
- list local table data entries for datasource picker.
- resolve URL columns and URL values from existing `tableRows`.
- files:
  - `packages/extension/background/datasource-service.mjs`
  - `packages/extension/background/service-worker.mjs` (handlers wired)

5. Sidepanel Epic 3 UI
- page extractor config panel:
  - URL source mode selector
  - CSV file ingest + parsed URL count
  - datasource table picker + column picker + URL loading
  - action type selector
  - custom page field picker/list (for `EXTRACT_PAGES`)
  - queue tuning controls
- list/page panel visibility now follows selected runner.
- files:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
  - `packages/extension/sidepanel/styles.css`
  - `packages/extension/manifest.json` (added `tabs` permission)

6. Storage surface extension
- added `tableData.list(...)` to indexeddb and memory backends for datasource listing.
- files:
  - `packages/storage/src/indexeddb-backend.mjs`
  - `packages/storage/src/memory-backend.mjs`

## Validation

1. Syntax checks
- `node --check` passed for all changed core/background/sidepanel/storage scripts.

2. Vendor sync
- command: `npm run sync:extension`
- result: passed

3. Extension smoke suite
- command: `npm run smoke:extension`
- result: passed
- runtime smoke now verifies:
  - list engine capability path
  - page engine capability path

## Notes
- Datasource mode is fully local-first and reads from extension local table storage.
- Queue model is designed for batch robustness first; advanced anti-bot/retry strategy tuning can be layered later.
