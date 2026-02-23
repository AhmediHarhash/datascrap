# Phase 2 Picker + List Extraction Slice (2026-02-23)

## Scope
Deliver Epic 2 baseline:
- on-page picker flow
- `EXTRACT_LIST` runtime path
- `LOAD_MORE` methods (`none`, `scroll`, `navigate`, `click_button`)
- sidepanel wiring to create list extraction configs and run automations

## Implemented

1. Shared contracts extended
- picker mode constants and load-more method constants:
  - `packages/shared/src/events.mjs`
- new message contracts:
  - `PICKER_START_*`
  - `PICKER_GET_SESSION_*`
  - `PICKER_CANCEL_*`
  - `PICKER_EVENT`
  - file: `packages/shared/src/messages.mjs`

2. Core runtime update
- runner capability injection path added:
  - `createAutomationRuntime(..., capabilities)`
- list runner delegates to capability engine when provided:
  - `capabilities.listExtractionEngine.extractList(...)`
- files:
  - `packages/core/src/automation-runtime.mjs`
  - `packages/core/src/runners/list-extractor-runner.mjs`

3. Background list extraction engine
- tab-aware list extractor implemented with:
  - start URL navigation support
  - page DOM row extraction
  - dedupe across rounds
  - load-more loop with methods:
    - `none`
    - `scroll`
    - `click_button`
    - `navigate` (next-link URL resolution + tab navigation)
- files:
  - `packages/extension/background/list-extraction-engine.mjs`
  - `packages/extension/background/chrome-utils.mjs`

4. Picker session management
- injected picker overlay orchestration:
  - start/cancel/get session
  - progress/completed/canceled session events
  - sidepanel event forwarding
- files:
  - `packages/extension/background/picker-session-manager.mjs`
  - `packages/extension/content/picker-overlay.js`

5. Sidepanel Epic 2 controls
- container picker button
- field multi-picker + editable field list
- load-more config controls:
  - method
  - attempts
  - delay
  - scroll px
  - no-change threshold
  - button selector + picker
  - next-page selector
- speed profile defaults (`fast`, `normal`, `slow`)
- builds automation payload with:
  - `EXTRACT_LIST`
  - `LOAD_MORE`
- files:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
  - `packages/extension/sidepanel/styles.css`

6. Background service worker wiring
- picker message routes wired
- picker event passthrough to sidepanel
- runtime now uses list extraction engine capability
- file:
  - `packages/extension/background/service-worker.mjs`

## Validation

1. Syntax checks
- `node --check` passed for all updated core/background/sidepanel/picker files.

2. Vendor sync
- command: `npm run sync:extension`
- result: passed

3. Extension smoke suite
- command: `npm run smoke:extension`
- result: passed
- runtime smoke now verifies capability path with mock list engine:
  - `mockListEngineCalls >= 2`

## Notes
- Picker overlay supports:
  - click selection
  - ESC finish
  - up-arrow parent target expansion
  - draggable panel
- This slice is the functional Epic 2 baseline. Future hardening can improve selector robustness and anti-drift heuristics.
