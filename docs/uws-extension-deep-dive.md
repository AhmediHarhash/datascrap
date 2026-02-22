# Ultimate Web Scraper Installed Extension - Deep Dive

## Scope
- This is a behavior/architecture reverse map of the installed package at:
  - `%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Extensions\\pdeldjlcnhallaapdggcmhpailpnnkmg\\5.9.5_0`
- Objective: enable clean-room one-to-one implementation parity.

## Package Inventory
- Core bundles:
  - `background.bundle.js`
  - `sidepanel.bundle.js`
  - `pageElementPicker.bundle.js`
  - `content.bundle.js` (empty)
  - `281.bundle.js` (sample data initializer)
- UI container:
  - `sidepanel.html`
- Metadata/signing:
  - `_metadata/verified_contents.json`
  - `_metadata/computed_hashes.json`
- Locales:
  - `_locales/*/messages.json` (many languages)

## Manifest-Level Runtime Model
- MV3 extension with:
  - background service worker (`type: module`)
  - side panel UI (`sidepanel.html`)
- Required permissions:
  - `activeTab`, `scripting`, `storage`, `sidePanel`
- Optional permissions:
  - optional host permissions (`<all_urls>`)
  - `downloads`, `clipboardWrite`

## Background Message Protocol
- Handled request types:
  - `OPEN_SIDE_PANEL`
  - `SIDEPANEL_READY`
  - `SIDEPANEL_CLOSING`
  - `START_AUTOMATION`
  - `STOP_AUTOMATION`
  - `STOP_AUTOMATION_BY_ID`
  - `RERUN_AUTOMATION`
  - `GET_AUTOMATION_RUNNERS`
  - `PING_BACKGROUND`
  - `WAKE_UP_BACKGROUND`
  - `LICENSE_REGISTERED`
- Broadcast/update:
  - `BROADCAST_LICENSE_UPDATE` (used to sync pro state in UI)

## Automation Event Model
- Event bus includes:
  - `AUTOMATION_START`
  - `AUTOMATION_STARTED`
  - `AUTOMATION_PROGRESS`
  - `AUTOMATION_COMPLETED`
  - `AUTOMATION_ERROR`
  - `AUTOMATION_STOP`
  - `AUTOMATION_STOPPED`
  - picker events (`ELEMENT_PICKER_START/STOP/RESULT`)

## Runner Registry (Background)
- Registered runner keys observed:
  - `listExtractor`
  - `pageExtractor`
  - `metadataExtractor`
  - `default`

## Action Types / Strategy Mapping
- List runner actions:
  - `EXTRACT_LIST`
  - `LOAD_MORE`
- Page runner supported actions:
  - `EXTRACT_PAGES`
  - `EXTRACT_PAGES_EMAIL`
  - `EXTRACT_PAGES_PHONE`
  - `EXTRACT_PAGES_TEXT`
  - `EXTRACT_PAGES_GOOGLE_MAPS`
- Strategy factory mapping:
  - `EXTRACT_PAGES` -> custom selector extractor
  - `EXTRACT_PAGES_EMAIL` -> email extractor
  - `EXTRACT_PAGES_PHONE` -> phone extractor
  - `EXTRACT_PAGES_TEXT` -> text extractor
  - `EXTRACT_PAGES_GOOGLE_MAPS` -> maps extractor

## Validation Contracts (Page Actions)
- `EXTRACT_PAGES`:
  - requires non-empty `elements`
  - each element needs `selector` or `selectors`
- `EXTRACT_PAGES_EMAIL`:
  - `config.emailPatterns` must be array when present
- `EXTRACT_PAGES_PHONE`:
  - `config.phonePatterns` must be array when present
- `EXTRACT_PAGES_TEXT`:
  - `config.includeMetadata` must be boolean when present
- `EXTRACT_PAGES_GOOGLE_MAPS`:
  - `config.extractionOptions` must be object when present

## Sidepanel -> Background Payload Shapes

### List extraction
- `type: "START_AUTOMATION"`
- `runnerType: "listExtractor"`
- `actions`:
  - `EXTRACT_LIST` with selector/allSelectors
  - optional `LOAD_MORE` with method and tuning knobs
