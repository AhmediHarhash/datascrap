# Ultimate Web Scraper Clone - One-to-One Parity Plan

## Goal
- Phase 1: Ship full one-to-one feature parity with the currently installed `Ultimate Web Scraper` extension behavior.
- Phase 2: Add custom improvements after parity is validated.
- Detailed missing-items audit is tracked in:
  - `docs/uws-comprehensive-gap-audit-2026-02-22.md`
- Premium post-parity architecture blueprint is tracked in:
  - `docs/uws-creme-architecture-2026.md`
- UI competitiveness and usability upgrade assessment is tracked in:
  - `docs/uws-ui-competitive-assessment-2026-02-22.md`
- Telemetry parity depth spec is tracked in:
  - `docs/uws-telemetry-parity-spec-mode2.md`
- Implementation backlog is tracked in:
  - `docs/uws-implementation-backlog-mode2.md`
- Benchmark suite definition is tracked in:
  - `docs/uws-benchmark-suite-spec-mode2.md`
- UI delta (similar vs improve) spec is tracked in:
  - `docs/uws-ui-delta-spec-mode2.md`
- Scope lock:
  - **Mode 2 selected on 2026-02-22**
  - Phase 1 includes installed-extension parity **and** website/store-claim parity
- Commercial/infra lock (2026-02-22):
  - One-plan model target (`$5/month`)
  - Max `2` active devices per account
  - Local-first data model
  - **No cloud row storage by us** for extracted datasets
  - Cloud persistence only for account/license/device/usage + optional lightweight settings sync
  - Extracted data can be sent to user-linked destinations (e.g., Google Sheets/API endpoints) when configured by user

## Source Of Truth Used For Parity
- Public product pages and docs on `ultimatewebscraper.com`.
- Installed Chrome extension package:
  - `manifest.json` (permissions/runtime model)
  - `background.bundle.js` (automation runners/actions)
  - `sidepanel.bundle.js` (UI modules/config/state)
  - `pageElementPicker.bundle.js` (picker behavior/extract modes)
  - `281.bundle.js` (data table/sample data model)

## Non-Negotiables
- Implement from scratch (no code/assets copy-paste).
- Match workflows, capabilities, and operational behavior.
- Keep module boundaries and data contracts stable so Phase 2 additions do not break parity.

## Phase 1 Parity Scope (Must Match)

### 1) Extension Platform + Permissions
- Chrome MV3 extension.
- Side panel UI architecture.
- Background service worker orchestration.
- Required permissions parity:
  - `activeTab`, `scripting`, `storage`, `sidePanel`
- Optional permissions parity:
  - host access (`<all_urls>` as optional host permission)
  - `downloads`
  - `clipboardWrite`

### 2) Core Automation Model
- Automation lifecycle:
  - start, progress, stop, complete, error, rerun
- Runner registry pattern:
  - `listExtractor`
  - `pageExtractor`
  - `metadataExtractor`
- Event bus model for status updates.
- Per-run context:
  - current automation ID
  - tableData ID
  - runner type

### 3) Data Layer (Local)
- IndexedDB with equivalent stores:
  - `automations`
  - `tableData`
  - `tableRows`
- Row de-duplication using `tableDataId + dataHash` unique semantics.
- Automation/table stats and recent activity.
- Table row edits + column updates.
- Data-table processing controls parity:
  - `removeEmptyRows`
  - `removeEmptyColumns`
  - `removeRepeatingColumns`
  - `removeDuplicateColumns`
  - `prioritizeDataDensity`
  - `hideMostlyEmptyColumns` threshold behavior
- Data-table merge flow parity:
  - merge-column modal
  - selected source columns
  - merged column name + separator config
- Persisted table UX state parity:
  - column widths
  - filter visibility + saved filters
- CSV export from stored rows.

### 4) Element Picker Parity
- Injected on-page overlay picker.
- Select multiple target elements.
- Action modes:
  - extract action
  - click action (with configurable wait)
- Selector model:
  - CSS selector
  - XPath selector
- Extract modes:
  - Auto/Smart extract
  - Text
  - Image URL
  - Link URL
  - Attributes (advanced)
