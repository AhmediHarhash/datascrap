# Extension Release Playbook (2026-02-23)

## Goal
Ship a repeatable, production-safe extension release with automated gates first, then manual UI sign-off.

## Automated Release Gate
Run from repo root:

```bash
npm run release:extension
```

This command runs:
1. `npm run sync:extension`
2. `npm run smoke:extension`
3. `npm run package:extension`
4. zip integrity check (required files must exist inside archive)

Artifacts produced:
- `dist/extension/datascrap-v<manifest.version>.zip`
- `dist/extension/datascrap-latest.zip`

## Full Production Gate (single command)
Run:

```bash
npm run release:full
```

This runs:
1. `npm run hardening:railway`
2. `npm run release:extension`

## Full Production Gate With Extension E2E
Run one of:

```bash
npm run release:full:e2e
npm run release:full:e2e:maps
npm run release:full:e2e:fallback
npm run release:full:e2e:targeted
npm run release:full:e2e:long-pagination
```

This runs:
1. `npm run hardening:railway:e2e` (or `:maps` / `:fallback` / `:targeted` / `:long-pagination`)
2. `npm run release:extension`

## Cloud/API Gate (required for subscription mode)
Run:

```bash
npm run hardening:railway
```

Pass criteria:
1. Extension smoke passes.
2. API `/healthz` and `/readyz` pass with DB reachable.
3. Cloud smoke passes for:
- `integration.webhook.deliver`
- `extraction.page.summary`
 - `monitor.page.diff`
4. Schedule smoke passes for create/run/remove.
5. Monitor behavior smoke passes for baseline/no-change/change/no-change.

## CI Gate
- Workflow:
  - `.github/workflows/extension-hardening.yml`
- PR gate runs:
  - `npm run test:local:hardening:e2e`
- Manual dispatch option:
  - `run_maps=true` also runs `npm run test:local:hardening:e2e:maps`
  - `run_fallback=true` also runs `npm run test:local:hardening:e2e:fallback`
  - `run_targeted=true` also runs `npm run test:local:hardening:e2e:targeted`
  - `run_long_pagination=true` also runs `npm run test:local:hardening:e2e:long-pagination`
  - optional `targeted_results=<n>` sets targeted e2e cap (default: `12`)
  - optional `long_total_rows=<n>` sets long-pagination fixture rows (default: `1500`)
  - optional `long_batch_size=<n>` sets long-pagination fixture batch size (default: `6`)
  - `targeted_results` must be an integer in `1..500` (validated before targeted e2e runs)
  - `long_total_rows` must be an integer in `300..5000` (validated before long-pagination e2e runs)
  - `long_batch_size` must be an integer in `1..24` (validated before long-pagination e2e runs)
  - targeted artifact upload is cap-tagged: `extension-e2e-artifacts-targeted-<targeted_results>`
  - long-pagination artifact upload is input-tagged:
    - `extension-e2e-artifacts-long-pagination-<long_total_rows>r-<long_batch_size>b`
  - optional `fallback_command` customizes fallback e2e intent text

## Queue Hygiene (Optional Before Release)
If cloud schedules are generating unwanted background queue activity, run:

```bash
npm run queue:hygiene:list:control-api
npm run queue:hygiene:pause:dry-run:control-api
npm run queue:hygiene:pause:apply:control-api
npm run queue:hygiene:list:monitor:control-api
npm run queue:hygiene:pause:monitor:dry-run:control-api
npm run queue:hygiene:pause:monitor:apply:control-api
npm run queue:hygiene:list:frequent:control-api
npm run queue:hygiene:pause:frequent:dry-run:control-api
npm run queue:hygiene:pause:frequent:apply:control-api
npm run queue:hygiene:list:duplicates:control-api
npm run queue:hygiene:pause:duplicates:dry-run:control-api
npm run queue:hygiene:pause:duplicates:apply:control-api
npm run queue:hygiene:pause:duplicates:force:control-api
npm run queue:hygiene:list:near-duplicates:control-api
npm run queue:hygiene:pause:near-duplicates:dry-run:control-api
npm run queue:hygiene:pause:near-duplicates:apply:control-api
npm run queue:hygiene:pause:near-duplicates:force:control-api
npm run queue:hygiene:pause:apply:force:control-api
npm run queue:hygiene:pause:apply:batched:control-api
npm run queue:hygiene:pause:duplicates:batched:control-api
npm run queue:hygiene:pause:near-duplicates:batched:control-api
npm run queue:hygiene:list:near-duplicates:report:control-api
npm run queue:hygiene:pause:near-duplicates:batched:report:control-api
npm run queue:hygiene:list:near-duplicates:report:dated:control-api
npm run queue:hygiene:pause:near-duplicates:batched:report:dated:control-api
npm run queue:hygiene:list:near-duplicates:report:redacted:control-api
npm run queue:hygiene:pause:near-duplicates:batched:report:redacted:control-api
npm run queue:hygiene:list:near-duplicates:stale:control-api
npm run queue:hygiene:list:near-duplicates:stale:scan-all:control-api
npm run queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:control-api
npm run queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:sidecar:control-api
npm run queue:hygiene:list:near-duplicates:stale:scan-all:uncapped:control-api
npm run queue:hygiene:list:near-duplicates:stale:scan-all:autocontinue:control-api
npm run queue:hygiene:pause:near-duplicates:stale:dry-run:control-api
npm run queue:hygiene:pause:near-duplicates:stale:batched:report:redacted:control-api
npm run queue:hygiene:pause:near-duplicates:stale:resilient:report:redacted:control-api
npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:report:redacted:control-api
npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api
npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api
npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api
npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:restart:report:redacted:control-api
npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:strict:report:redacted:control-api
```

