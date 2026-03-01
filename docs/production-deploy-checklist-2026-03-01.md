# Production Deploy Checklist (v0.1.0)

Date: 2026-03-01
Branch: `feat/epic11-hardening-gates`
Release tag: `v0.1.0`

## Release scope

- `c4a2046` Ship Phase11 Sprint B autonomy and hardening slices
- `ab2dd6d` Harden Point & Follow picker tab targeting
- `1c821f3` Harden release gates and finalize manual sign-off evidence

## Pre-deploy gates

All gates below were run and passed on 2026-03-01:

1. Local hardening matrix
   - `npm run test:local:hardening:e2e`
   - `npm run test:local:hardening:e2e:maps`
   - `npm run test:local:hardening:e2e:fallback`
   - `npm run test:local:hardening:e2e:targeted`
   - `npm run test:local:hardening:e2e:long-pagination`
   - `npm run test:local:hardening:e2e:navigate-cycle`
2. Railway hardening matrix
   - `npm run hardening:railway:e2e`
   - `npm run hardening:railway:e2e:maps`
   - `npm run hardening:railway:e2e:fallback`
   - `npm run hardening:railway:e2e:targeted`
   - `npm run hardening:railway:e2e:long-pagination`
   - `npm run hardening:railway:e2e:navigate-cycle`
3. Extension release packaging
   - `npm run release:extension`

## Artifacts

- `dist/extension/datascrap-v0.1.0.zip`
- `dist/extension/datascrap-latest.zip`

Both artifacts were generated from the passing release gate run.

## Deploy steps

1. Confirm runtime secrets in Railway for `control-api`.
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `VAULT_MASTER_KEY`
   - `OBSERVABILITY_API_KEY`
2. Run database migration before or during deploy.
   - `npm run migrate:control-api`
3. Deploy `control-api` (Railway).
4. Verify health after deploy.
   - `GET /healthz`
   - `GET /readyz`
5. Publish extension package.
   - Upload `dist/extension/datascrap-v0.1.0.zip` to Chrome Web Store release flow.
6. Post-release smoke verification.
   - `npm run smoke:extension`
   - `npm run smoke:control-api`

## Rollback plan

1. Backend rollback
   - Redeploy previous known-good commit (`1c821f3`) for `control-api`.
2. Extension rollback
   - Re-publish previous approved extension package in store dashboard.
3. Data safety
   - If needed, pause schedule execution via queue hygiene scripts before rollback changes.

## Post-release monitoring

Run and review:

- `npm run queue:monitor:control-api`
- `npm run queue:hygiene:list:near-duplicates:report:redacted:control-api`
- `npm run phase9:monitor:smoke:control-api`

