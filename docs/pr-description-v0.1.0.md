# PR: v0.1.0 hardening and autonomy rollout

## Summary

This PR ships Phase11 Sprint B production hardening for the extension and control-api, plus final release readiness artifacts.

Key outcomes:

1. Autonomous orchestration and guided fallback improvements in the extension.
2. Point & Follow picker hardening to avoid selecting the wrong tab context.
3. Expanded e2e/smoke hardening gates (local + Railway) across maps, fallback, targeted, long pagination, and navigate-cycle flows.
4. Queue hygiene and schedule safety tooling improvements for control-api operations.
5. Production release documentation and runbooks for deploy/rollback.

## Commits in scope

1. `1c821f3` harden release gates and finalize manual sign-off evidence
2. `ab2dd6d` Harden Point & Follow picker tab targeting
3. `c4a2046` Ship Phase11 Sprint B autonomy and hardening slices
4. `6ec2998` docs: add v0.1.0 production deploy checklist

## Technical highlights

### Extension

1. Added autonomous execution planner support in core/vendor core and wired sidepanel orchestration.
2. Hardened guided fallback and Point & Follow flow transitions.
3. Added preferred target URL propagation from sidepanel -> service worker -> picker session manager.
4. Tightened picker session tab selection:
   - Exact/same-origin preferred tab matching.
   - No unrelated tab fallback when a preferred URL exists.
   - Clear user-facing error when target site tab is not open.
5. Added additional e2e scenarios for fallback, targeted results, long pagination, and navigate cycle.
6. Expanded extension smoke coverage through epic16-epic73 scripts.

### Control API and ops

1. Added schedule hygiene script and associated queue hygiene/monitoring docs and workflows.
2. Updated schedules routes/services and queue monitor behavior for safer operations.

### Documentation and release readiness

1. Added sprint slice documentation for Phase11 Sprint B.
2. Added production deploy checklist:
   - `docs/production-deploy-checklist-2026-03-01.md`

## Validation evidence

All of the following passed on the branch before tagging:

1. Local hardening e2e matrix:
   - `npm run test:local:hardening:e2e`
   - `npm run test:local:hardening:e2e:maps`
   - `npm run test:local:hardening:e2e:fallback`
   - `npm run test:local:hardening:e2e:targeted`
   - `npm run test:local:hardening:e2e:long-pagination`
   - `npm run test:local:hardening:e2e:navigate-cycle`
2. Railway hardening e2e matrix:
   - `npm run hardening:railway:e2e`
   - `npm run hardening:railway:e2e:maps`
   - `npm run hardening:railway:e2e:fallback`
   - `npm run hardening:railway:e2e:targeted`
   - `npm run hardening:railway:e2e:long-pagination`
   - `npm run hardening:railway:e2e:navigate-cycle`
3. Release packaging:
   - `npm run release:extension`

Artifacts:

- `dist/extension/datascrap-v0.1.0.zip`
- `dist/extension/datascrap-latest.zip`

## Risk and rollback

Risk is medium due to broad orchestration and test harness expansion, but mitigated by full matrix coverage and Railway-backed gates.

Rollback path:

1. Redeploy previous known-good backend commit (`1c821f3`) if needed.
2. Re-publish prior extension package if a store regression is detected.
3. Use queue hygiene scripts to pause risky schedules during rollback.

