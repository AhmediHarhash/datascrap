# UWS Data Residency Policy (Mode 2, Locked)

## Status
- Locked on 2026-02-22

## Core Rule
- We do **not** store extracted row-level user datasets in our cloud by default.

## Where Data Lives
1) Default
- User device local storage (extension IndexedDB / local export files).

2) Optional user-linked destinations
- User-configured Google Sheets.
- User-configured API/webhook destinations.
- Other connectors explicitly linked by user.

3) Our cloud (allowed data only)
- account identity
- auth sessions/tokens
- license/subscription status
- device registrations (max 2 active devices/account)
- usage counters/quotas
- minimal settings sync metadata (non-row payload)

## Explicitly Not Stored By Us (Default)
1) Full extracted row tables
2) Raw extracted page datasets
3) Bulk exports as persistent cloud archives (unless user explicitly routes to their own linked destination)

## Product Implications
1) Data table is local-first.
2) Export is direct from local data to file/sheets/api.
3) Cross-device sync is lightweight and config-level, not full dataset replication.
4) Scheduled unattended cloud extraction can be introduced later only with clear opt-in and separate economics.

## Engineering Guardrails
1) Telemetry must never include full row payloads.
2) Error reports must redact extracted content by default.
3) Any future cloud dataset storage requires explicit product flag + user opt-in + pricing review.
