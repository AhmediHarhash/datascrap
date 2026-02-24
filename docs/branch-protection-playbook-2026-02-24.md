# Branch Protection Playbook (2026-02-24)

## Goal
Require extension hardening CI before merge on the default branch.

## Required Status Check
- `Extension Hardening / local-hardening-e2e`

## One-Command Setup

1) Preview payload:

```bash
npm run github:branch-protection:plan
```

2) Apply to default (`main`) branch:

```bash
GITHUB_TOKEN=<repo_admin_token> npm run github:branch-protection:apply
```

If your default branch is not `main`:

```bash
GITHUB_TOKEN=<repo_admin_token> node scripts/apply-branch-protection.mjs --apply --branch=<branch>
```

If auto-repo detection fails:

```bash
GITHUB_TOKEN=<repo_admin_token> node scripts/apply-branch-protection.mjs --apply --repo=<owner/repo>
```

## What The Script Enforces
- required status checks enabled and strict up-to-date checks
- required check context:
  - `Extension Hardening / local-hardening-e2e`
- at least 1 approving review
- stale reviews dismissed on new commits
- admins included in enforcement
- linear history required
- force pushes and deletions blocked
- conversation resolution required

## Notes
- The script uses `GITHUB_TOKEN` with repo admin permission to call GitHub branch protection API.
- Maps e2e is intentionally optional/manual and is not a required merge check.
- Current repo status (2026-02-24):
  - `AhmediHarhash/datascrap` branch protection is applied on `main`
  - required context: `Extension Hardening / local-hardening-e2e`

## Private Repo Plan Limitation Fallback
- If GitHub returns:
  - `Upgrade to GitHub Pro or make this repository public to enable this feature.`
- Use workflow enforcement fallback:
  - `.github/workflows/extension-hardening.yml`
    - runs hardening e2e on pull requests and `main` pushes
  - `.github/workflows/main-push-policy.yml`
    - fails when a `main` commit has no associated PR
    - opens a policy incident issue for visibility
