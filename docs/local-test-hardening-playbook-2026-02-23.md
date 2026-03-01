# Local Test + Hardening Playbook (2026-02-23)

## Goal
Run a repeatable local pass before every deploy:
- extension runtime/features smoke
- control API health/readiness smoke
- optional cloud/schedules/integrations smoke (when DB is configured)

## One Command

```bash
npm run test:local:hardening
```

Include extension e2e (simple):

```bash
npm run test:local:hardening:e2e
```

Include extension e2e (simple + maps):

```bash
npm run test:local:hardening:e2e:maps
```

Include extension e2e (simple + fallback transitions):

```bash
npm run test:local:hardening:e2e:fallback
```

Include extension e2e (simple + targeted-result cap):

```bash
npm run test:local:hardening:e2e:targeted
```

Include extension e2e (targeted with custom cap):

```bash
npm run test:local:hardening:e2e:targeted -- --target-results=120
```

Include extension e2e (simple + long pagination continuation stress):

```bash
npm run test:local:hardening:e2e:long-pagination
```

Railway auto-bootstrap + hardening:

```bash
npm run hardening:railway
```

Railway auto-bootstrap + e2e hardening:

```bash
npm run hardening:railway:e2e
npm run hardening:railway:e2e:maps
npm run hardening:railway:e2e:fallback
npm run hardening:railway:e2e:targeted
npm run hardening:railway:e2e:long-pagination
```

## What It Executes

1) `npm run smoke:extension`
- storage/runtime + epic5/6/7/8/9/10/11/12/13/14/15 checks

2) Optional extension e2e checks
- direct commands:
  - `npm run e2e:extension:simple`
  - `npm run e2e:extension:maps`
  - `npm run e2e:extension:fallback`
  - `npm run e2e:extension:targeted`
  - `npm run e2e:extension:long-pagination`
- hardening wrappers:
  - `npm run test:local:hardening:e2e`
  - `npm run test:local:hardening:e2e:maps`
  - `npm run test:local:hardening:e2e:fallback`
  - `npm run test:local:hardening:e2e:targeted`
  - `npm run test:local:hardening:e2e:long-pagination`
  - `npm run hardening:railway:e2e`
  - `npm run hardening:railway:e2e:maps`
  - `npm run hardening:railway:e2e:fallback`
  - `npm run hardening:railway:e2e:targeted`
  - `npm run hardening:railway:e2e:long-pagination`
- wrappers set:
  - `RUN_EXTENSION_E2E=true`
  - optional `RUN_EXTENSION_E2E_MAPS=true`
  - optional `RUN_EXTENSION_E2E_FALLBACK=true`
  - optional `RUN_EXTENSION_E2E_TARGETED=true`
  - optional `RUN_EXTENSION_E2E_LONG_PAGINATION=true`

3) local API boot + `npm run smoke:control-api`
- verifies `/healthz` and `/readyz`

4) If `DATABASE_URL` is set and `SKIP_CLOUD_HARDENING!=true`:
- `npm run migrate:control-api`
- boot API with `ENABLE_OPTIONAL_CLOUD_FEATURES=true`
- `npm run phase5:smoke:control-api`
- `npm run phase5:schedule:smoke:control-api`
- `npm run phase9:monitor:smoke:control-api`
- cloud smoke covers both:
  - `integration.webhook.deliver`
  - `extraction.page.summary`
  - `monitor.page.diff`
  - integration secret connection test (`/api/integrations/secrets/test`)

If DB is missing, cloud smoke is skipped automatically.

## Env Notes

Required for core local pass:
- none (defaults used)

Required for full cloud hardening pass:
- `DATABASE_URL`

Optional:
- `API_BASE_URL` (default `http://127.0.0.1:3000`)
- `SKIP_CLOUD_HARDENING=true` (force-skip cloud pass even with DB)
- `VAULT_MASTER_KEY` (recommended for realistic secret-vault behavior)
- `RUN_EXTENSION_E2E=true` (manual env flag if not using wrapper commands)
- `RUN_EXTENSION_E2E_MAPS=true` (manual env flag to add Google Maps quick-flow e2e)
- `RUN_EXTENSION_E2E_FALLBACK=true` (manual env flag to add fallback-transition e2e)
- `RUN_EXTENSION_E2E_TARGETED=true` (manual env flag to add targeted-result cap e2e)
- `RUN_EXTENSION_E2E_LONG_PAGINATION=true` (manual env flag to add long-pagination continuation e2e)
- `E2E_TARGET_RESULTS=120` (optional target cap for targeted e2e; default `12`)
- `E2E_LONG_TOTAL_ROWS=1500` (optional fixture size for long-pagination e2e; default `1500`)
- `E2E_LONG_BATCH_SIZE=6` (optional fixture batch size for long-pagination e2e; default `6`)
- `E2E_PATCH_PERMISSIONS=1` (optional permission API patch mode in maps e2e)

