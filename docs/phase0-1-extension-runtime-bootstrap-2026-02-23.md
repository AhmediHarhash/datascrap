# Phase 0-1 Extension Runtime Bootstrap (2026-02-23)

## Scope
Ship the first implementation slice for:
- Epic 0 (foundation skeleton + contracts + storage)
- Epic 1 (core automation runtime lifecycle + permissions + runner registry)

## Implemented

1. Monorepo package skeleton
- `packages/shared`
- `packages/core`
- `packages/storage`
- `packages/extension`

2. Frozen message/event contracts
- `packages/shared/src/events.mjs`
- `packages/shared/src/messages.mjs`

3. Core runtime orchestration
- lifecycle machine and state transitions
- runner registry:
  - `listExtractor`
  - `pageExtractor`
  - `metadataExtractor`
- start/stop/rerun API surface
- runtime event streaming callbacks
- permission gate integration before execution
- files:
  - `packages/core/src/lifecycle-machine.mjs`
  - `packages/core/src/runner-registry.mjs`
  - `packages/core/src/permission-manager.mjs`
  - `packages/core/src/automation-runtime.mjs`

4. Storage layer with migration model
- IndexedDB schema and migration registry:
  - stores: `automations`, `tableData`, `tableRows`
  - dedupe semantics on table rows via `tableDataId + rowHash`
- memory fallback backend for CLI smoke tests
- files:
  - `packages/storage/src/migrations.mjs`
  - `packages/storage/src/indexeddb-backend.mjs`
  - `packages/storage/src/memory-backend.mjs`
  - `packages/storage/src/storage-client.mjs`

5. MV3 extension shell
- background service worker:
  - message handlers for list/start/stop/rerun/snapshot
  - sidepanel open-on-action install behavior
  - runtime event forwarding to UI
- sidepanel shell:
  - runner selector
  - start URL + bulk URL input
  - start/stop/rerun controls
  - live event stream log
- files:
  - `packages/extension/manifest.json`
  - `packages/extension/background/service-worker.mjs`
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
  - `packages/extension/sidepanel/styles.css`

6. No-bundler vendor sync flow
- source packages are copied into extension runtime path:
  - `packages/extension/vendor/shared`
  - `packages/extension/vendor/core`
  - `packages/extension/vendor/storage`
- script:
  - `scripts/sync-extension-packages.mjs`

## Validation

1. Syntax checks
- `node --check` passed for all new runtime/storage/extension scripts.

2. Storage smoke
- command: `npm run smoke:extension:storage`
- result: passed
- dedupe verification:
  - inserted `2`
  - skipped `1`

3. Runtime smoke
- command: `npm run smoke:extension:runtime`
- result: passed
- verified:
  - start flow
  - progress event emission
  - stop flow
  - rerun flow
  - snapshot includes persisted automations

4. Vendor sync
- command: `npm run sync:extension`
- result: passed
- vendor tree materialized under `packages/extension/vendor`.

## Notes
- CLI smoke tests use memory backend because Node runtime does not expose IndexedDB.
- Extension runtime uses IndexedDB backend automatically in Chrome.
