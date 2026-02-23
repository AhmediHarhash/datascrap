# Phase 9 Sprint C - Scale URL Ops + Recovery Slice (2026-02-23)

## Scope
Deliver Workstream 5 foundation in extension runtime:
- URL generator utility (range/seed/pattern expansion)
- recovery controls:
  - retry failed only
  - resume checkpoint (unresolved URLs)
  - downloadable failure report (CSV/JSON)
- enriched page extraction summary metadata to support recovery flows

## Implementation
1) URL generation and recovery helpers
- Added pure helper module:
  - `packages/extension/sidepanel/page-recovery.mjs`
- Includes:
  - `generateRangeUrls(...)`
  - `generateSeedUrls(...)`
  - `generatePatternUrls(...)`
  - `resolveRetryFailedUrls(...)`
  - `resolveResumeUrls(...)`
  - `buildFailureReportEntries(...)`
  - `buildFailureReportCsv(...)`

2) Page extractor summary enrichment
- Updated:
  - `packages/extension/background/page-extraction-engine.mjs`
- Summary now includes:
  - `inputUrls`
  - `successfulUrls`
  - `failedUrls`
  - expanded `failures` (with attempts)
  - `checkpoint` object:
    - `totalUrls`
    - `attemptedCount`
    - `successCount`
    - `failureCount`
    - `nextIndex`
    - `unresolvedUrls`

3) Sidepanel UI and orchestration
- Updated:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
- Added:
  - URL Generator panel:
    - template + range/step/padding + seeds
    - generate range / seeds / pattern
    - append-mode + clear manual URLs
  - Recovery Controls panel:
    - retry failed only
    - resume checkpoint
    - failure report CSV/JSON export
    - source run summary preview

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic12.mjs`
- Updated:
  - `package.json` (`smoke:extension` chain now includes epic12)
- Epic12 validates:
  - URL generator behavior
  - checkpoint/retry URL resolution behavior
  - failure report CSV generation behavior
  - sidepanel HTML/JS wiring and page engine checkpoint tokens

## Validation
1) `npm run smoke:extension` -> pass
2) `npm run test:local:hardening` -> pass
3) `npm run hardening:railway` -> pass

## Notes
- Recovery controls use table-history summary from page extractor runs.
- Resume defaults to checkpoint unresolved URLs; if unavailable it falls back to failed URLs.
