# Ultimate Web Scraper - Full Feature Inventory (Installed Extension)

## Scope
- Source package inspected:
  - `%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Extensions\\pdeldjlcnhallaapdggcmhpailpnnkmg\\5.9.5_0`
- Build/version:
  - `version: 5.9.5`
  - `version_name: 2.1`
- Purpose:
  - verify real shipped feature set from installed extension bundle
  - identify parity-plan gaps for strict one-to-one implementation

## What Was Inspected
- `manifest.json`
- `background.bundle.js`
- `sidepanel.bundle.js`
- `pageElementPicker.bundle.js`
- `281.bundle.js`
- `_locales/*`
- `public/*` assets

## Verified Feature Inventory

### 1) Extension Runtime / Platform
- MV3 with service worker background.
- Side panel app (`sidepanel.html` + `sidepanel.bundle.js`).
- Required permissions:
  - `activeTab`, `scripting`, `storage`, `sidePanel`
- Optional permissions:
  - host origins `<all_urls>`
  - `downloads`
  - `clipboardWrite`

### 2) Automation Protocol + Runners
- Message protocol includes:
  - `OPEN_SIDE_PANEL`, `SIDEPANEL_READY`, `SIDEPANEL_CLOSING`
  - `START_AUTOMATION`, `STOP_AUTOMATION`, `STOP_AUTOMATION_BY_ID`, `RERUN_AUTOMATION`
  - `GET_AUTOMATION_RUNNERS`, `PING_BACKGROUND`, `WAKE_UP_BACKGROUND`
  - `LICENSE_REGISTERED`, `BROADCAST_LICENSE_UPDATE`
- Event model includes:
  - `AUTOMATION_START`, `AUTOMATION_PROGRESS`, `AUTOMATION_COMPLETED`, `AUTOMATION_ERROR`, `AUTOMATION_STOP`
  - picker events
- Runner keys:
  - `listExtractor`
  - `pageExtractor`
  - `metadataExtractor`
- Action keys:
  - `EXTRACT_LIST`, `LOAD_MORE`
  - `EXTRACT_PAGES`, `EXTRACT_PAGES_EMAIL`, `EXTRACT_PAGES_PHONE`, `EXTRACT_PAGES_TEXT`, `EXTRACT_PAGES_GOOGLE_MAPS`

### 3) Core Tool Modules In UI
- `LIST EXTRACTOR`
- `PAGE DETAILS EXTRACTOR`
- `EMAIL EXTRACTOR`
- `IMAGE DOWNLOADER`
- `PAGE TEXT EXTRACTOR`

### 4) List Extractor Capabilities
- Container/item selection workflow.
- `LOAD_MORE` methods:
  - `scroll`, `navigate`, `click_button`, `none`
- Speed/profile system:
  - `slow`, `normal`, `fast`
  - profile editor + reset defaults

### 5) Page/Bulk Extractor Capabilities
- URL sources:
  - `manual`
  - `csv`
  - `datasource`
- CSV/data-source UX:
  - CSV column selection modal
  - `Select URLs from Previous Extract` flow
- Runtime knobs observed:
  - `maxConcurrentTabs`
  - `delayBetweenRequests`
  - `timeoutPerPage`
  - `pageLoadTimeout`
  - `elementWaitTimeout`
  - randomization controls (`enableRandomization`, `delayRandomizationRange`, min/max random delay)

### 6) Email Extractor Capabilities
- Deep scan options:
  - `enableSubPageScanning`
  - `maxDepth`
  - `maxLinksPerPage`
  - `stayOnDomain`
  - `subPageLinkSelectors`
- Email processing options:
  - `removeDuplicates`
  - `toLowerCase`
  - `basicValidation`
  - `includeMailtoLinks`
  - `domainFilters`
- Pro upsell switch observed:
  - `Faster Extraction` / `PRO`

### 7) Text Extractor Capabilities
- Config flags observed:
  - `includeMetadata`
  - `cleanText`
  - `removeAds`
  - `removeNavigation`
- UI promises include title/author/date/word-count oriented output.

### 8) Google Maps Extraction Capabilities
- Smart extraction options object observed:
  - `placeImages`
  - `contactDetails`
  - `basicInfo`
  - `reviews`
  - `hours`
  - `location`
