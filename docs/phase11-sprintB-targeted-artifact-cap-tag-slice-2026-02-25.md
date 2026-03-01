# Phase 11 Sprint B - Targeted Artifact Cap Tag Slice (2026-02-25)

## Scope
Improve CI triage for targeted-result e2e runs by tagging artifacts with the selected cap.

## Implementation
1) Targeted artifact naming
- Updated:
  - `.github/workflows/extension-hardening.yml`
- Changed:
  - targeted artifact name from:
    - `extension-e2e-artifacts-targeted`
  - to:
    - `extension-e2e-artifacts-targeted-${{ inputs.targeted_results }}`

2) Smoke guard coverage
- Added:
  - `scripts/smoke-extension-epic30.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic30`
    - aggregate `smoke:extension` now includes `epic30`

## Validation
1) `node --check scripts/smoke-extension-epic30.mjs`
2) `npm run smoke:extension:epic30`
3) `npm run smoke:extension`

## Notes
- Dispatch input validation (`Validate Targeted Results Input`) ensures artifact suffix values remain bounded (`1..500`).
