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
```

This runs:
1. `npm run hardening:railway:e2e` (or `:maps`)
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
- Branch protection setup:
  - `docs/branch-protection-playbook-2026-02-24.md`
- Mainline policy workflow (defense-in-depth):
  - `.github/workflows/main-push-policy.yml`

## Manual UI Sign-Off (10-15 min)
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