- Standard-vs-smart flow + upgrade gating tracked in telemetry events.

### 9) Image Downloader Capabilities
- Scan/group images by dimensions.
- Filters include size/type/extension/alt-text + search.
- Download options include:
  - `Download Mode`
  - `Download all images`
  - `Select specific columns`
  - `File Naming Pattern`
- Progress + failed-download modal (`Failed Downloads`).

### 10) Data Table / Data Management Capabilities
- IndexedDB:
  - `ultimateWebScraperDB`
  - stores `automations`, `tableData`, `tableRows`
  - unique dedupe index by `tableDataId + dataHash`
- Table processing options observed:
  - `removeEmptyRows`
  - `removeEmptyColumns`
  - `removeRepeatingColumns`
  - `removeDuplicateColumns`
  - `prioritizeDataDensity`
  - `hideMostlyEmptyColumns` threshold
  - `includeImages`
- Merge-columns workflow observed:
  - `showMergeColumnPanel`
  - `Merge Columns`
  - merge name + separator inputs
- Persisted table UI state keys observed:
  - `panda_data_table_theme`
  - `panda_column_widths`
  - `panda_datatable_filters`
  - `panda_datatable_show_filters`

### 11) Export / Delivery Capabilities
- Export pathways observed:
  - CSV
  - XLSX
  - JSON
  - clipboard copy
  - Google Sheets flow

### 12) Licensing / Pro / Device Management
- API host:
  - `https://api.pandaextract.com`
- Endpoints observed:
  - `/api/config`
  - `/api/devices`
  - `/api/devices/validate-devices`
  - `/api/devices/remove`
  - `/api/devices/rename`
- Local license/device keys:
  - `license`
  - `deviceId`
  - `deviceInfo`
  - `license_validation_cache`
- Error classes:
  - `INVALID_LICENSE`
  - `MAX_DEVICES`
  - `NETWORK_ERROR`
  - `UNEXPECTED_ERROR`

### 13) Onboarding / UX Shell / Roadmap
- Main nav labels:
  - `MENU`, `HISTORY`, `DATA`, `Tools`, `latest changes`
- Welcome/tutorial shell:
  - `QUICK START`
  - `START EXTRACTING`
  - first 3 visits notice
  - video tutorial cards (`Watch: ...`)
- Roadmap block:
  - `Roadmap 2026`
  - `Scheduling` / `Integrations`
  - `In Progress`, `Launching Q1 2026`
  - `Notify` flow + tracking event (`roadmap_notify_clicked`)

### 14) Picker UX / Interaction Details
- `Selection Mode` and `Click Mode`.
- multi-element queue + edit/remove.
- keyboard/interactions:
  - ESC finish flow
  - parent expansion hint
  - draggable panel

### 15) Analytics / Tracking / Observability Signals
- Telemetry functions observed (examples):
  - `trackQuickExtractionStarted`
  - `trackPageExtractionStarted`
  - `trackEmailExtractionStarted`
  - `trackTextExtractionStarted`
  - `trackImagePageScanCompleted`
  - `trackExportClicked`
  - `trackRatingDialogOpened`
  - `trackUpsellModalOpened`
  - `trackComingSoonNotifyClicked`
- PostHog/Sentry references present in sidepanel bundle.

### 16) Localization / Asset Surface
- Locale folders observed: 47.
- Browser-support assets present:
  - `public/chrome.svg`
  - `public/edge.svg`
  - `public/brave.svg`
- Sample data module present (`281.bundle.js`) with demo e-commerce table rows.

## Net New Gaps Found In This Pass (vs prior plan docs)
- Email post-processing/domain-filter controls were not fully captured.
- Data-table cleanup/density shaping controls were not fully captured.
- Merge-columns workflow in Data Table was not explicitly captured.
- Device list/remove/rename management flow was underspecified.
- Picker keyboard/micro-interaction nuance was underspecified.

## Evidence Artifacts Generated
- `docs/_uws_strings/sidepanel-ui-labels-2026-02-22.txt`
- `docs/_uws_strings/background-tokens-2026-02-22.txt`
- `docs/_uws_strings/picker-ui-labels-2026-02-22.txt`
