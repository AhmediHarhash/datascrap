# Ultimate Web Scraper - Comprehensive Gap Audit (2026-02-22)

## Audit Scope
- Live marketing/docs pages on `ultimatewebscraper.com`
- Chrome Web Store listing for extension ID `pdeldjlcnhallaapdggcmhpailpnnkmg`
- Installed extension package:
  - `%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Extensions\\pdeldjlcnhallaapdggcmhpailpnnkmg\\5.9.5_0`

## Pages Checked (Website + Store)
- `https://ultimatewebscraper.com/`
- `https://ultimatewebscraper.com/pricing`
- `https://ultimatewebscraper.com/roadmap`
- `https://ultimatewebscraper.com/features/smart-element-picker`
- `https://ultimatewebscraper.com/features/list-and-multi-page-scraping`
- `https://ultimatewebscraper.com/features/data-export`
- `https://ultimatewebscraper.com/features/built-in-data-management`
- `https://ultimatewebscraper.com/features/customizable-scraping`
- `https://ultimatewebscraper.com/features/automated-data-scraping`
- `https://ultimatewebscraper.com/chrome-extension/list-extractor`
- `https://ultimatewebscraper.com/chrome-extension/web-page-extractor`
- `https://ultimatewebscraper.com/chrome-extension/email-extractor`
- `https://ultimatewebscraper.com/chrome-extension/image-downloader`
- `https://ultimatewebscraper.com/chrome-extension/page-text-extractor`
- `https://ultimatewebscraper.com/chrome-extension/google-maps-extractor`
- `https://ultimatewebscraper.com/tools/review-scraper`
- `https://ultimatewebscraper.com/tools/website-to-text-converter`
- `https://ultimatewebscraper.com/tools/free-email-scraper-tool`
- `https://ultimatewebscraper.com/tools/job-board-scraper`
- `https://ultimatewebscraper.com/tools/phone-number-extractor`
- `https://ultimatewebscraper.com/tools/trustpilot-review-scraper`
- `https://chromewebstore.google.com/detail/ultimate-web-scraper/pdeldjlcnhallaapdggcmhpailpnnkmg`

## Decision Baseline
- If target is **installed-extension 1:1 parity**, only items in **Section A** are mandatory Phase 1.
- If target is **website/store claim parity**, items in **Section A + Section B** are mandatory Phase 1.

## Scope Lock
- **Locked by user on 2026-02-22: Mode 2**
- Phase 1 must include:
  - installed extension parity items (Section A)
  - website/store claim parity items (Section B)

## A) Confirmed Missing/Underspecified For Installed-Extension 1:1

1) JSON export parity
- Evidence:
  - `sidepanel.bundle.js` contains `onExportJSON` and `JSON` export flow tokens.
- Gap in plan:
  - Plan export section listed CSV/XLSX/Sheets/clipboard but not JSON.

2) Metadata extractor as first-class scope (not only runner name)
- Evidence:
  - `background.bundle.js` includes `metadataExtractor`, `Starting metadata extraction`, `Metadata extraction complete`, `metadata.url`, `metadata.extractionType`, plus `Review Count` / `Number of Reviews`.
- Gap in plan:
  - Plan listed `metadataExtractor` in runner registry but no explicit feature section and acceptance criteria.

3) `LOAD_MORE` method `none`
- Evidence:
  - `sidepanel.bundle.js` contains load mode values `scroll`, `navigate`, `click_button`, `none`.
- Gap in plan:
  - Plan listed first three but missed `none`.

4) URL source UX details for `csv` and `datasource`
- Evidence:
  - `sidepanel.bundle.js` contains `manual`, `csv`, `datasource`, `selectedColumn`, `onColumnChange`, `onUrlsSelected`, `Select URLs from Previous Extract`.
- Gap in plan:
  - Plan mentioned source modes, but not CSV column mapping modal and datasource-from-history workflow.

5) Image download configuration parity details
- Evidence:
  - `sidepanel.bundle.js` contains `Download Mode`, `downloadMode`, `Download all images`, `Select specific columns`, `File Naming Pattern`, `namingPattern`, `Failed Downloads`.
- Gap in plan:
  - Plan captured basic download and progress, but not column-selection mode + naming-pattern behavior.