Validation behavior:
- `E2E_TARGET_RESULTS` must be an integer in `1..500` when targeted e2e runs
- `E2E_LONG_TOTAL_ROWS` must be an integer in `300..5000` when long-pagination e2e runs
- `E2E_LONG_BATCH_SIZE` must be an integer in `1..24` when long-pagination e2e runs
- invalid target cap values fail fast before e2e execution

Queue noise control (optional ops command):
- list active schedules:
  - `npm run queue:hygiene:list:control-api`
- list active monitor schedules only:
  - `npm run queue:hygiene:list:monitor:control-api`
- list active frequent interval schedules (`<=60m`) only:
  - `npm run queue:hygiene:list:frequent:control-api`
- list active duplicate schedules only (same job type + cadence + max attempts + payload):
  - `npm run queue:hygiene:list:duplicates:control-api`
- list active near-duplicate schedules only (same job type + cadence + max attempts + target URL signature):
  - `npm run queue:hygiene:list:near-duplicates:control-api`
- list active near-duplicate schedules + write report JSON:
  - `npm run queue:hygiene:list:near-duplicates:report:control-api`
- list active near-duplicate schedules + write dated report JSON:
  - `npm run queue:hygiene:list:near-duplicates:report:dated:control-api`
- list active near-duplicate schedules + write dated redacted report JSON:
  - `npm run queue:hygiene:list:near-duplicates:report:redacted:control-api`
- list active near-duplicate schedules older than 180 minutes:
  - `npm run queue:hygiene:list:near-duplicates:stale:control-api`
- list active near-duplicate schedules older than 180 minutes across all pages:
  - `npm run queue:hygiene:list:near-duplicates:stale:scan-all:control-api`
- list active near-duplicate schedules older than 180 minutes across all pages + write reusable checkpoint:
  - `npm run queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:control-api`
- list active near-duplicate schedules older than 180 minutes + write lightweight checkpoint sidecar only:
  - `npm run queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:sidecar:control-api`
- list active near-duplicate schedules older than 180 minutes with uncapped operator page limit:
  - `npm run queue:hygiene:list:near-duplicates:stale:scan-all:uncapped:control-api`
- list active near-duplicate schedules older than 180 minutes with auto-continue segments:
  - `npm run queue:hygiene:list:near-duplicates:stale:scan-all:autocontinue:control-api`
- pause active schedules (dry-run):
  - `npm run queue:hygiene:pause:dry-run:control-api`
- pause active monitor schedules only (dry-run):
  - `npm run queue:hygiene:pause:monitor:dry-run:control-api`
- pause active frequent interval schedules only (dry-run):
  - `npm run queue:hygiene:pause:frequent:dry-run:control-api`
- pause active duplicate schedules only (dry-run):
  - `npm run queue:hygiene:pause:duplicates:dry-run:control-api`
- pause active near-duplicate schedules only (dry-run):
  - `npm run queue:hygiene:pause:near-duplicates:dry-run:control-api`
- pause active schedules (apply):
  - `npm run queue:hygiene:pause:apply:control-api`
- pause active schedules (apply + force guardrail override):
  - `npm run queue:hygiene:pause:apply:force:control-api`
- pause active schedules (apply + force + batched):
  - `npm run queue:hygiene:pause:apply:batched:control-api`
- pause active monitor schedules only (apply):
  - `npm run queue:hygiene:pause:monitor:apply:control-api`
- pause active frequent interval schedules only (apply):
  - `npm run queue:hygiene:pause:frequent:apply:control-api`
- pause active duplicate schedules only (apply):
  - `npm run queue:hygiene:pause:duplicates:apply:control-api`
- pause active duplicate schedules only (apply + force guardrail override):
  - `npm run queue:hygiene:pause:duplicates:force:control-api`
- pause active duplicate schedules only (apply + force + batched):
  - `npm run queue:hygiene:pause:duplicates:batched:control-api`
- pause active near-duplicate schedules only (apply):
  - `npm run queue:hygiene:pause:near-duplicates:apply:control-api`
- pause active near-duplicate schedules only (apply + force guardrail override):
  - `npm run queue:hygiene:pause:near-duplicates:force:control-api`
- pause active near-duplicate schedules only (apply + force + batched):
  - `npm run queue:hygiene:pause:near-duplicates:batched:control-api`
- pause active near-duplicate schedules only (apply + force + batched + report):
  - `npm run queue:hygiene:pause:near-duplicates:batched:report:control-api`
- pause active near-duplicate schedules only (apply + force + batched + dated report):
  - `npm run queue:hygiene:pause:near-duplicates:batched:report:dated:control-api`
