# Phase 11 Sprint B - Queue Hygiene Script Slice (2026-02-25)

## Scope
Add an operator-safe way to reduce recurring queue activity caused by active cloud schedules.

## Implementation
1) Queue hygiene script
- Added:
  - `services/control-api/scripts/schedule-hygiene.js`
- Capabilities:
  - list schedules (`--action=list`)
  - pause schedules (`--action=pause`)
  - dry-run by default (requires `--apply` for actual toggles)
  - filters:
    - `--job-type=<type>`
    - `--name-contains=<text>`
- auth:
    - `CONTROL_API_BEARER_TOKEN` or `--token=<jwt>`
    - auto-login fallback:
      - `--email=<email>` + `--password=<password>`
      - optional `--register-if-missing=true`
  - base URL:
    - `API_BASE_URL` (default `http://127.0.0.1:3000`)

2) Package command shortcuts
- Updated:
  - `package.json`
- Added:
  - `queue:hygiene:list:control-api`
  - `queue:hygiene:pause:dry-run:control-api`
  - `queue:hygiene:pause:apply:control-api`

3) Documentation updates
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic31.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic31`
    - aggregate `smoke:extension` includes `epic31`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic31.mjs`
3) `npm run smoke:extension:epic31`
4) `npm run smoke:extension`

## Notes
- This slice controls schedule-trigger noise; it does not disable core local extraction.
- For production use, prefer dry-run first and then apply after reviewing matched schedules.
- Auto-login fallback reduces operator friction when short-lived JWT tokens are not pre-fetched.
