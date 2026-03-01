# Phase 11 Sprint B - Queue Hygiene Scan Auto-Continue Segments Slice (2026-02-25)

## Scope
Allow scan-all runs to automatically continue across capped segments without manual reruns.

## Implementation
1) Auto-continue segments in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-auto-continue=true|false` (default `false`)
  - `--scan-auto-continue-max-segments=<n>` (default `20`)
  - env defaults:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_AUTO_CONTINUE=false`
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_AUTO_CONTINUE_MAX_SEGMENTS=20`
  - behavior:
    - when segment page cap is reached and `hasMore=true`, scanner can continue from `nextCursor` automatically
    - continuation depth is bounded by max segments
  - summary metadata:
    - `paging.scanAutoContinue`
    - `paging.scanAutoContinueMaxSegments`
    - `paging.segmentsUsed`
    - `paging.continuations`
    - `paging.autoContinueLimitReached`

2) Auto-continue command preset
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:near-duplicates:stale:scan-all:autocontinue:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic47.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic47`
    - aggregate `smoke:extension` now includes `epic47`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic47.mjs`
3) `npm run smoke:extension:epic47`
4) `npm run smoke:extension`

## Notes
- Auto-continue complements capped scans; uncapped mode (`scan-max-pages=0`) remains available.
- Keep `scan-auto-continue-max-segments` conservative in production for controlled runtime.
