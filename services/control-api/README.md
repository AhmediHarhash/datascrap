# Control API

Minimal control-plane bootstrap service for Datascrap.

## Local Run

```bash
npm install
npm run migrate:control-api
npm run start:control-api
```

## Endpoints

- `GET /healthz`
- `GET /readyz`
- `GET /api/config`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me` (Bearer token)
- `POST /api/license/register` (Bearer token)
- `GET /api/license/status` (Bearer token)
- `POST /api/devices/validate-devices`
- `POST /api/devices`
- `POST /api/devices/remove`
- `POST /api/devices/rename`

## Smoke Test

```bash
npm run smoke:control-api
```

## Notes

- `migrate:control-api` needs `DATABASE_URL` set.
- Device limit is enforced server-side from account `max_devices` (default `2`).