- `LOAD_MORE` methods:
  - `scroll`
  - `navigate`
  - `click_button`
  - `none`

### Page extraction (custom/pages/maps)
- `type: "START_AUTOMATION"`
- `runnerType: "pageExtractor"`
- `actions[0].type`: one of page action types above
- config includes concurrency, timeouts, randomization, and per-mode fields.

### Email extraction
- still uses `runnerType: "pageExtractor"`
- action type: `EXTRACT_PAGES_EMAIL`
- deep scan fields included:
  - `enableSubPageScanning`
  - `maxDepth`
  - `subPageLinkSelectors`
  - `stayOnDomain`
  - `maxLinksPerPage`

### Text extraction
- `runnerType: "pageExtractor"`
- action type: `EXTRACT_PAGES_TEXT`
- content-cleanup fields observed:
  - `includeMetadata`
  - `cleanText`
  - `removeAds`
  - `removeNavigation`

## URL Source Modes
- Observed values:
  - `manual`
  - `csv`
  - `datasource`

## Extraction Mode Values (UI State)
- Observed values:
  - `regular`
  - `google_maps`
  - `email`
  - `text`
  - `image`
  - `list`
  - `pages`
  - `metadata`

## Data Storage Model (IndexedDB)
- DB name:
  - `ultimateWebScraperDB`
- Stores:
  - `automations`
  - `tableData`
  - `tableRows`
- Notable semantics:
  - dedupe index: `tableDataId + dataHash` unique
  - table-level row batching
  - CSV export helper on stored rows
  - automation + table stats/recent activity

## Licensing / Device Binding
- Base URL constant:
  - `https://api.pandaextract.com`
- Endpoints observed:
  - `POST /api/devices/validate-devices`
  - `POST /api/devices`
  - `POST /api/devices/remove`
  - `POST /api/devices/rename`
- Local keys observed:
  - `license`
  - `deviceId`
  - `deviceInfo`
  - `license_validation_cache`
- Error types observed:
  - `INVALID_LICENSE`
  - `MAX_DEVICES`
  - `NETWORK_ERROR`
  - `UNEXPECTED_ERROR`
- Cache behavior:
  - validation cache TTL defaults to `432e5` (12 hours)

## Remote Config / Feature Flags
- Endpoint observed:
  - `GET /api/config` (same `api.pandaextract.com` base)
- Cached locally:
  - `appConfig`
  - `appConfigTimestamp`
- Flags observed in config state:
  - `isClipboardProOnly`
  - `isNewPricingEnabled`
  - `isLifetimeV2Enabled`
  - `showBlackFridayBanner`

## Billing / Upsell Wiring
- Stripe checkout URLs are hard-coded (multiple plan links).
- Pricing logic switches by config flags:
  - legacy lifetime
  - new pricing
  - lifetime v2
- enterprise path routes to support email flow.

## Export / Download Mechanics
- CSV and XLSX stack present (SheetJS included).
- Google Sheets flow:
  - creates/open sheets tab
  - polls readiness
  - copies data and prompts paste instructions
- Image download:
  - uses Chrome downloads API
  - progress + error aggregation modal

## Third-Party Signals In Bundle
- React runtime
- SheetJS (`xlsx.js`)
- Tailwind output
- PostHog stack present
- Sentry integration hooks present

## Implementation Implications For Our Clone
- Reproduce protocol contracts first (`START_AUTOMATION` payloads + event emissions).
- Keep runner/action boundaries identical to avoid behavior drift.
- Implement license and app-config abstractions with same local-state semantics.
- Preserve load-more tuning knobs (scroll/navigate/click_button) exactly.
- Preserve deep email subpage crawler controls and outputs.

## Second-Pass Verification (2026-02-22)
- Installed extension rechecked at:
  - `%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Extensions\\pdeldjlcnhallaapdggcmhpailpnnkmg\\5.9.5_0`
- Confirmed manifest:
  - `version: 5.9.5`
  - `version_name: 2.1`
  - MV3 service worker + side panel config unchanged from first pass.
