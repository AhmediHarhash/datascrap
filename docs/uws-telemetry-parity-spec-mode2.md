# UWS Telemetry Parity Spec (Mode 2)

## Decision (Locked)
- Telemetry parity depth is **semantic parity**, not vendor hard-coupling.
- We will match event meaning and coverage seen in UWS, while using an adapter-based implementation.

## Goals
1) Preserve product analytics visibility across extraction flows.
2) Preserve error observability and run diagnostics.
3) Avoid architecture lock-in to a single analytics provider.
4) Prevent extracted row payload leakage.

## Scope
1) Product analytics events
2) Run lifecycle metrics
3) Error reporting hooks
4) Audit trail for extraction/export actions

## Event Model
Common envelope:
- `event_name`
- `timestamp`
- `workspace_id`
- `user_id`
- `session_id`
- `run_id` (when applicable)
- `tool_type` (`list`, `pages`, `email`, `text`, `image`, `maps`, `metadata`)
- `source` (`extension`, `web_console`, `api`)
- `payload` (event-specific fields)

## Required Event Families
1) Setup and onboarding
- `welcome_shown`
- `quick_start_opened`
- `tutorial_opened`
- `rating_dialog_opened`
- `rating_submitted`

2) Extraction lifecycle
- `extraction_started`
- `extraction_progress`
- `extraction_stopped`
- `extraction_completed`
- `extraction_failed`
- `extraction_rerun_requested`

3) Tool-specific starts
- `list_extraction_started`
- `page_extraction_started`
- `email_extraction_started`
- `text_extraction_started`
- `image_scan_started`
- `maps_extraction_started`

4) Config and settings
- `profile_selected`
- `profile_edited`
- `profile_reset`
- `deep_scanning_toggled`
- `faster_mode_toggled`

5) Data outputs
- `export_menu_opened`
- `export_clicked` (format: csv/xlsx/json/sheets/clipboard)
- `image_download_started`
- `image_download_completed`

6) Upsell/roadmap interactions
- `upsell_modal_opened`
- `upgrade_clicked`
- `coming_soon_notify_clicked`
- `roadmap_card_opened`

7) Integrations/scheduling
- `schedule_created`
- `schedule_updated`
- `schedule_triggered`
- `webhook_delivery_attempted`
- `webhook_delivery_succeeded`
- `webhook_delivery_failed`

## Error Reporting
Error packet fields:
- `error_type` (validation/network/timeout/selector/permission/unexpected)
- `message`
- `stack` (if available)
- `run_step`
- `url`
- `retry_count`
- `is_recoverable`

Severity:
- `info`
- `warning`
- `error`
- `critical`

## Provider Architecture
1) `TelemetryClient` interface
- `track(event_name, payload)`
- `capture_error(error_packet)`
- `flush()`

2) Adapters
- `PosthogAdapter` (analytics)
- `SentryAdapter` (error capture)
- `ConsoleAdapter` (dev)
- `NoopAdapter` (tests)

3) Routing
- Analytics events can fan out to one or more adapters.
- Errors route to error adapter + local run packet storage.

## Acceptance Criteria
1) All required event families emit in E2E flows.
2) Failed runs always produce an error packet.
3) Event emission does not block extraction execution.
4) Adapter outage degrades gracefully (no run failure).
5) Telemetry and error packets never include full extracted row payloads by default.
