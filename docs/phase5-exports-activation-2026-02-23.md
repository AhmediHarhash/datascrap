# Phase 5 Extension Slice - Exports + Activation (2026-02-23)

## Scope
Deliver Epic 5 baseline in the extension:
- export formats (`CSV`, `XLSX`, `JSON`)
- clipboard + Google Sheets output flow
- image download scan/filter/download flow
- activation/control-plane integration (auth/license/device operations)

## Implemented

1) Export service and contracts
- New background export service:
  - `packages/extension/background/export-service.mjs`
- Supports:
  - file exports: `csv`, `xlsx`, `json`
  - clipboard export payload (tab-separated table text)
- New message contracts:
  - `TABLE_EXPORT_*`
  - `TABLE_EXPORT_CLIPBOARD_*`
- Files:
  - `packages/shared/src/messages.mjs`
  - `packages/extension/background/service-worker.mjs`

2) XLSX generation from scratch (no external dependency)
- Implemented a minimal OpenXML workbook writer:
  - worksheet, workbook, styles, relationships, content-types
  - ZIP container with uncompressed entries and CRC32
- Ensures valid `.xlsx` download payloads from local table data.

3) Image downloader service
- New background service:
  - `packages/extension/background/image-downloader-service.mjs`
- Features:
  - active-tab image scan (`document.images`)
  - dedupe + normalization
  - filters by search, min width/height, extension, size category, alt-text state
  - naming pattern templates:
    - `{index}`, `{width}`, `{height}`, `{ext}`, `{host}`, `{alt}`
  - download progress events + failed item capture
- Message contracts:
  - `IMAGE_SCAN_*`
  - `IMAGE_DOWNLOAD_*`
  - `IMAGE_DOWNLOAD_PROGRESS_EVENT`

4) Activation integration
- New background activation service:
  - `packages/extension/background/activation-service.mjs`
- Persisted local activation session in extension storage:
  - API base URL
  - device id/name
  - license key
  - access/refresh token state
  - user/account snapshot
- API operations wired:
  - auth: register/login/logout/refresh-profile
  - license: register/status
  - devices: validate/list/remove/rename
- Message contracts:
  - `ACTIVATION_*`

5) Sidepanel UI for Epic 5
- Added panels:
  - `Export & Output`
  - `Image Downloader`
  - `Activation`
- Added controls/events for all new background operations.
- Files:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
  - `packages/extension/sidepanel/styles.css`

6) Permission model extension
- Added optional permission operations:
  - `export.file` -> `downloads`
  - `clipboard.write` -> `clipboardWrite`
  - `network.api` -> host-origin request
- File:
  - `packages/core/src/permission-manager.mjs`

## Validation

1) Epic 5 export serialization smoke
- command:
  - `npm run smoke:extension:epic5`
- verifies:
  - CSV escaping
  - JSON integrity
  - XLSX ZIP/signature and workbook payload presence

2) Full extension smoke suite
- command:
  - `npm run smoke:extension`
- includes:
  - storage smoke
  - runtime smoke
  - Epic 5 export smoke

3) Vendor sync
- command:
  - `npm run sync:extension`
- updates extension runtime vendor copies for shared/core/storage contract alignment.

## Notes
- Clipboard write flow remains local-first; no cloud row storage is introduced.
- Activation APIs are configurable by API base URL and use local persisted session state.
- Image downloads remain client-executed on user devices.
