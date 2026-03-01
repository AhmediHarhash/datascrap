# Phase 11 Sprint B - Queue Hygiene Auto-Login Slice (2026-02-25)

## Scope
Reduce ops friction for queue hygiene commands by allowing authenticated schedule control without pre-generated JWT tokens.

## Implementation
1) Auto-login fallback in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - token resolution strategy:
    - explicit token (`CONTROL_API_BEARER_TOKEN` / `--token`)
    - fallback login (`--email` + `--password`)
  - optional account bootstrap:
    - `--register-if-missing=true`
  - login input options:
    - `--device-id`
    - `--device-name`
  - summary now reports `authMode` (`token` or `auto_login`)

2) Docs updates
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`
  - `docs/phase11-sprintB-queue-hygiene-script-slice-2026-02-25.md`

3) Smoke guard extension
- Updated:
  - `scripts/smoke-extension-epic31.mjs`
- Coverage now includes:
  - auto-login flags and token-resolution tokens in hygiene script

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic31.mjs`
3) `npm run smoke:extension:epic31`
4) `npm run smoke:extension`

## Notes
- For least privilege operations, token auth remains preferred.
- Auto-login is intended for trusted operator environments.
