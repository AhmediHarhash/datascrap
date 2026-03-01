# Phase 11 Sprint B - Queue Hygiene Resume GeneratedAt Source Slice (2026-02-26)

## Scope
Harden resume freshness and future-skew guards by making the `generatedAt` source policy explicit and resilient when checkpoint payload timestamps are missing.

## Implementation
1) Resume timestamp source policy in queue hygiene script
- Updated:
  - `services/control-api/scripts/schedule-hygiene.js`
- Added:
  - `--scan-resume-generated-at-source=<payload|file-mtime|payload-or-file-mtime>`
  - env default:
    - `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_GENERATED_AT_SOURCE=payload-or-file-mtime`
- behavior:
  - `payload`: only use resume artifact `generatedAt`
  - `file-mtime`: use resume file mtime
  - `payload-or-file-mtime` (default): prefer payload timestamp, fallback to file mtime
- telemetry:
  - resume metadata now includes:
    - `resumeGeneratedAtSourcePolicy`
    - `resumeGeneratedAtSource`
  - propagated through resume resolution + paging summary + checkpoint sidecar + final summary output

2) Preset hardening
- Updated:
  - `package.json`
- changed:
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api`
  - `queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api`
  - both now pin `--scan-resume-generated-at-source=payload-or-file-mtime`

3) Operator docs
- Updated:
  - `services/control-api/README.md`
  - `docs/local-test-hardening-playbook-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`

4) Smoke coverage
- Added:
  - `scripts/smoke-extension-epic59.mjs`
- Updated:
  - `package.json`
    - new script: `smoke:extension:epic59`
    - aggregate `smoke:extension` now includes `epic59`

## Validation
1) `node --check services/control-api/scripts/schedule-hygiene.js`
2) `node --check scripts/smoke-extension-epic59.mjs`
3) `npm run smoke:extension:epic59`
4) `npm run smoke:extension`

## Notes
- Default mode (`payload-or-file-mtime`) preserves existing behavior while improving resilience when payload timestamps are absent.
- Strict operators can force deterministic source selection with `payload` or `file-mtime`.
