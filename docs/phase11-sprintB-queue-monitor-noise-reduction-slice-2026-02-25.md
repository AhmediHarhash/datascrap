# Phase 11 Sprint B - Queue Monitor Noise Reduction Slice (2026-02-25)

## Scope
Reduce false-positive/noisy queue monitor incidents while preserving queue-health visibility:
- lower monitor run cadence
- add small default dead-letter tolerance
- lock contract with smoke coverage

## Implementation
1) Workflow cadence reduction
- Updated:
  - `.github/workflows/job-queue-monitor.yml`
- Changed schedule:
  - from: `*/15 * * * *`
  - to: `0 * * * *`

2) Dead-letter default tolerance
- Updated:
  - `services/control-api/scripts/job-queue-monitor.js`
- Changed default:
  - `MAX_DEAD_LETTER_JOBS` from `0` to `3`

3) Documentation alignment
- Updated:
  - `services/control-api/README.md`
  - `docs/phase5-optional-cloud-features-2026-02-23.md`
  - `docs/railway-live-status-2026-02-22.md`
- Notes now reflect:
  - hourly queue monitor cadence
  - default dead-letter threshold tolerance `3`

4) Smoke guard
- Added:
  - `scripts/smoke-extension-epic29.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic29`
    - aggregate `smoke:extension` now includes `epic29`

## Validation
1) `node --check services/control-api/scripts/job-queue-monitor.js`
2) `node --check scripts/smoke-extension-epic29.mjs`
3) `npm run smoke:extension:epic29`
4) `npm run smoke:extension`

## Notes
- Manual repo variable `MAX_DEAD_LETTER_JOBS` still overrides default when set.
- Active cloud schedules can still generate jobs at configured intervals; this slice only reduces monitor noise.
