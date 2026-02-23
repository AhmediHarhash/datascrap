# Phase 6 Tool-Specific Advanced Flows (2026-02-23)

## Scope
Deliver Epic 6 baseline:
- email deep scanning controls
- text extraction structured output hardening
- metadata extractor implementation (JSON-LD/meta/contact/review signals)
- Google Maps extraction options

## Implemented

1) Metadata extractor capability path (real engine)
- New background engine:
  - `packages/extension/background/metadata-extraction-engine.mjs`
- Core metadata runner now delegates to capability engine when provided:
  - `packages/core/src/runners/metadata-extractor-runner.mjs`
- Service worker runtime capabilities now include metadata engine:
  - `packages/extension/background/service-worker.mjs`

2) Metadata extraction behavior
- URL batch + queue controls aligned with page extractor queue model.
- Extracts:
  - title/description/author/publishDate/canonical/OG/Twitter fields
  - JSON-LD script count + flattened schema types
  - review signals (review count + aggregate rating counts)
  - contact signals (email/phone counts from page text)
  - optional raw JSON-LD preview snippet
- Metadata options from config:
  - `includeMetaTags`
  - `includeJsonLd`
  - `includeReviewSignals`
  - `includeContactSignals`
  - `includeRawJsonLd`

3) Page extractor advanced flow upgrades
- File:
  - `packages/extension/background/page-extraction-engine.mjs`
- Added action-specific options:
  - email:
    - deep scan toggle
    - max depth
    - max links per page
    - same-domain-only
    - custom link selector
    - dedupe/lowercase/validation/mailto/domain filters
  - phone:
    - dedupe/validation
    - custom regex patterns
  - text:
    - metadata include toggle
    - max content char cap
    - richer structured fields (canonical/lang/headings/paragraph count/excerpt)
  - maps:
    - include toggles for basic info, contacts, reviews, hours, location, image counts

4) Sidepanel advanced tool config wiring
- File:
  - `packages/extension/sidepanel/index.html`
  - `packages/extension/sidepanel/index.mjs`
- Added action-specific options panels:
  - `page-email-options-panel`
  - `page-phone-options-panel`
  - `page-text-options-panel`
  - `page-maps-options-panel`
- Added metadata-runner-only options panel:
  - `metadata-options-panel`
- Runner UI behavior:
  - metadata runner reuses URL-source + queue controls
  - action-type selector hidden for metadata runner
  - metadata config builder path added in sidepanel start flow

## Validation

1) Syntax checks
- `node --check` passed for:
  - metadata engine
  - page extraction engine
  - service worker
  - sidepanel module
  - epic6 smoke script

2) Epic 6 smoke
- command:
  - `npm run smoke:extension:epic6`
- verifies:
  - action option normalization/clamping
  - metadata option normalization
  - metadata runner capability delegation

3) Full extension smoke
- command:
  - `npm run smoke:extension`
- includes epic5 and epic6 smokes in addition to storage/runtime baseline.

## Notes
- This slice is baseline-complete for Epic 6 and keeps all extraction compute local in extension runtime.
- Manual in-browser validation of the new action-option panels is still required before release sign-off.
