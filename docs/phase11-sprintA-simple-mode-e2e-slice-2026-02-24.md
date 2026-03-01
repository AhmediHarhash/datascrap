# Phase 11 Sprint A - Simple Mode + E2E Slice (2026-02-24)

## Scope
Deliver the next release-hardening slice focused on first-run conversion and deterministic regression checks:
- simple-mode operator flow in sidepanel (`Enable All Access`, `Quick Extract`, `Point & Follow`, intent command input)
- maps quick-flow defaults for "extract all/until no more" behavior
- optional Playwright e2e coverage wired into the local hardening runner

## Implementation
1) Simple-mode first-run flow and guided fallback
- Updated:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
  - `packages/extension/sidepanel/styles.css`
- Added/updated behaviors:
  - simple mode toggle defaults on
  - intent command parsing for extract/access/export/point-follow intents
  - quick access preflight (`preferFullHostAccess`) to reduce duplicate runtime prompts
  - one-click quick extract with maps auto-detection and tuned queue/map options
  - guided Point & Follow fallback path when auto-detect needs user help
  - simple-mode UI gating for advanced list/page/table controls

2) Host permission request flow alignment
- Updated:
  - `packages/core/src/permission-manager.mjs`
  - `packages/extension/vendor/core/src/permission-manager.mjs`
- Runtime extraction permission inference no longer re-requests host origin on start.
- Sidepanel setup-access flow remains the single preflight permission surface.

3) List auto-detect anchor targeting improvements
- Updated:
  - `packages/extension/background/list-autodetect-service.mjs`
- Added optional `anchorSelector` support to prioritize the candidate group that contains the user-picked seed element.

4) E2E harness and hardening wiring
- Added:
  - `scripts/e2e-extension-simple.mjs`
  - `scripts/e2e-extension-google-maps.mjs`
  - `scripts/smoke-extension-epic15.mjs`
- Updated:
  - `scripts/local-hardening-pass.mjs`
  - `package.json`
- Hardening runner now supports optional extension e2e:
  - `RUN_EXTENSION_E2E=true` -> simple e2e
  - `RUN_EXTENSION_E2E_MAPS=true` -> maps e2e (implies simple)

## Validation
1) `npm run smoke:extension` -> pass (includes `smoke:extension:epic15`)
2) `npm run e2e:extension:simple` -> pass
3) `npm run e2e:extension:maps` -> pass
4) `node --check packages/extension/sidepanel/index.mjs` -> pass

## Notes
- E2E execution is opt-in during hardening to keep default local runs fast and stable.
- Maps e2e now fails on core regression checks (runner/action switching, terminal state, status-line updates, DATA-view routing).
