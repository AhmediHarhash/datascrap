# Ops Hardening Policies (2026-02-23)

## Scope
- Control plane: `services/control-api`
- Environments: `staging`, `production`
- Hosting: Railway (API + Postgres)

## 1) JWT Key Rotation Policy

### Objective
- Rotate signing keys without logging users out immediately.
- Keep old keys available for token verification during grace window.

### Config Contract
- `JWT_ACCESS_SECRETS`: comma-separated `kid:secret` pairs.
  - example: `k20260223:<secretA>,k20260401:<secretB>`
- `JWT_ACTIVE_KID`: key ID used for newly issued access tokens.
- `JWT_ACCESS_SECRET`: legacy fallback secret (kept for backward compatibility).

### Rotation Procedure
1. Generate a new key using:
   - `npm run jwt:generate:control-api`
2. Add new `kid:secret` to `JWT_ACCESS_SECRETS` in staging and production.
3. Keep `JWT_ACTIVE_KID` on current key and deploy.
4. Flip `JWT_ACTIVE_KID` to new key and deploy.
5. Keep previous key in `JWT_ACCESS_SECRETS` for at least `2 x ACCESS_TOKEN_TTL_SECONDS` plus 15 minutes.
6. Remove old key after grace window expires and deploy again.

### Emergency Rotation
1. Add fresh key pair.
2. Immediately set `JWT_ACTIVE_KID` to new key.
3. Remove compromised key from `JWT_ACCESS_SECRETS`.
4. Revoke suspicious refresh sessions from `sessions` table where needed.

## 2) Postgres Backup Policy

### Objective
- Daily automated logical backup verification for both environments.

### Automation
- Workflow: `.github/workflows/backup-verify.yml`
- Script: `services/control-api/scripts/backup-verify.js`
- Schedule: daily at `01:20 UTC`.
- Method:
  - run `pg_dump` custom-format backup
  - run `pg_restore --list` integrity/catalog check
  - publish backup summary artifact
  - open/update issue `Backup Verification Incident` on failure

### Required GitHub Secrets
- `BACKUP_DATABASE_URL_STAGING`
- `BACKUP_DATABASE_URL_PRODUCTION`

### Recommended GitHub Vars
- `MIN_BACKUP_BYTES=10000`
- `MIN_BACKUP_ENTRIES=20`

### Recovery Targets
- RPO: <= 24 hours
- RTO: <= 2 hours (manual restore with validated dump path)

## 3) Railway Usage Cap Policy

### Objective
- Keep margin safe on low-cost subscription model.

### Guardrails
1. Railway account spend limit:
   - configure account-level monthly spend cap to `10 USD`.
2. Service budget target:
   - control-plane target `<= 5 USD/month`.
3. GitHub cost monitor controls:
   - `MONTHLY_BUDGET_USD=5`
   - `COST_ALERT_THRESHOLD_PERCENT=80`
   - `COST_HARD_CAP_PERCENT=100`
4. Alert action:
   - open/update `Cost Monitor Incident`
   - apply mitigation ladder from `docs/phase4-cost-performance-control-2026-02-22.md`

## 4) Incident Ownership Policy

### Assignment
- Primary owner: `Ahmedi Harhash (@AhmediHarhash)`
- Secondary owner: `Ahmedi Harhash (@AhmediHarhash)` until second owner is assigned
- Escalation: GitHub incident issue + optional webhook channel

### Coverage Rule
- All incidents (`Uptime`, `SLO`, `Cost`, `Backup`) must receive first response in <= 30 minutes during active working window.

## 5) Chaos Drill Policy

### Objective
- Prove service restart and DB restart do not cause durable data loss.

### Drill Steps (staging)
1. Run `npm run chaos:check:control-api` with fixed `CHAOS_EMAIL` + `CHAOS_PASSWORD`.
2. Restart control API service on Railway staging.
3. Run chaos check again and compare account/device continuity.
4. Restart Postgres service on Railway staging.
5. Run chaos check again and confirm same account is healthy.
6. Record evidence in dated drill report doc.

### Exit Rule
- No account/profile/device data loss across restart sequence.
- `GET /readyz` returns DB reachable after restart.
