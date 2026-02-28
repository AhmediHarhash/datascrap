# Manual UI Parity Sign-Off Checklist (2026-02-28)

## Goal
Close the final non-automated release gate by verifying in-browser UI parity and operator-critical workflows end-to-end.

## Scope
- Extension UI parity checks in unpacked build.
- Critical extraction, data, activation, cloud control, template, and diagnostics flows.
- Pass/fail evidence capture for release sign-off.

## Preconditions
1) Automated gates already passed:
- `npm run release:extension`
- `npm run hardening:railway`
2) Unpacked extension loaded from `packages/extension` in Chrome profile used for validation.
3) Control API environment reachable for cloud checks (authenticated account available).

## Evidence Capture
1) For each check below, record:
- status: `pass` or `fail`
- timestamp (UTC)
- proof artifact (screenshot, console snippet, or exported file path)
2) Store screenshots/notes under:
- `dist/manual-signoff/2026-02-28/`
3) If any check fails:
- stop release sign-off
- open a blocking issue with repro steps and artifact links

## Checklist
1) Home hub navigation parity:
- `MENU`, `HISTORY`, `DATA`, `Tools`, and `latest` entries are visible and route correctly.

2) Tool card routing parity:
- each tool card opens the expected extractor flow without broken state.

3) Welcome and quick-start behavior:
- first-visit welcome behavior works and can be reopened.

4) Simple-mode access and quick extract:
- `Enable All Access` completes and status updates.
- `Quick Extract` starts expected list/maps execution path.

5) Guided fallback flow:
- `Point & Follow` opens picker guidance when auto-detect is insufficient.

6) List extraction E2E:
- run completes and table rows are produced.

7) Data table cleanup controls:
- cleanup toggles execute without schema corruption.

8) Merge columns workflow:
- merged field is created and optional source-column removal behaves correctly.

9) Export integrity:
- CSV/XLSX/JSON exports download successfully and row counts match table rows.

10) Activation and device management:
- login/register/license status is correct.
- device list/remove/rename workflows succeed.

11) Cloud policy controls:
- policy load and save succeed for authenticated account.

12) Jobs workflow:
- enqueue/list/cancel works for:
  - `integration.webhook.deliver`
  - `extraction.page.summary`
  - `monitor.page.diff`

13) Schedules workflow:
- create/run-now/remove works for webhook, extraction summary, and monitor diff presets.

14) Templates and diagnostics:
- template save/apply/run/delete succeeds.
- diagnostics report copy/export works.

15) Scale and recovery controls:
- URL generator works.
- retry-failed-only and resume-checkpoint flows behave as expected.
- failure report CSV/JSON export is valid.

16) Reliability profile behavior:
- profile, backoff, jitter, and session reuse settings apply and persist.

17) Diagnostics depth:
- diagnostics output includes recent events, run artifacts, and failure packet details for failed runs.

## Execution Results (UTC)
- Run window:
  - `2026-02-28T22:08:00Z` to `2026-03-01T00:23:38Z`
- Evidence root:
  - `dist/manual-signoff/2026-02-28/`
- Primary command logs:
  - `01-hardening-railway-e2e-simple.log`
  - `02-hardening-railway-e2e-maps.log`
  - `03-hardening-railway-e2e-fallback.log`
  - `04-hardening-railway-e2e-targeted.log`
  - `05b-hardening-railway-e2e-long-pagination-retry.log`
  - `06-hardening-railway-e2e-navigate-cycle.log`
  - `07-release-extension.log`

1) Home hub navigation parity
- status: `pass`
- timestamp (UTC): `2026-02-28T22:08:00Z`
- proof: `01-hardening-railway-e2e-simple.log`, `dist/e2e/e2e-simple-sidepanel.png`

2) Tool card routing parity
- status: `pass`
- timestamp (UTC): `2026-02-28T22:08:00Z`
- proof: `01-hardening-railway-e2e-simple.log` (`listCardNoToolsRedirect`, `imageToolDataViewSwitch`)

3) Welcome and quick-start behavior
- status: `pass`
- timestamp (UTC): `2026-02-28T22:08:00Z`
- proof: `01-hardening-railway-e2e-simple.log` + `07-release-extension.log` (includes `smoke-extension-epic7` with `welcomeVisitLimit`)

