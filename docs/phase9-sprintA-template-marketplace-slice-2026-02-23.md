# Phase 9 Sprint A - Template Marketplace Slice (2026-02-23)

## Scope
Deliver Workstream 2 first vertical slice:
- template import/export bundles
- schema lock enforcement for deterministic runs
- source-domain metadata on templates
- smoke coverage in extension chain

## Implemented

1) Sidepanel template controls
- Files:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - source domains input (`template-source-domains`)
  - schema lock toggle (`template-schema-lock-enabled`)
  - export selected/all buttons
  - import bundle button + hidden file input

2) Template model hardening
- File:
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - normalized template records with:
    - `sourceDomains[]`
    - `schemaLock` metadata
  - bundle constants:
    - `TEMPLATE_BUNDLE_TYPE`
    - `TEMPLATE_BUNDLE_VERSION`
  - load/save normalization for backward compatibility with older templates

3) Schema lock validation on run
- File:
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - expected schema derivation from runner/action/fields
  - deterministic set-match validation before run
  - explicit blocked-run message on mismatch

4) Bundle import/export workflow
- File:
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - JSON bundle export for selected template
  - JSON bundle export for all templates
  - JSON import parser for:
    - bundle object
    - template array
    - single template object
  - collision-safe template ID assignment during import

5) QA/smoke expansion
- File:
  - `scripts/smoke-extension-epic10.mjs`
- Added checks for:
  - new template panel IDs
  - schema lock and bundle workflow tokens
- Package scripts:
  - `smoke:extension:epic10`
  - included in `smoke:extension`

## Validation
1) Syntax checks passed:
- `node --check packages/extension/sidepanel/index.mjs`
- `node --check scripts/smoke-extension-epic10.mjs`

2) Extension smoke passed:
- `npm run smoke:extension`
- includes epic5 through epic10 checks

3) Local hardening pass:
- `npm run test:local:hardening`
- pass (cloud smoke skipped by design when `DATABASE_URL` is missing)

## Notes
- This slice is local-first and does not introduce cloud row storage.
- Next Workstream 2 step is shared/community library UX (catalog import presets + tagging filters).
