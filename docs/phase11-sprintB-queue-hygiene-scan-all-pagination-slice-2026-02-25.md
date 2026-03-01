# Phase 11 Sprint B - Queue Hygiene Scan-All Pagination Slice (2026-02-25)

## Scope
Remove first-page-only schedule hygiene behavior by adding cursor pagination and scan-all automation.

## Implementation
1) Cursor pagination in schedules API
- Updated:
  - `services/control-api/src/services/schedules.js`
  - `services/control-api/src/routes/schedules.js`
- Added:
  - `GET /api/schedules` cursor query support:
    - `cursorCreatedAt=<iso>`
    - `cursorId=<uuid>`
  - response paging metadata:
    - `pageInfo.hasMore`
    - `pageInfo.nextCursor`
  - validation/error path:
    - `INVALID_SCHEDULE_CURSOR` (`400`) for malformed cursor input

2) Scan-all pagination in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-all=true|false` (default `false`)
  - `--scan-max-pages=<n>` (default `100`)
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_ALL=false`
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_MAX_PAGES=100`
  - paging summary metadata:
    - `summary.paging.scanAll`
    - `summary.paging.pagesFetched`
    - `summary.paging.hasMore`
    - `summary.paging.nextCursor`
    - `summary.paging.truncatedByMaxPages`
    - `summary.paging.cursorLoopDetected`

3) Scan-all ops presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:near-duplicates:stale:scan-all:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:report:redacted:control-api`

4) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

5) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic43.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic43`
    - aggregate `smoke:extension` now includes `epic43`

## Validation
1) `node --check services/control-api/src/services/schedules.js`
2) `node --check services/control-api/src/routes/schedules.js`
3) `node --check services/control-api/scripts/schedule-hygiene.js`
4) `node --check scripts/smoke-extension-epic43.mjs`
5) `npm run smoke:extension:epic43`
6) `npm run smoke:extension`

## Notes
- Default behavior remains single-page (`scan-all=false`) to avoid surprise load.
- Full-queue cleanup mode is explicit and bounded with `scan-max-pages`.