- Attribute suggestions by tag type.
- Editable selected-element list.
- Keyboard/micro-interaction parity:
  - `ESC` finish behavior
  - parent expansion shortcut (up-arrow flow)
  - draggable control panel behavior

### 5) List Extractor Parity
- Build list extraction from selected container + fields.
- Requires action set parity:
  - `EXTRACT_LIST`
  - `LOAD_MORE`
- Load methods parity:
  - `scroll`
  - `navigate`
  - `click_button`
- Config parity for load strategies:
  - attempts
  - content/scroll/navigation delays
  - URL change timeout/polling
  - no-change thresholds
  - retry counts
  - content hash sampling controls
- Preset profiles parity:
  - slow
  - normal
  - fast

### 6) Page/Bulk Extractor Parity
- Bulk URL execution with tab queue + concurrency.
- Supported action types parity:
  - `EXTRACT_PAGES` (custom selectors)
  - `EXTRACT_PAGES_EMAIL`
  - `EXTRACT_PAGES_PHONE`
  - `EXTRACT_PAGES_TEXT`
  - `EXTRACT_PAGES_GOOGLE_MAPS`
- URL source modes parity:
  - `manual`
  - `csv`
  - `datasource`
- Runtime config parity:
  - max concurrent tabs
  - delay between requests
  - per-page timeout
  - wait for page load + timeout
  - wait for elements + timeout
  - randomization controls for delays

### 7) Email Extractor Parity
- Single-page email extraction.
- Sub-page deep scanning:
  - enable toggle
  - max depth
  - max links per page
  - stay on same domain
  - custom sub-page link selectors
- Email post-processing controls parity:
  - `removeDuplicates`
  - `toLowerCase`
  - `basicValidation`
  - `includeMailtoLinks`
  - domain filters input
- Unique email aggregation + domain breakdown outputs.

### 8) Text Extractor Parity
- Extract:
  - title
  - description
  - main content
  - word count
  - author
  - publish date
- Batch URL mode with progress and failures.

### 9) Image Extractor Parity
- Scan current page images.
- Group images by dimensions/size category.
- Filters parity:
  - search
  - min/max width/height
  - file extension
  - image type
  - size categories
  - has/has-not alt text
- Download features:
  - single image
  - group download
  - download all
  - progress modal + failed item reporting

### 10) Google Maps Extraction Parity
- Google Maps URL detection and flow.
- Standard extraction mode.
- Smart extraction options:
  - place images
  - contact details
  - basic info
  - reviews
  - hours
  - location
- Map place schema fields parity (name/rating/category/address/phone/website/hours/etc).

### 11) Export + Output Parity
- CSV export baseline (required).
- Excel/XLSX export parity (required).
- Clipboard workflow parity.
- Google Sheets flow parity (copy + open + paste guidance).

### 12) Licensing + Plan Gates Parity
- License key register/verify flow.
- Device identity and max-device handling.
- Device management parity:
  - list devices
  - remove device
  - rename device
- Pro-state broadcast/update flow.
- Feature gates where currently enforced.

### 13) UX/Operational Parity
- Side panel states:
  - ready/running/stopping/completed/error
- Progress updates with per-action details.
- Run interruption reliability (stop/cancel cleanup).
- Table/history continuity across sessions.

### 14) Home Hub + Welcome Screen UI Parity
- Main shell/navigation parity:
  - branding header/logo/tagline block
  - `MENU`, `HISTORY`, `DATA`, `Tools`, `latest changes` entry points
- Tool module cards/titles parity:
  - `LIST EXTRACTOR`
  - `PAGE DETAILS EXTRACTOR`
  - `EMAIL EXTRACTOR`
  - `IMAGE DOWNLOADER`
  - `PAGE TEXT EXTRACTOR`
- Roadmap panel parity in extension UI:
  - `Roadmap 2026` block
  - `Scheduling` and `Integrations` cards
  - status chips/text (`In progress • Launching Q1 2026`)
  - `Notify` actions
  - notify-flow wiring to external waitlist/interest form
  - roadmap bullet points (`Set custom intervals`, `Cloud-based execution`, `n8n workflow integration`, `Custom webhooks`, `API endpoints`)
