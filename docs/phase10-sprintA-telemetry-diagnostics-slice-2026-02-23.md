# Phase 10 Sprint A - Telemetry + Diagnostics Slice (2026-02-23)

## Scope
Deliver Epic 10 slice 1 with actionable runtime diagnostics:
- lifecycle event taxonomy attached to runtime events
- structured error packet capture on failed runs
- run artifact timeline for each automation
- snapshot/report diagnostics now include run artifact summaries and failure context
- smoke coverage for runtime failure artifacts and diagnostics wiring

## Implementation
1) Automation runtime telemetry/artifact model
- Updated:
  - `packages/core/src/automation-runtime.mjs`
  - `packages/extension/vendor/core/src/automation-runtime.mjs`
- Added:
  - bounded event/run-artifact buffers
  - event taxonomy metadata (`eventName`, `severity`, `stage`, `toolType`)
  - per-run artifacts with:
    - config summary
    - lifecycle event counts
    - progress samples
    - terminal status/duration
    - table/result summary pointers
    - structured `errorPacket` on failures
  - snapshot enrichments:
    - `runArtifacts`
    - `failedArtifacts`
    - `recentEventSummary`
    - `generatedAt`

2) Error packet model
- Runtime now emits `errorPacket` for fail paths:
  - permission denial
  - runner execution failure
  - table persistence failure
- Packet fields include:
  - `errorType`
  - `severity`
  - `code`
  - `message`
  - `stack` (bounded)
  - `runStep`
  - `url`
  - `retryCount`
  - `isRecoverable`
  - `capturedAt`

3) Sidepanel diagnostics enrichment
- Updated:
  - `packages/extension/sidepanel/index.mjs`
- Added diagnostics helpers:
  - `buildDiagnosticsRunArtifactSummary(...)`
  - `buildDiagnosticsContextPayload(...)`
- Snapshot/report output now includes:
  - `runArtifactSummary`
  - `recentEventSummary`
  - latest failure packet shortcut when available

4) Smoke coverage
- Updated:
  - `scripts/smoke-extension-runtime.mjs`
  - now forces a deterministic failed run and validates:
    - taxonomy on failed event
    - failure `errorPacket` presence
    - `runArtifacts`/`failedArtifacts` and summary fields in snapshot
- Added:
  - `scripts/smoke-extension-epic14.mjs`
  - validates diagnostics/report/runtime wiring tokens
- Updated:
  - `package.json` (`smoke:extension` chain includes epic14)

## Validation
1) `npm run smoke:extension` -> pass
2) `npm run test:local:hardening` -> pass
3) `npm run hardening:railway` -> pass

## Notes
- Telemetry fields intentionally avoid extracted row payloads.
- This slice is runtime+diagnostics depth; adapter fan-out (PostHog/Sentry) remains optional for next telemetry slice.