- pause active near-duplicate schedules only (apply + force + batched + dated redacted report):
  - `npm run queue:hygiene:pause:near-duplicates:batched:report:redacted:control-api`
- pause active near-duplicate schedules older than 180 minutes (dry-run):
  - `npm run queue:hygiene:pause:near-duplicates:stale:dry-run:control-api`
- pause active near-duplicate schedules older than 180 minutes (apply + force + batched + dated redacted report):
  - `npm run queue:hygiene:pause:near-duplicates:stale:batched:report:redacted:control-api`
- pause active near-duplicate schedules older than 180 minutes (resilient retries + dated redacted report):
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:report:redacted:control-api`
- pause active near-duplicate schedules older than 180 minutes across all pages (resilient retries + dated redacted report):
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:report:redacted:control-api`
- pause active near-duplicate schedules older than 180 minutes with checkpoint auto-resume orchestration:
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api`
- pause active near-duplicate schedules older than 180 minutes with checkpoint freshness guard:
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api`
- pause active near-duplicate schedules from prior checkpoint (resilient retries + dated redacted report):
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api`
- pause active near-duplicate schedules from prior checkpoint and restart if checkpoint is exhausted:
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:restart:report:redacted:control-api`
- pause active near-duplicate schedules from prior checkpoint with strict resume cursor requirement:
  - `npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:strict:report:redacted:control-api`
- optional duplicate keep behavior:
  - add `-- --dedupe-keep=newest` to keep newest schedule per duplicate group
- optional signature strategy override:
  - add `-- --signature-mode=strict` to require full payload match
- pause guardrail behavior:
  - apply mode is capped by default at `25` schedules (`--max-pause=25`)
  - raise cap with `-- --max-pause=50` when needed
  - explicitly override with `-- --force-pause-over-limit=true` when bulk pause is intentional
- pause batching behavior:
  - default batch size is `20` (`--pause-batch-size=20`)
  - optional inter-batch wait (`--pause-batch-delay-ms=250`)
  - to fail fast on first pause error: `--continue-on-pause-error=false`
- pause retry behavior:
  - retry transient pause failures with `--pause-retry-count=3`
  - set retry backoff with `--pause-retry-delay-ms=500`
  - geometric backoff factor: `--pause-retry-backoff-factor=1.5`
  - jitter for retry spread: `--pause-retry-jitter-ms=100`
  - per-request timeout: `--pause-request-timeout-ms=15000`
- report output behavior:
  - write JSON summary with `--output-file=dist/ops/queue-hygiene.json`
  - compact JSON mode: `--output-compact=true`
  - timestamped artifact name: `--output-timestamp=true`
  - prevent overwrite: `--output-overwrite=false`
  - redact signatures for safer sharing: `--redact-signatures=true`
  - checkpoint/output artifact writes are atomic (temp-file + rename)
- age safety behavior:
  - restrict to older schedules with `--min-age-minutes=180`
- scan-all behavior:
  - fetch every schedule page with `--scan-all=true`
  - cap scan depth with `--scan-max-pages=200`
  - set `--scan-max-pages=0` to disable operator cap and rely on hard safety ceiling
  - set hard safety ceiling with `--scan-hard-max-pages=5000`
  - auto-chain capped segments with `--scan-auto-continue=true`
  - limit auto-chain depth with `--scan-auto-continue-max-segments=20`
  - resume from checkpoint cursor with `--scan-resume-file=dist/ops/queue-hygiene-near-duplicates-stale-scan.cursor.json`
  - auto-resume from checkpoint sidecar with `--scan-resume-from-checkpoint=true`
  - enforce resume source API-base match with `--scan-resume-validate-api-base=true`
  - require API-base presence in resume artifact with `--scan-resume-require-api-base=true`
  - missing API-base behavior: `--scan-resume-api-base-missing-behavior=restart|error`
  - API-base mismatch behavior: `--scan-resume-api-base-mismatch-behavior=error|restart`
  - enforce resume artifact kind match with `--scan-resume-validate-kind=true`
  - kind mismatch behavior: `--scan-resume-kind-mismatch-behavior=error|restart`
  - enforce resume schema version match with `--scan-resume-validate-schema-version=true`
  - schema version mismatch behavior: `--scan-resume-schema-version-mismatch-behavior=restart|error`
  - choose resume timestamp source with `--scan-resume-generated-at-source=<payload|file-mtime|payload-or-file-mtime>`
  - optionally pin checkpoint integrity hash with `--scan-resume-sha256=<sha256>`
  - enforce resume artifact size ceiling with `--scan-resume-max-bytes=<n>`
  - oversized resume behavior: `--scan-resume-size-behavior=restart|error`
  - hash mismatch behavior: `--scan-resume-hash-behavior=restart|error`
  - enforce max future timestamp skew with `--scan-resume-max-future-minutes=<n>`
  - future timestamp behavior: `--scan-resume-future-behavior=restart|error`
  - enforce resume filter compatibility with `--scan-resume-validate-filters=true`
  - filter mismatch behavior: `--scan-resume-filter-mismatch-behavior=restart|error`
  - enforce checkpoint freshness with `--scan-resume-max-age-minutes=<n>`
  - stale checkpoint behavior: `--scan-resume-stale-behavior=restart|error`
  - tolerate exhausted checkpoints by default with `--scan-resume-allow-exhausted=true`
  - exhausted checkpoint behavior control: `--scan-resume-exhausted-behavior=noop|restart`
  - enforce strict resume cursor requirement with `--scan-resume-allow-exhausted=false`
  - write checkpoint sidecar with `--scan-checkpoint-file=dist/ops/queue-hygiene-near-duplicates-stale-scan.cursor.json`
  - checkpoint cadence control: `--scan-checkpoint-every-pages=1`
  - retry transient list page failures with `--list-retry-count=3` and `--list-retry-delay-ms=500`