- Reconfirmed protocol constants in `background.bundle.js`:
  - `OPEN_SIDE_PANEL`, `SIDEPANEL_READY`, `SIDEPANEL_CLOSING`
  - `START_AUTOMATION`, `STOP_AUTOMATION`, `STOP_AUTOMATION_BY_ID`, `RERUN_AUTOMATION`
  - `GET_AUTOMATION_RUNNERS`, `PING_BACKGROUND`, `WAKE_UP_BACKGROUND`, `LICENSE_REGISTERED`
  - `BROADCAST_LICENSE_UPDATE`
  - event keys: `AUTOMATION_START`, `AUTOMATION_PROGRESS`, `AUTOMATION_COMPLETED`, `AUTOMATION_ERROR`, `AUTOMATION_STOP`, picker events.
- Reconfirmed runner/action keys:
  - runners: `listExtractor`, `pageExtractor`, `metadataExtractor`
  - actions: `EXTRACT_LIST`, `LOAD_MORE`, `EXTRACT_PAGES`, `EXTRACT_PAGES_EMAIL`, `EXTRACT_PAGES_PHONE`, `EXTRACT_PAGES_TEXT`, `EXTRACT_PAGES_GOOGLE_MAPS`
- Reconfirmed sidepanel/backend config strings:
  - API host: `api.pandaextract.com`
  - endpoints: `/api/config`, `/api/devices`, `/api/devices/validate-devices`, `/api/devices/remove`, `/api/devices/rename`
  - IndexedDB keys: `ultimateWebScraperDB`, `automations`, `tableData`, `tableRows`
  - license keys: `deviceId`, `deviceInfo`, `license_validation_cache`
  - mode/source values: `manual`, `csv`, `datasource`, `regular`, `google_maps`, `email`, `text`, `image`, `list`, `pages`, `metadata`
- Reconfirmed integrations from bundle/license headers:
  - React runtime
  - SheetJS/xlsx
  - strings for `Google Sheets`, `clipboard`, `download`, `posthog`, `sentry`, and `buy.stripe.com`.

## Third-Pass Verification (2026-02-22, In-Depth)
- Package/footprint reconfirmed:
  - installed files: 69
  - locales: 47 (`ar ... zh`)
  - `content.bundle.js` is empty
  - side panel shell uses fixed viewport assumptions (`width=500`, `min-width: 400px`)
- Email extractor config depth reconfirmed:
  - deep scan fields: `enableSubPageScanning`, `maxDepth`, `maxLinksPerPage`, `stayOnDomain`, `subPageLinkSelectors`
  - post-processing fields: `removeDuplicates`, `toLowerCase`, `basicValidation`
  - additional filters: `includeMailtoLinks`, `domainFilters`
- Data table module capabilities reconfirmed:
  - cleanup/density options: `removeEmptyRows`, `removeEmptyColumns`, `removeRepeatingColumns`, `removeDuplicateColumns`, `prioritizeDataDensity`, `hideMostlyEmptyColumns`
  - image-in-table toggle observed (`includeImages`)
  - merge workflow observed (`showMergeColumnPanel`, `Merge Columns`, merge-name + separator controls)
  - persisted table-view state keys observed:
    - `panda_data_table_theme`
    - `panda_column_widths`
    - `panda_datatable_filters`
    - `panda_datatable_show_filters`
- Picker interaction nuance reconfirmed:
  - explicit `Click Mode` and `Selection Mode`
  - finish shortcut text and ESC behavior
  - parent expansion hint (up-arrow workflow)
  - draggable control panel (`drag-handle`) and editable selected element list
- Licensing/device management reconfirmed in sidepanel code:
  - methods include list devices + `removeDevice` + `renameDevice`
  - endpoint usage confirmed for `/api/devices`, `/api/devices/remove`, `/api/devices/rename`, `/api/devices/validate-devices`
- Roadmap and notify wiring reconfirmed:
  - roadmap labels/statuses (`Scheduling`, `Integrations`, `In Progress`, `Launching Q1 2026`)
  - notify flow tracking key `roadmap_notify_clicked` with external form URL
- Additional extracted artifacts generated in repo:
  - `docs/_uws_strings/sidepanel-ui-labels-2026-02-22.txt`
  - `docs/_uws_strings/background-tokens-2026-02-22.txt`
  - `docs/_uws_strings/picker-ui-labels-2026-02-22.txt`
