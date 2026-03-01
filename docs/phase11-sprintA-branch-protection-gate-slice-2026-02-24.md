# Phase 11 Sprint A - Branch Protection Gate Slice (2026-02-24)

## Scope
Enforce required CI merge checks as a reproducible, scriptable operation:
- add branch protection automation script
- expose plan/apply commands in package scripts
- document exact required check context and setup flow

## Implementation
1) Branch protection automation
- Added:
  - `scripts/apply-branch-protection.mjs`
- Supports:
  - repo auto-detection from `origin`
  - `--branch` override
  - `--repo` override
  - dry-run payload preview
  - apply mode via GitHub REST API (`PUT /branches/{branch}/protection`)

2) Commands
- Updated:
  - `package.json`
- Added:
  - `github:branch-protection:plan`
  - `github:branch-protection:apply`

3) Required check lock
- Required status check context:
  - `Extension Hardening / local-hardening-e2e`
- Maps e2e remains optional/manual and is not required for merge.

4) Runbooks/docs
- Added:
  - `docs/branch-protection-playbook-2026-02-24.md`
- Updated:
  - `docs/production-test-readiness-2026-02-23.md`
  - `docs/extension-release-playbook-2026-02-23.md`
  - `docs/release-execution-2026-02-23.md`

5) Mainline policy workflow (defense-in-depth)
- Updated:
  - `.github/workflows/extension-hardening.yml` (adds `push` trigger on `main`)
- Added:
  - `.github/workflows/main-push-policy.yml`
- Behavior:
  - hardening runs on each `main` push
  - push without associated PR fails policy workflow and opens issue

## Validation
1) `node --check scripts/apply-branch-protection.mjs` -> pass
2) `npm run github:branch-protection:plan` -> pass
3) `npm run github:branch-protection:apply` -> pass (public repo + admin token)
4) `gh api repos/AhmediHarhash/datascrap/branches/main/protection` -> required context verified

## Notes
- Applying protection requires valid `GITHUB_TOKEN` with repo admin permissions.
- A temporary plan-limit block was observed before repo visibility changed; protection is now applied and active.
