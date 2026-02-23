# Phase 7 Home Hub + Welcome + Roadmap UI (2026-02-23)

## Scope
Deliver Epic 7 baseline:
- main shell navigation parity (`MENU`, `HISTORY`, `DATA`, `Tools`, `latest changes`)
- tool module cards parity
- roadmap 2026 cards + notify interactions
- per-tool welcome/quick-start flows
- first-3-visits welcome behavior

## Implemented

1) Sidepanel shell/navigation
- File:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/styles.css`
  - `packages/extension/sidepanel/index.mjs`
- Added shell navigation buttons with view routing:
  - `menu`
  - `history`
  - `data`
  - `tools`
  - `latest`
- Added view panel gating via `.app-view-panel` + `data-views`.

2) Home hub + module cards
- Added tool cards:
  - `LIST EXTRACTOR`
  - `PAGE DETAILS EXTRACTOR`
  - `EMAIL EXTRACTOR`
  - `IMAGE DOWNLOADER`
  - `PAGE TEXT EXTRACTOR`
- Clicking a card applies tool preset and routes to the appropriate workspace view.

3) Welcome/tutorial flow parity
- Added per-tool welcome card with:
  - title/subtitle
  - "What you can extract" list
  - video tutorial label (`Watch: ...`)
  - `QUICK START` 3-step list
  - `START EXTRACTING` CTA
- Added first-3-visits behavior:
  - persisted in local storage key:
    - `datascrap.sidepanel.welcome-visits.v1`
  - per-session cap handling to avoid duplicate count increments.
- Added tutorial re-open control (`Show tutorial`) and dismiss (`Skip`) behavior.

4) Roadmap cards + notify wiring
- Added roadmap block:
  - `Roadmap 2026`
  - `Scheduling` and `Integrations` cards
  - status copy (`In progress - Launching Q1 2026`)
  - `Notify` actions
- Added notify click wiring:
  - opens external target URL per card
  - emits UI telemetry event:
    - `roadmap_notify_clicked`
  - updates roadmap status line in UI.

5) UI telemetry hooks (Epic 7 surfaces)
- Added sidepanel UI event logging via `trackUiEvent(...)` for:
  - `welcome_shown`
  - `tutorial_opened`
  - `quick_start_opened`
  - `roadmap_notify_clicked`
- Kept existing runtime/extraction logs and added additional extraction start/download UI signals.

## Validation

1) Syntax check
- command:
  - `node --check packages/extension/sidepanel/index.mjs`
- result:
  - pass

2) Existing extension smoke suite
- command:
  - `npm run smoke:extension`
- result:
  - pass (`storage`, `runtime`, `epic5`, `epic6`)

3) New Epic 7 smoke coverage
- new script:
  - `scripts/smoke-extension-epic7.mjs`
- package script:
  - `smoke:extension:epic7`
- included in:
  - `smoke:extension`
- checks:
  - required shell labels
  - required home/welcome/roadmap IDs
  - required Epic 7 JS/CSS tokens
  - nav/tool card counts

## Notes
- This slice delivers Epic 7 baseline behavior with local-first state and no cloud row storage changes.
- Manual in-browser UI pass is still required for final visual parity sign-off against captured UWS references.