6) Phone extractor as explicit feature section
- Evidence:
  - `background.bundle.js` includes `EXTRACT_PAGES_PHONE`, `phonePatterns must be an array if provided`, `Phone Count`.
- Gap in plan:
  - Phone extraction exists only as an action enum mention; no explicit parity section/tests.

7) Localization architecture parity
- Evidence:
  - Installed package has `_locales` with 47 locale folders.
- Gap in plan:
  - No localization/i18n parity requirement noted.

8) Automation profile editing behavior
- Evidence:
  - `sidepanel.bundle.js` contains `Automation Speed & Settings`, `Select automation speed`, `Edit Profile`, `Reset All Profiles to Default`.
- Gap in plan:
  - Plan lists slow/normal/fast profiles but does not include editable profile settings + reset behavior.

9) Sample data bootstrap behavior
- Evidence:
  - `background.bundle.js` / DB layer includes `initializeSampleData`, `removeSampleData`, `hasSampleData`, `sampleDataInitializer`.
- Gap in plan:
  - No mention of first-run/sample dataset behavior used by the shipped extension.

10) Onboarding / product-UX overlays parity
- Evidence:
  - `sidepanel.bundle.js` includes `Welcome`, `tutorial`, `Rate Your Experience`, `trackChromeReviewClicked`, `Coming Soon`, `Upsell`, `upgrade`.
- Gap in plan:
  - Current plan focuses extraction engine features but does not scope onboarding, rating/review prompts, and coming-soon cards.

11) Analytics/observability behavior parity (if strict behavioral clone)
- Evidence:
  - Sidepanel includes extensive `track*` event instrumentation and references to PostHog/Sentry integration.
- Gap in plan:
  - No telemetry/event taxonomy or error-reporting parity defined.

12) Home hub / welcome-screen copy-layout parity
- Evidence:
  - Installed sidepanel UI exposes a shared hub with extractor cards, roadmap cards, tutorial cards, quick-start blocks, and first-visit welcome behavior.
- Gap in plan:
  - Prior plan focused mostly on extraction engine + settings, without explicit home-hub UI/copy/layout parity requirements.

13) Email post-processing and filtering options parity
- Evidence:
  - `sidepanel.bundle.js` includes email processing controls and payload fields:
    - `removeDuplicates`
    - `toLowerCase`
    - `basicValidation`
    - `includeMailtoLinks`
    - `domainFilters`
- Gap in plan:
  - Plan includes deep scanning and extraction basics, but not these post-processing/filter controls and config behavior.

14) Data table cleanup and density settings parity
- Evidence:
  - `sidepanel.bundle.js` includes data table processing options:
    - `removeEmptyRows`
    - `removeEmptyColumns`
    - `removeRepeatingColumns`
    - `removeDuplicateColumns`
    - `prioritizeDataDensity`
    - `hideMostlyEmptyColumns` with threshold
    - `includeImages`
- Gap in plan:
  - Plan mentions table storage/editing/export, but not cleanup/density toggles that shape visible output.

15) Column merge workflow parity in data table
- Evidence:
  - `sidepanel.bundle.js` includes:
    - `showMergeColumnPanel`
    - `Merge Columns`
    - merge controls (`mergedColumnName`, `mergeSeparator`, column selection + execute merge flow).
- Gap in plan:
  - No explicit merge-columns workflow or acceptance tests.

16) Device-management operations parity (beyond key registration)
- Evidence:
  - `sidepanel.bundle.js` includes endpoints/methods:
    - `POST /api/devices`
    - `POST /api/devices/remove`
    - `POST /api/devices/rename`
    - methods `removeDevice`, `renameDevice`, and max-device handling payloads.
- Gap in plan:
  - Plan covers license registration and device limits at high level, but not device list/remove/rename management flows.

17) Element picker keyboard/interaction nuance parity
- Evidence:
  - `pageElementPicker.bundle.js` includes interaction hints/controls:
    - `Press ESC ... Finish Selection`
    - up-arrow parent expansion behavior
    - draggable picker panel + click mode registration.
- Gap in plan:
  - Plan covers picker capabilities, but not these interaction details that affect UX parity.

## B) Website / Store Claims Not Fully Represented In Current Plan

