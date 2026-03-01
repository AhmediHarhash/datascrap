# Phase 11 Sprint B - Queue Hygiene Near-Duplicate Signature Mode Slice (2026-02-25)

## Scope
Add a target-focused duplicate signature mode so queue hygiene can catch near-duplicate schedules that differ in non-target payload fields.

## Implementation
1) Signature mode in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--signature-mode=strict|target`
  - env default:
    - `CONTROL_API_SCHEDULE_HYGIENE_SIGNATURE_MODE=strict|target`
  - `target` mode signature:
    - `targetJobType + schedule cadence + maxAttempts + normalized target URL set (+ maxUrls when present)`
  - `strict` mode remains full payload signature (existing behavior)
  - summary now reports active `signatureMode`

2) Near-duplicate command presets
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:near-duplicates:control-api`
  - `queue:hygiene:pause:near-duplicates:dry-run:control-api`
  - `queue:hygiene:pause:near-duplicates:apply:control-api`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic35.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic35`
    - aggregate `smoke:extension` now includes `epic35`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic35.mjs`
3) `npm run smoke:extension:epic35`
4) `npm run smoke:extension`

## Notes
- Use near-duplicate mode first when queue churn persists but strict duplicate mode returns low matches.
- To force exact payload match behavior, use `--signature-mode=strict`.