Duplicate keep strategy override (optional):
- append `-- --dedupe-keep=newest` to keep newest schedule per duplicate signature.
Signature strategy override (optional):
- append `-- --signature-mode=strict` to require full payload match for duplicate grouping.
Pause guardrail override (optional):
- apply mode is capped at `25` by default (`--max-pause=25`).
- append `-- --force-pause-over-limit=true` only when large bulk pause is intentional.
Pause batching (optional):
- use `--pause-batch-size=<n>` and `--pause-batch-delay-ms=<ms>` for chunked apply.
- use `--continue-on-pause-error=false` when you want fail-fast behavior.
Report output (optional):
- use `--output-file=<path>` to persist queue hygiene summary JSON for ops history.
- use `--output-compact=true` for compact JSON output.
- use `--output-timestamp=true` + `--output-overwrite=false` for immutable dated artifacts.
- use `--redact-signatures=true` before sharing reports outside trusted ops channels.
- output/checkpoint artifact writes use atomic temp-file rename to reduce partial artifacts on interruptions.
Age safety (optional):
- use `--min-age-minutes=<n>` to avoid pausing very recent schedules.
Scan-all (optional):
- use `--scan-all=true` and `--scan-max-pages=<n>` to auto-paginate through the full schedule set.
- use `--scan-max-pages=0` for uncapped operator mode; pair with `--scan-hard-max-pages=<n>` safety cap.
- use `--scan-auto-continue=true` to chain capped segments automatically.
- use `--scan-auto-continue-max-segments=<n>` to bound auto-chain depth.
- use `--scan-resume-file=<path>` (or explicit `--scan-start-cursor-*`) to continue from a prior report cursor.
- use `--scan-resume-from-checkpoint=true` to auto-use checkpoint sidecar as resume source when explicit resume file is omitted.
- use `--scan-resume-validate-api-base=true` to verify resume artifact source matches active API base.
- use `--scan-resume-require-api-base=true` to require `apiBaseUrl` presence in resume artifacts when source validation is enabled.
- use `--scan-resume-api-base-missing-behavior=<restart|error>` to restart or fail fast when resume artifact omits `apiBaseUrl`.
- use `--scan-resume-api-base-mismatch-behavior=<error|restart>` to fail fast or restart on source mismatch.
- use `--scan-resume-validate-kind=true` to verify resume artifact kind matches queue-hygiene checkpoint schema.
- use `--scan-resume-kind-mismatch-behavior=<error|restart>` to fail fast or restart on resume artifact kind mismatch.
- use `--scan-resume-validate-schema-version=true` to verify resume artifact schema version compatibility.
- use `--scan-resume-schema-version-mismatch-behavior=<restart|error>` to restart or fail fast on schema version mismatch.
- use `--scan-resume-generated-at-source=<payload|file-mtime|payload-or-file-mtime>` to control whether resume freshness/future guards use checkpoint payload timestamp or checkpoint file mtime.
- use `--scan-resume-sha256=<sha256>` to require a specific checkpoint artifact hash before resume continues.
- use `--scan-resume-max-bytes=<n>` to guard against oversized resume artifacts before parsing.
- use `--scan-resume-size-behavior=<restart|error>` to restart or fail fast when resume artifact exceeds the configured size cap.
- use `--scan-resume-hash-behavior=<restart|error>` to restart or fail fast when resume hash mismatches expected value.
- use `--scan-resume-max-future-minutes=<n>` to bound acceptable future clock skew in resume artifacts.
- use `--scan-resume-future-behavior=<restart|error>` to restart or fail fast when resume timestamp is too far in the future.
- use `--scan-resume-validate-filters=true` to verify resume artifact filter context matches the active run intent.
- use `--scan-resume-filter-mismatch-behavior=<restart|error>` to restart or fail fast on resume filter mismatch.
- use `--scan-resume-max-age-minutes=<n>` to reject or restart from stale resume files.
- use `--scan-resume-stale-behavior=<restart|error>` to control stale resume handling.
- use `--scan-resume-allow-exhausted=<bool>` to control whether exhausted checkpoints are tolerated (`true`) or treated as strict errors (`false`).
- use `--scan-resume-exhausted-behavior=<noop|restart>` to no-op on exhausted checkpoints or restart from page 1.
- use `--scan-checkpoint-file=<path>` and `--scan-checkpoint-every-pages=<n>` for lightweight resume checkpoints.
- use `--list-retry-count=<n>` and `--list-retry-delay-ms=<ms>` for transient list-page failures.
Pause retries (optional):
- use `--pause-retry-count=<n>` and `--pause-retry-delay-ms=<ms>` for transient failures.