- requires:
  - `CONTROL_API_BEARER_TOKEN`
  - optional `API_BASE_URL`
  - or auto-login fallback:
    - `CONTROL_API_EMAIL`
    - `CONTROL_API_PASSWORD`
    - optional `CONTROL_API_REGISTER_IF_MISSING=true`

## CI Workflow

- Workflow file:
  - `.github/workflows/extension-hardening.yml`
- Pull request gate:
  - runs `npm run test:local:hardening:e2e`
- Manual dispatch option:
  - set `run_maps=true` to also run `npm run test:local:hardening:e2e:maps`
  - set `run_fallback=true` to also run `npm run test:local:hardening:e2e:fallback`
  - set `run_targeted=true` to also run `npm run test:local:hardening:e2e:targeted`
  - set `run_long_pagination=true` to also run `npm run test:local:hardening:e2e:long-pagination`
  - optional `targeted_results` sets targeted cap (default: `12`)
  - optional `long_total_rows` sets long-pagination fixture rows (default: `1500`)
  - optional `long_batch_size` sets long-pagination fixture batch size (default: `6`)
  - optional `fallback_command` customizes fallback e2e intent text (default: `maps https://example.com`)
  - invalid `targeted_results` values fail in the workflow validation step (`Validate Targeted Results Input`)
  - invalid `long_total_rows` / `long_batch_size` values fail in workflow validation (`Validate Long Pagination Inputs`)
  - targeted artifact name includes cap value: `extension-e2e-artifacts-targeted-<targeted_results>`
  - long-pagination artifact name includes fixture knobs:
    - `extension-e2e-artifacts-long-pagination-<long_total_rows>r-<long_batch_size>b`

## Railway CLI Quick Bootstrap (staging)

Get the externally reachable DB connection from Railway:
- `railway variable list -s Postgres -k`
- Use `DATABASE_PUBLIC_URL` as local `DATABASE_URL`.

PowerShell one-pass setup + run:

```powershell
$pg = (railway variable list -s Postgres -k | Select-String '^DATABASE_PUBLIC_URL=').ToString().Split('=', 2)[1]
$vault = (railway variable list -s control-api -k | Select-String '^VAULT_MASTER_KEY=').ToString().Split('=', 2)[1]
$jwt = (railway variable list -s control-api -k | Select-String '^JWT_ACCESS_SECRET=').ToString().Split('=', 2)[1]
$obs = (railway variable list -s control-api -k | Select-String '^OBSERVABILITY_API_KEY=').ToString().Split('=', 2)[1]
$env:DATABASE_URL = $pg
$env:VAULT_MASTER_KEY = $vault
$env:JWT_ACCESS_SECRET = $jwt
$env:OBSERVABILITY_API_KEY = $obs
npm run test:local:hardening
```

## Manual UI Spot Check (5-10 min)

1) Activation:
- login, register license, validate/list devices

2) Extraction:
- list extractor -> run -> table rows visible
- page details/email/text -> run -> rows/history updates
- URL generator (range/seed/pattern) -> manual URLs updated correctly
- recovery controls: retry-failed-only + resume-checkpoint + failure report export
- reliability profiles: profile switch + backoff/jitter/session reuse controls
- image scan/download smoke

3) Cloud control:
- policy load/save
- integration secret upsert/list/remove
- jobs enqueue/list/cancel
- jobs preset test: webhook + extraction summary + monitor diff
- schedules create/list/run-now/remove
- schedules preset test: webhook + extraction summary + monitor diff
- observability dashboard/errors/jobs fetch

4) Templates/diagnostics:
- save/apply/run/delete template
- generate snapshot/report and copy to clipboard
- verify run artifact summary + latest failure packet fields in diagnostics output
