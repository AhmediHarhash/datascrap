# Release Execution Evidence (2026-02-23)

## Scope
Record the actual production gate execution and resulting artifacts.

## Commands Executed

1) Extension-only release gate
- Command:
  - `npm run release:extension`
- Result:
  - pass
- Includes:
  - extension sync
  - extension smoke chain (storage, table-advanced, runtime, epic5, epic6, epic7, epic8)
  - extension packaging with archive validation

2) Full production gate
- Command:
  - `npm run release:full`
- Result:
  - pass
- Includes:
  - `npm run hardening:railway`
  - `npm run release:extension`

## Cloud Smoke Evidence (from full production gate)
- Phase5 smoke:
  - `integrationTestOk=true`
  - `integrationTestStatusCode=204`
  - `jobId=5e5eacbc-ce35-4c96-aa7d-27dff609fa82`
  - `extractionJobId=53f4f090-3fdb-4d85-bf10-bf0978ef52e6`
- Phase5 schedule smoke:
  - `scheduleId=0a78d714-2d81-4a49-8a5a-9c6f5864880a`
  - `extractionScheduleId=210752f4-4096-436f-bd9c-0f81095a6872`
  - `jobId=f4e09e6a-c8d1-46c3-8375-e1c6635b285f`
  - `extractionJobId=36022f6b-8f31-489e-be50-1a0ddb8dc673`

## Packaged Artifact
- Versioned zip:
  - `dist/extension/datascrap-v0.1.0.zip`
- Latest alias zip:
  - `dist/extension/datascrap-latest.zip`
- Archive integrity check:
  - pass
  - entries counted: `50`

## Status
- Automated release gates: pass.
- Artifact generation: pass.
- Remaining sign-off:
  - manual in-browser UI parity pass before external client rollout.