- Per-tool welcome/hero screen parity:
  - heading/benefit layout
  - video tutorial card placement (`Watch: ...` quick demo card)
  - `QUICK START` 3-step guidance blocks
  - `START EXTRACTING` CTA position/behavior
  - first-visit notice behavior (`welcome screen shows for first 3 visits`)
- Email tool panel parity:
  - URL source choices: `Manual Input`, `Upload CSV`, `Data Source`
  - optional config card with `Deep Scanning`
  - pro-gated `Faster Extraction` control and upgrade flow
- Text tool panel parity:
  - clean-text + metadata messaging and quick-start flow for batch URLs

## Gap Addendum (Recheck 2026-02-22)

### A) Missing From Plan But Required For Extension 1:1
- Export parity must include `JSON` (not only CSV/XLSX/Sheets/clipboard).
- Add explicit `Metadata Extractor` parity section (currently only listed as runner):
  - JSON-LD/meta parsing path
  - metadata summary fields surfaced in UI/output
  - review/email/phone count signals where available
- `LOAD_MORE` method list must include `none` in addition to `scroll`, `navigate`, `click_button`.
- URL input parity needs explicit UX behaviors:
  - CSV column mapping/selection modal before run
  - data source mode from previous extraction tables
- Image flow parity needs table-driven download controls:
  - download mode (`all` vs specific columns)
  - naming pattern options
  - batch/progress/error modal behavior
- Add explicit `Phone Extractor` parity section (currently implied by action type only):
  - pattern config
  - deduped outputs + counts
- Add i18n parity requirement from packaged `_locales/*` resources (at least architecture-level parity for locale loading).
- Add automation profile editing/reset parity:
  - editable speed/settings profiles
  - reset profiles to defaults behavior
- Add sample data bootstrap parity:
  - first-run sample data initialization and management hooks
- Add email post-processing/domain-filter parity:
  - `removeDuplicates`, `toLowerCase`, `basicValidation`, `includeMailtoLinks`, `domainFilters`
- Add data-table cleanup/density parity:
  - remove empty/repeating/duplicate row/column shaping options
  - hidden-mostly-empty threshold behavior
- Add merge-columns workflow parity in Data Table.
- Add device-management parity:
  - list/remove/rename devices, not only register/validate key
- Add picker interaction nuance parity:
  - ESC/parent-expand shortcuts + draggable picker panel behavior
- Add core UX-shell parity (if UI should be one-to-one):
  - welcome/tutorial hints
  - rating/review prompts
  - coming-soon cards and upsell modal flows
  - roadmap module/cards with in-progress statuses and ETA labels
- Decide telemetry/observability parity level:
  - PostHog-style event tracking taxonomy
  - Sentry-style error reporting hooks

### B) Website-Claimed Gaps To Decide Scope (Extension Package Does Not Fully Confirm)
- Saved extraction templates / one-click re-run templates as a first-class feature.
- Advanced customization claims:
  - regex-based extraction presets
  - post-processing scripts
- Scheduling/automation and workflow integrations (e.g. webhook/n8n/Zapier style flows).
- Multi-browser distribution/support claims (Chrome + Firefox/Edge/Brave messaging on public site).
- Vertical prebuilt tool templates (job-board/review-use-case pages) as dedicated starter workflows.

### C) Scope Decision Rule
- If goal is strict **installed-extension parity**, items in **A** are mandatory for Phase 1 and **B** can be Phase 2 unless bundle evidence confirms otherwise.
- If goal is strict **website-claim parity**, both **A + B** move into Phase 1 and delivery size increases materially.

## Architecture Blueprint For Our Build

### A) Packages
- `packages/extension`
  - `background/` service worker
  - `sidepanel/` React app
  - `content/` page interaction helpers
  - `picker/` injected picker overlay
- `packages/core`
  - automation engine
  - runner interfaces and implementations
  - extraction strategies
  - selector utilities
  - normalization and row hashing
