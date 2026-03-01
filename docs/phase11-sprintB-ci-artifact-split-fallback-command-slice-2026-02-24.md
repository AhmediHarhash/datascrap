# Phase 11 Sprint B - CI Artifact Split + Fallback Command Slice (2026-02-24)

## Scope
Improve CI e2e triage and dispatch control:
- split extension hardening artifacts by e2e variant (`simple`, `maps`, `fallback`)
- add custom fallback-command dispatch input for workflow-driven intent testing
- lock workflow/script contract with a dedicated smoke gate

## Implementation
1) Workflow dispatch + artifact split
- Updated:
  - `.github/workflows/extension-hardening.yml`
- Added:
  - `workflow_dispatch.inputs.fallback_command` (default `maps https://example.com`)
  - fallback step env binding:
    - `E2E_FALLBACK_COMMAND: ${{ inputs.fallback_command }}`
  - artifact upload split:
    - `extension-e2e-artifacts-simple` -> `dist/e2e/e2e-simple-*`
    - `extension-e2e-artifacts-maps` -> `dist/e2e/e2e-maps-*`
    - `extension-e2e-artifacts-fallback` -> `dist/e2e/e2e-fallback-*`

2) Simple e2e artifacts
- Updated:
  - `scripts/e2e-extension-simple.mjs`
- Added:
  - `dist/e2e/e2e-simple-result.json`
  - `dist/e2e/e2e-simple-sidepanel.png`
  - `dist/e2e/e2e-simple-error.txt` on failure

3) CI contract smoke
- Added:
  - `scripts/smoke-extension-epic21.mjs`
- Updated:
  - `package.json` (`smoke:extension:epic21`, included in aggregate chain)

4) Docs alignment
- Updated:
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`
  - `docs/production-test-readiness-2026-02-23.md`
  - `docs/phase11-sprintA-e2e-gate-command-slice-2026-02-24.md`

## Validation
1) `npm run smoke:extension:epic21`
2) `npm run smoke:extension`

## Notes
- Required PR merge check remains unchanged.
- Maps/fallback remain optional `workflow_dispatch` variants for additional depth when needed.
