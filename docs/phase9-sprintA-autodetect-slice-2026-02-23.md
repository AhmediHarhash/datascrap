# Phase 9 Sprint A - Auto-Detect Slice (2026-02-23)

## Scope
Deliver Workstream 1 first vertical slice:
- one-click list setup auto-detect
- container + field detection and direct apply in sidepanel
- smoke coverage and release-gate wiring

## Implemented

1) Shared message contract
- File:
  - `packages/shared/src/messages.mjs`
- Added:
  - `LIST_AUTODETECT_REQUEST`
  - `LIST_AUTODETECT_RESPONSE`

2) Background auto-detect service
- File:
  - `packages/extension/background/list-autodetect-service.mjs`
- Added:
  - active-tab list structure detection (repeating container groups)
  - field inference with mode detection (`text`, `link_url`, `image_url`, `attribute`)
  - preview row extraction
  - basic load-more detection (`click_button` or `navigate`)
  - confidence and timing output

3) Service worker wiring
- File:
  - `packages/extension/background/service-worker.mjs`
- Added:
  - handler for `LIST_AUTODETECT_REQUEST`
  - response pass-through for detected container/fields/preview

4) Sidepanel UX wiring
- Files:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - `Auto-detect Setup` action in list extractor panel
  - status line + preview output block
  - one-click apply logic:
    - sets container selector
    - replaces list fields with detected fields
    - optionally sets load-more method/selectors
    - updates start URL if empty

5) QA/smoke expansion
- File:
  - `scripts/smoke-extension-epic9.mjs`
- Added:
  - auto-detect UI/control/message/service presence checks
- Package scripts:
  - `smoke:extension:epic9`
  - included in `smoke:extension` chain

## Validation
1) Syntax checks passed:
- `node --check packages/extension/background/list-autodetect-service.mjs`
- `node --check packages/extension/background/service-worker.mjs`
- `node --check packages/extension/sidepanel/index.mjs`
- `node --check scripts/smoke-extension-epic9.mjs`

2) Extension smoke passed:
- `npm run smoke:extension`
- includes new epic9 smoke in chain

3) Local hardening pass:
- `npm run test:local:hardening`
- pass (cloud smoke skipped by design when `DATABASE_URL` is missing)

## Notes
- This is the first Sprint A slice for auto-detect and is intended to remove first-run setup friction.
- Next Sprint A step is accuracy tuning against benchmark targets (target: >=70 percent zero-edit first run).
