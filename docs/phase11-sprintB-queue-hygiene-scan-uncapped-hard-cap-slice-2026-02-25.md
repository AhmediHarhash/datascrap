# Phase 11 Sprint B - Queue Hygiene Scan Uncapped Hard-Cap Slice (2026-02-25)

## Scope
Enable uncapped scan-all behavior while preserving an explicit hard safety ceiling.

## Implementation
1) Uncapped scan mode in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-max-pages=0` support (operator cap disabled)
  - `--scan-hard-max-pages=<n>` hard fail-safe cap
  - env default:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_HARD_MAX_PAGES=5000`
  - paging summary metadata:
    - `paging.operatorCapEnabled`
    - `paging.hardMaxPages`
    - `paging.effectiveMaxPages`
    - `paging.truncatedByHardMaxPages`

2) Uncapped scan preset
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:near-duplicates:stale:scan-all:uncapped:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic46.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic46`
    - aggregate `smoke:extension` now includes `epic46`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic46.mjs`
3) `npm run smoke:extension:epic46`
4) `npm run smoke:extension`

## Notes
- `scan-max-pages=0` is intentionally paired with `scan-hard-max-pages` to preserve safety.
- Uncapped mode is most useful for large accounts where scan-all should continue to exhaustion without manual cap tuning.