- `packages/storage`
  - IndexedDB schema + repositories
- `packages/shared`
  - message contracts
  - event types
  - common types
- `packages/licensing` (optional local-only first, API-ready boundary)

### B) Critical Interfaces
- `AutomationRunner.execute(context): RunResult`
- `ExtractorStrategy.extract(url, config): ExtractResult`
- `TableRepository.storeRows(tableId, rows): StoreSummary`
- `PermissionManager.ensure(operation): PermissionResult`
- `PickerSession.start()/finish(): PickerResult`

### C) Messaging Contracts
- Background actions:
  - open side panel
  - start/stop/rerun automation
  - list runners
- Runtime events:
  - progress
  - completed
  - failed
  - stopped
  - license updated

## Delivery Plan

### Milestone 0 - Spec Lock
- Freeze parity checklist.
- Define all message/data contracts.
- Sign off on acceptance tests.

### Milestone 1 - Platform Skeleton
- MV3 setup, side panel shell, background worker, permission flows.
- IndexedDB schema and repositories.

### Milestone 2 - Picker + List Extractor
- Full picker workflow.
- `EXTRACT_LIST` + `LOAD_MORE` methods.
- Store rows + table view + CSV export.

### Milestone 3 - Page/Bulk Runner + Email/Text/Phone/Maps
- URL source modes.
- All page action types + config controls.
- Progress tracking and failure handling.

### Milestone 4 - Image Extractor + Exports
- Image scan/filter/download flows.
- XLSX + Google Sheets parity.

### Milestone 5 - Licensing + Final Parity QA
- License and gating behaviors.
- Full parity regression suite.
- Release candidate.

## Acceptance Criteria (Phase 1)
- Every Phase 1 feature above is present and test-passing.
- Parity tests pass on 10+ real-world target sites across:
  - ecommerce listing pages
  - infinite-scroll feeds
  - classic paginated lists
  - article/text pages
  - contact pages
  - Google Maps place pages
- No critical regressions in stop/retry/rerun flows.

## Highest Quality Bar (Mode 2)

### A) Extraction Quality Gates
- Field-level precision/recall targets for key outputs (email/phone/url/text fields) on benchmark suites.
- Dedup accuracy checks across runs and across source types.
- Required-field completeness thresholds before export.
- Structured run-level quality score shown in UI.

### B) Reliability Gates
- Strong retry policy with transient-failure recovery targets.
- Selector-drift fallback checks on representative UI-changed pages.
- Deterministic stop/cancel/rerun behavior under load.
- Export integrity checks (row counts, schema consistency, file validation).

### C) UX Quality Gates
- First-run success path in under a few clicks for each extractor.
- Clear error states with one-click recovery actions.
- Progress visibility with actionable status, not generic spinners.
- Welcome/tutorial and quick-start flows validated for all core tools.

### D) Data Activation Gates
- End-to-end tests for CSV/XLSX/JSON/Sheets/clipboard flows.
- Integration smoke tests for webhook/n8n-style delivery paths.
- Data mapping checks for downstream CRM/import use.

### E) Compliance + Trust Gates
- Source URL provenance on extracted records.
- Suppression/do-not-contact tagging support in data pipeline.
- Audit log coverage for extraction/export actions.

### F) Release Gate
- A release is blocked unless all gate categories above pass on the benchmark suite.

## Plan-Mode Completion Checklist (Mode 2)

### Completed
- Mode 2 scope lock documented.
- Installed extension deep-dive documented.
- Website/store claim gap audit documented.
- Home hub/welcome/roadmap UI parity scope documented.
- Premium (post-parity) architecture documented.
- Highest-quality release gates documented.
- Telemetry parity depth spec documented and locked.
- Implementation backlog (epics/stories/acceptance structure) documented.
- Benchmark suite spec documented.
- UI delta spec documented.

### Open Before Build Starts
- Final legal/compliance policy for outreach workflows (suppression, jurisdiction defaults).

## Phase 2 (After Parity)
- Add your differentiated features only after parity sign-off.
- Keep toggle-based compatibility mode so parity users are not broken.
