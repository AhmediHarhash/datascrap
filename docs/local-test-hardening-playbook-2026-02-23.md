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

Railway auto-bootstrap + hardening:

```bash
npm run hardening:railway
```

Railway auto-bootstrap + e2e hardening:

```bash
npm run hardening:railway:e2e
npm run hardening:railway:e2e:maps
```

## What It Executes

1) `npm run smoke:extension`
- storage/runtime + epic5/6/7/8/9/10/11/12/13/14/15 checks

2) Optional extension e2e checks
- direct commands:
  - `npm run e2e:extension:simple`
  - `npm run e2e:extension:maps`
- hardening wrappers:
  - `npm run test:local:hardening:e2e`
  - `npm run test:local:hardening:e2e:maps`
  - `npm run hardening:railway:e2e`
  - `npm run hardening:railway:e2e:maps`
- wrappers set:
  - `RUN_EXTENSION_E2E=true`
  - optional `RUN_EXTENSION_E2E_MAPS=true`

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
- `E2E_PATCH_PERMISSIONS=1` (optional permission API patch mode in maps e2e)

## CI Workflow

- Workflow file:
  - `.github/workflows/extension-hardening.yml`
- Pull request gate:
  - runs `npm run test:local:hardening:e2e`
- Manual dispatch option:
  - set `run_maps=true` to also run `npm run test:local:hardening:e2e:maps`

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