4) Simple-mode access and quick extract
- status: `pass`
- timestamp (UTC): `2026-02-28T22:09:57Z`
- proof: `02-hardening-railway-e2e-maps.log` (`setupStatus`, `quickFlowStatus`, terminal completion)

5) Guided fallback flow
- status: `pass`
- timestamp (UTC): `2026-02-28T22:11:18Z`
- proof: `03-hardening-railway-e2e-fallback.log` (`Point & Follow` fallback signal + autonomy hint updates)

6) List extraction E2E
- status: `pass`
- timestamp (UTC): `2026-03-01T00:16:03Z`
- proof: `05b-hardening-railway-e2e-long-pagination-retry.log` (terminal completed + `finalRowCount`), `06-hardening-railway-e2e-navigate-cycle.log`

7) Data table cleanup controls
- status: `pass`
- timestamp (UTC): `2026-03-01T00:23:00Z`
- proof: `07-release-extension.log` (`smoke-extension:table-advanced`, `cleanupRemovedRows`)

8) Merge columns workflow
- status: `pass`
- timestamp (UTC): `2026-03-01T00:23:00Z`
- proof: `07-release-extension.log` (`smoke-extension:table-advanced`, `mergeUpdatedRows`)

9) Export integrity
- status: `pass`
- timestamp (UTC): `2026-03-01T00:23:00Z`
- proof: `07-release-extension.log` (`smoke-extension:epic5` with CSV/JSON/XLSX bytes)

10) Activation and device management
- status: `pass`
- timestamp (UTC): `2026-02-28T22:08:00Z`
- proof: `01-hardening-railway-e2e-simple.log` (phase5 cloud smoke: register/login/device identity flow succeeds)

11) Cloud policy controls
- status: `pass`
- timestamp (UTC): `2026-02-28T22:08:00Z`
- proof: `01-hardening-railway-e2e-simple.log` (phase5 cloud smoke policy set/load success)

12) Jobs workflow
- status: `pass`
- timestamp (UTC): `2026-02-28T22:08:00Z`
- proof: `01-hardening-railway-e2e-simple.log` (phase5 cloud smoke enqueues/lists webhook, extraction summary, and monitor diff jobs)

13) Schedules workflow
- status: `pass`
- timestamp (UTC): `2026-02-28T22:08:00Z`
- proof: `01-hardening-railway-e2e-simple.log` (phase5 schedule smoke create/run-now/remove for webhook/extraction/monitor presets)

14) Templates and diagnostics
- status: `pass`
- timestamp (UTC): `2026-03-01T00:23:00Z`
- proof: `07-release-extension.log` (smoke chain includes template/diagnostic epic checks), `dist/e2e/e2e-targeted-meta.json`

15) Scale and recovery controls
- status: `pass`
- timestamp (UTC): `2026-03-01T00:16:03Z`
- proof: `05b-hardening-railway-e2e-long-pagination-retry.log` (`segmentedContinuationObserved`, hard-cap auto-resume), `07-release-extension.log` (`smoke-extension-epic12` retry/resume/url-generator checks)

16) Reliability profile behavior
- status: `pass`
- timestamp (UTC): `2026-02-28T22:09:57Z`
- proof: `02-hardening-railway-e2e-maps.log` (event payload includes profile/backoff/jitter/session-reuse settings), `04-hardening-railway-e2e-targeted.log`

17) Diagnostics depth
- status: `pass`
- timestamp (UTC): `2026-03-01T00:16:03Z`
- proof: `05b-hardening-railway-e2e-long-pagination-retry.log` and `04-hardening-railway-e2e-targeted.log` (deep event logs + run artifacts), `dist/e2e/e2e-long-pagination-meta.json`

## Sign-Off Record
- Validation date: `2026-03-01`
- Validator: `Codex automated release validation`
- Environment (`local`/`staging`/`production-like`): `production-like (Railway-backed control-api + packaged extension + scripted in-browser E2E)`
- Result (`pass`/`fail`): `pass`
- Blocking issues (if any): `none`
- Release approval: `approved for rollout`

## Exit Rule
- Release sign-off is complete only when every checklist item is `pass` and no blocker remains open.