Required env:
- `CONTROL_API_BEARER_TOKEN`
- optional `API_BASE_URL`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FROM_CHECKPOINT=true`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_API_BASE=true`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_REQUIRE_API_BASE=false`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_API_BASE_MISSING_BEHAVIOR=restart`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_API_BASE_MISMATCH_BEHAVIOR=error`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_KIND=true`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_KIND_MISMATCH_BEHAVIOR=error`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_SCHEMA_VERSION=true`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SCHEMA_VERSION_MISMATCH_BEHAVIOR=restart`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_GENERATED_AT_SOURCE=payload-or-file-mtime`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SHA256=<sha256>`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_BYTES=0`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SIZE_BEHAVIOR=restart`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_HASH_BEHAVIOR=restart`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_FUTURE_MINUTES=0`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FUTURE_BEHAVIOR=restart`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_FILTERS=true`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FILTER_MISMATCH_BEHAVIOR=restart`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_AGE_MINUTES=0`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_STALE_BEHAVIOR=restart`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_ALLOW_EXHAUSTED=true`
- optional `CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_EXHAUSTED_BEHAVIOR=noop`
- or auto-login fallback:
  - `CONTROL_API_EMAIL`
  - `CONTROL_API_PASSWORD`
  - optional `CONTROL_API_REGISTER_IF_MISSING=true`
- Branch protection setup:
  - `docs/branch-protection-playbook-2026-02-24.md`
- Mainline policy workflow (defense-in-depth):
  - `.github/workflows/main-push-policy.yml`

## Manual UI Sign-Off (10-15 min)
Use this execution checklist and record evidence while running the steps:
- `docs/manual-ui-parity-signoff-checklist-2026-02-28.md`

Run these checks in loaded unpacked extension (`packages/extension`):
1. Home hub nav: `MENU`, `HISTORY`, `DATA`, `Tools`, `latest`.
2. Tool cards route correctly to each extractor mode.
3. Welcome/quick-start appears for first visits and can be reopened.
4. Simple mode quick flow:
- `Enable All Access` works and status line updates.
- `Quick Extract` starts list/maps flows without opening advanced config first.
- `Point & Follow` opens guided picker flow when auto-detect is insufficient.
5. List extraction end-to-end run returns table rows.
6. Data table cleanup toggles work and do not corrupt schema.
7. Merge columns flow creates merged field and optional source removal works.
8. Exports: CSV/XLSX/JSON download and row counts match table.
9. Activation login/register/device list/remove/rename works.
10. Cloud policy save/load works for authenticated account.
11. Jobs enqueue/list/cancel works for webhook + extraction summary + monitor diff presets.
12. Schedules create/run-now/remove works for webhook + extraction summary + monitor diff presets.
13. Templates save/apply/run/delete and diagnostics report copy work.
14. Page URL generator + recovery controls work (retry failed only, resume checkpoint, failure report CSV/JSON).
15. Reliability profile controls apply and persist (profile/backoff/jitter/session reuse).
16. Diagnostics report includes run artifacts + recent event summary + failure error packet.

## Release Checklist
1. `npm run release:extension` passed.
2. `npm run hardening:railway` passed.
3. Manual UI sign-off completed.
4. Commit/push release changes.
5. Upload zip artifact to Chrome Web Store or private distribution channel.

## Rollback
1. Keep previous release artifact zip available.
2. If a regression is found, re-publish previous stable zip and disable affected new feature toggles server-side where possible.