1) Saved extraction templates + one-click reuse
- Evidence:
  - Chrome Web Store listing states: save/reuse extraction templates and one-click extraction workflows.
- Current state:
  - No strong installed-bundle evidence of shipped template CRUD flow.

2) Advanced customization (regex + post-processing scripts)
- Evidence:
  - `features/customizable-scraping` page claims regex rules and post-processing scripts.
- Current state:
  - Not explicitly scoped in plan.

3) Scheduling and trigger-based extraction
- Evidence:
  - `features/automated-data-scraping` claims scheduled/triggered extraction.
  - Chrome Web Store listing also claims scheduled/trigger-based tasks.
- Current state:
  - Not in core parity plan.

4) Workflow integrations (n8n/webhooks/API endpoints)
- Evidence:
  - Website feature page and Chrome Web Store claim integration support.
  - Installed sidepanel bundle includes strings:
    - `Connect with n8n workflows and custom webhooks`
    - `In Progress, Launching Soon`
    - `Launching Q1 2026`
    - `n8n workflow integration`, `Custom webhooks`, `API endpoints`.
- Interpretation:
  - Roadmap/coming-soon **UI is confirmed inside the installed extension**.
  - Full integration execution capability still appears to be future-state.

9) Roadmap module parity in extension UI
- Evidence:
  - Installed `sidepanel.bundle.js` contains roadmap labels and statuses:
    - `Scheduling`, `Integrations`
    - `In Progress, Launching Soon`
    - `Launching Q1 2026`
    - `Connect with n8n workflows and custom webhooks`
    - `Set custom intervals`, `Cloud-based execution`
    - `Coming Soon`, `roadmap`
- Current state:
  - Clone plan should include roadmap cards/status copy and layout for strict one-to-one UI parity.

5) Multi-browser support claim
- Evidence:
  - Chrome Web Store listing mentions compatibility with Chromium-based browsers and browser support messaging.
- Current state:
  - Plan is currently Chrome MV3-only.

6) Vertical prebuilt flows/tool pages
- Evidence:
  - Website publishes dedicated tool pages (review scraper, job board scraper, trustpilot scraper, etc.).
- Current state:
  - Plan focuses on generic extractors; no explicit vertical starter templates.

7) Built-in preset scraper categories (store claim)
- Evidence:
  - Chrome Web Store description claims built-in scraper modes for business, people, social media, B2B, plus reviews/text/email/phone.
- Current state:
  - Plan does not explicitly include preset mode catalog beyond generic extractors.

8) Login-protected page support + privacy posture (store claim)
- Evidence:
  - Chrome Web Store text states support for login-protected pages and local/browser-first processing privacy messaging.
- Current state:
  - Plan does not explicitly include authenticated-site test coverage or non-functional privacy guarantees in acceptance criteria.

## C) Already Covered Well In Current Plan
- MV3 architecture + permissions model.
- List/page/email/text/maps/image extractor core.
- IndexedDB store model and dedupe.
- Licensing/device/pro-gate baseline.
- CSV/XLSX/Sheets/clipboard export baseline.
- Stop/retry/rerun lifecycle baseline.

## D) Immediate Plan Patches Required (No Debate)

1) Add JSON export to Phase 1 exports.
2) Add dedicated Metadata Extractor section + tests.
3) Add `LOAD_MORE: none`.
4) Add CSV-column and datasource-selection UX details.
5) Add image download mode/naming pattern behavior.
6) Add explicit Phone Extractor section.
7) Add i18n architecture requirement.
8) Add profile editing/reset behavior for speed presets.
9) Add sample-data bootstrap behavior.
10) Add onboarding/review/coming-soon UX-shell parity scope.
11) Decide whether telemetry/event parity is in-scope for 1:1.
12) Add explicit home-hub/welcome-screen module-card parity checklist.
13) Add email post-processing and domain-filter controls to parity scope.
14) Add data-table cleanup/density settings parity.
15) Add merge-columns workflow parity in table view.
16) Add device management (list/remove/rename) parity criteria.
17) Add picker keyboard/interaction micro-behavior parity checks.

## E) Scope Choice (Resolved)
- Selected: `Mode 2` (Website/store claim parity)
- `Mode 1` is not active.
