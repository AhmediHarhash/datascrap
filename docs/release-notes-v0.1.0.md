# v0.1.0

Released: 2026-03-01

## Highlights

1. Delivered Phase11 Sprint B extension autonomy and hardening slices.
2. Hardened Point & Follow tab targeting to prevent picker startup on the wrong tab context.
3. Expanded local and Railway hardening matrices across all major extraction modes.
4. Added queue hygiene and monitor-oriented control-api operational tooling.
5. Finalized release/deploy documentation for production rollout and rollback.

## What changed

### Extension autonomy and extraction robustness

1. Added autonomous orchestration module and sidepanel strategy execution wiring.
2. Improved guided fallback behavior and status handling in Point & Follow.
3. Added strict preferred URL flow for picker startup:
   - Sidepanel sends `preferredUrl`.
   - Service worker forwards `preferredUrl`.
   - Picker session manager enforces preferred tab matching or fails fast with clear guidance.
4. Added and hardened e2e scenarios:
   - fallback
   - targeted results
   - long pagination
   - navigate cycle

### Control API operations

1. Added schedule hygiene script and queue hygiene capabilities.
2. Updated monitoring/queue documentation and automation workflows.

### Testing and release gates

1. Expanded smoke suite coverage (`epic16` through `epic73`).
2. Full local hardening e2e matrix passed.
3. Full Railway hardening e2e matrix passed.
4. Extension packaging gate passed.

## Validation

Commands passed:

1. `npm run test:local:hardening:e2e`
2. `npm run test:local:hardening:e2e:maps`
3. `npm run test:local:hardening:e2e:fallback`
4. `npm run test:local:hardening:e2e:targeted`
5. `npm run test:local:hardening:e2e:long-pagination`
6. `npm run test:local:hardening:e2e:navigate-cycle`
7. `npm run hardening:railway:e2e`
8. `npm run hardening:railway:e2e:maps`
9. `npm run hardening:railway:e2e:fallback`
10. `npm run hardening:railway:e2e:targeted`
11. `npm run hardening:railway:e2e:long-pagination`
12. `npm run hardening:railway:e2e:navigate-cycle`
13. `npm run release:extension`

## Artifacts

1. `dist/extension/datascrap-v0.1.0.zip`
2. `dist/extension/datascrap-latest.zip`

## Upgrade notes

1. Ensure Railway secrets are set for `control-api` (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `VAULT_MASTER_KEY`, `OBSERVABILITY_API_KEY`).
2. Run migrations before or during deployment.
3. Validate `healthz` and `readyz` after deploy.
4. Use `docs/production-deploy-checklist-2026-03-01.md` for rollout and rollback steps.

