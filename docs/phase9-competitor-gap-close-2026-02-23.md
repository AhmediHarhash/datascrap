# Phase 9 Competitor Gap Close Plan (2026-02-23)

## Objective
Close the highest-ROI gaps versus UWS and adjacent competitors while preserving local-first compute and low infrastructure cost.

Target outcome:
- reach practical parity for daily operator workflows
- improve first-run conversion and retention
- avoid cloud row-storage lock-in

## Current Position
- Core extraction parity is strong (list/page/email/image/text/maps/metadata, table ops, exports, cloud jobs/schedules).
- Remaining delta is mostly:
  - automation convenience
  - integrations breadth
  - monitoring and recovery UX
  - anti-block reliability depth

## Execution Update (2026-02-23)
- Workstream 1 slice 1 shipped:
  - auto-detect request/response contract
  - background list auto-detect service
  - sidepanel one-click apply + preview
  - epic9 smoke wiring
- Tracking artifact:
  - `docs/phase9-sprintA-autodetect-slice-2026-02-23.md`

## Priority Workstreams (Only What We Need Next)

### 1) Auto-Detect + One-Click Start (P0)
Story:
- As a new user, I want one-click extraction setup so I can get rows without manual selector work.

Scope:
- Add auto-detect candidate engine in content script:
  - likely container selector
  - likely field selectors
  - confidence score per field
- Add sidepanel mode:
  - `Auto-detect`
  - preview first N rows
  - one-click accept/override

Acceptance:
1. On benchmark set, auto-detect produces valid first run on at least 70 percent of targets without manual edits.
2. User can override any selector before run.
3. Smoke test covers candidate generation + confidence normalization.

Estimate:
- 5 to 7 dev days

### 2) Recipe/Template Marketplace (P0)
Story:
- As an operator, I want reusable public/private recipes so repeated tasks require near-zero setup.

Scope:
- Extend template model with:
  - tags
  - source domain match rules
  - version
  - import/export JSON file
- Add sidepanel library views:
  - local templates
  - shared templates (JSON import first; cloud catalog later)
- Add deterministic schema lock:
  - template run must validate expected column keys

Acceptance:
1. Import/export round-trip preserves template behavior.
2. Template run fails with explicit message when schema lock is broken.
3. Smoke covers create/apply/export/import/delete path.

Estimate:
- 4 to 6 dev days

### 3) Integrations Pack (P0)
Story:
- As a paying user, I want direct destination integrations so I can push results without manual copy steps.

Scope:
- Add destination adapters:
  - Google Sheets hardening (already baseline, improve retries/errors)
  - Airtable write adapter
  - generic webhook adapter with signed payload option
- Extend cloud integration secrets UX:
  - provider presets
  - test connection action

Acceptance:
1. Destination write succeeds with retry/backoff for transient failures.
2. Test-connection gives actionable failure reason.
3. Smoke covers adapter contract + error mapping.

Estimate:
- 5 to 8 dev days

### 4) Monitoring + Change Alerts (P1)
Story:
- As an agency operator, I want watched targets and change alerts so I can detect price/content changes automatically.

Scope:
- Add monitor job type:
  - periodic extraction snapshot hash
  - compare with previous hash
  - diff summary payload
- Add schedule preset for monitor runs.
- Add notify destinations:
  - webhook first
  - email later

Acceptance:
1. No-change runs do not spam notifications.
2. Change runs include field-level diff summary.
3. Smoke covers monitor schedule create/run/no-change/change.

Estimate:
- 4 to 6 dev days

### 5) Scale URL Operations + Recovery UX (P1)
Story:
- As a power user, I want large URL batches with clear recovery so big runs are reliable.

Scope:
- Add URL generator utility:
  - numeric ranges
  - CSV seed expansion
  - pattern-based URL build
- Add recovery controls:
  - retry failed only
  - resume from checkpoint
  - downloadable failure report

Acceptance:
1. 10k URL manifest generation works without UI freeze.
2. Retry-failed-only rerun preserves successful prior rows.
3. Smoke covers checkpoint and failure-report generation.

Estimate:
- 4 to 7 dev days

### 6) Anti-Block Reliability Profiles (P1)
Story:
- As an operator scraping harder targets, I want reliability profiles so runs fail less without manual tweaks.

Scope:
- Add extraction reliability profile presets:
  - conservative
  - balanced
  - aggressive
- Controls include:
  - jittered delays
  - smarter retry cadence
  - optional cookie/session reuse hooks
- Keep proxy support optional and pluggable:
  - no mandatory managed proxy cost

Acceptance:
1. Profile choice is persisted and reflected in queue behavior.
2. Retries use bounded backoff and emit explicit telemetry.
3. Smoke covers profile normalization and runtime config application.

Estimate:
- 3 to 5 dev days

## Delivery Sequence
1. Sprint A (P0): Workstreams 1 + 2
2. Sprint B (P0): Workstream 3
3. Sprint C (P1): Workstreams 4 + 5
4. Sprint D (P1): Workstream 6 + hardening pass

## Quality Gates
1. No workstream closes without automated smoke coverage.
2. `npm run release:full` must pass at end of each sprint.
3. Manual UI pass must cover:
- first-run path
- failure recovery path
- destination integration path

## Out of Scope (Phase 9)
1. Full managed proxy network by us.
2. Cloud storage for extracted row datasets.
3. Multi-tenant team RBAC redesign.

## Definition of Done
1. All P0 workstreams shipped with docs + smoke tests.
2. At least one P1 workstream shipped in same cycle.
3. Parity review updated with before/after evidence and remaining deltas.
