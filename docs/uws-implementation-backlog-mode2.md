# UWS Mode 2 Implementation Backlog

## Delivery Rules
1) Build in vertical slices that are testable end-to-end.
2) No epic is complete without acceptance tests.
3) Preserve parity first, then premium upgrades behind feature flags.
4) Respect data residency lock:
- no cloud row storage for extracted datasets by default
- local-first tables/exports and user-linked destinations only

## Execution Snapshot (2026-02-23)
1) Epic 0 bootstrap slice implemented:
- package skeleton + contracts + storage migration model landed.
2) Epic 1 bootstrap slice implemented:
- runtime lifecycle + runner registry + permission gate + start/stop/rerun wiring landed.
3) Tracking artifact:
- `docs/phase0-1-extension-runtime-bootstrap-2026-02-23.md`
4) Epic 2 baseline slice implemented:
- picker session flow + sidepanel controls + list extractor `EXTRACT_LIST` + `LOAD_MORE` method loop.
5) Tracking artifact:
- `docs/phase2-picker-list-extractor-2026-02-23.md`
6) Epic 3 baseline slice implemented:
- page/bulk extraction engine + URL source modes + queue controls + datasource integration.
7) Tracking artifact:
- `docs/phase3-page-bulk-extractor-2026-02-23.md`
8) Epic 4 baseline slice implemented:
- data table history/filters/inline edits/column rename/dedupe.
9) Epic 5 baseline slice implemented:
- file export (`csv/xlsx/json`) + clipboard/sheets + image downloader + activation wiring.
10) Tracking artifact:
- `docs/phase5-exports-activation-2026-02-23.md`
11) Epic 6 baseline slice implemented:
- email deep scan options + text/maps advanced options + metadata extractor engine.
12) Tracking artifact:
- `docs/phase6-tool-specific-advanced-flows-2026-02-23.md`

## Epic 0 - Foundation
1) Repository/package skeleton for extension + shared core + storage.
2) Message contracts and event types frozen.
3) IndexedDB repositories and migration model.
Acceptance:
- Extension loads with sidepanel shell and background worker.
- Storage init and CRUD smoke tests pass.

## Epic 1 - Core Automation Runtime
1) Runner registry (`listExtractor`, `pageExtractor`, `metadataExtractor`).
2) Lifecycle state machine (start/progress/stop/complete/error/rerun).
3) Permissions and host/optional permission prompts.
Acceptance:
- Start/stop/rerun works from UI.
- Progress events stream correctly.
- Permission-denied scenarios handled cleanly.

## Epic 2 - Picker + List Extraction
1) On-page picker (extract/click modes, selector outputs).
2) `EXTRACT_LIST` action implementation.
3) `LOAD_MORE` methods: `scroll`, `navigate`, `click_button`, `none`.
4) Speed profiles and profile editing/reset.
Acceptance:
- List extraction passes on infinite scroll + paginated benchmarks.
- Load-more method matrix passes.

## Epic 3 - Page/Bulk Extraction
1) URL source modes: manual/csv/datasource.
2) Action types: pages/email/phone/text/maps.
3) Bulk queue controls (concurrency/delays/timeouts/retries).
Acceptance:
- Multi-URL runs complete with per-url status and recoverable failures.
- CSV column mapping and datasource selection flows pass.

## Epic 4 - Data Table + Editing + History
1) Data table views and filters.
2) Column edits, row edits, dedupe behavior.
3) History and table continuity.
Acceptance:
- Edited data persists across sessions.
- Dedupe index behavior matches parity.

## Epic 5 - Exports + Activation
1) Export formats: CSV/XLSX/JSON.
2) Clipboard and Google Sheets flows.
3) Image download config and progress/error reporting.
Acceptance:
- All export formats validated for schema and row integrity.
- Image download mode and naming pattern tests pass.

## Epic 6 - Tool-Specific Advanced Flows
1) Email deep scanning (depth/domain/link controls).
2) Text extractor structured outputs (title/content/metadata/word count).
3) Metadata extractor (JSON-LD/meta and count fields).
4) Maps extractor fields and options.
Acceptance:
- Tool-level benchmark suites meet quality thresholds.

## Epic 7 - Home Hub + Welcome + Roadmap UI
1) Main navigation and tool cards parity.
2) Per-tool welcome/quick-start/tutorial card flows.
3) Roadmap cards/status/notify interactions.
Acceptance:
- UI parity checklist passes against captured references.

## Epic 8 - Scheduling + Integrations (Mode 2 Claims)
1) Scheduler core (interval/cron/timezone).
2) Integration endpoints/webhook delivery.
3) n8n-ready payload contracts.
Acceptance:
- Scheduled runs execute reliably.
- Webhook delivery success/failure observable and retryable.

## Epic 9 - Templates + Playbooks
1) Save/reuse extraction templates.
2) Playbook parameterization by niche/use-case.
Acceptance:
- One-click rerun from template with deterministic output schema.

## Epic 10 - Telemetry + Diagnostics
1) Event taxonomy implementation.
2) Error packet capture and run artifacts.
3) Run diagnostics panel.
Acceptance:
- Telemetry/event suite passes.
- Failed runs include actionable diagnostics.

## Epic 11 - QA Hardening + Release
1) Full benchmark suite execution.
2) Regression tests for core parity paths.
3) Release gate checks.
Acceptance:
- All quality gates pass.
- Release candidate signed off.

## Story Template (Use For Every Story)
1) Story
- user outcome statement
2) Scope
- exact components touched
3) Acceptance
- explicit pass/fail tests
4) Non-goals
- what is out of scope
