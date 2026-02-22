# UWS Benchmark Suite Spec (Mode 2)

## Purpose
Define a repeatable benchmark dataset and pass criteria for quality/reliability gates.

## Suite Structure
Use two layers:
1) Live benchmarks (real websites)
2) Snapshot fixtures (archived HTML/DOM for deterministic regression)

## Coverage Matrix
1) List/table extraction
- ecommerce listings
- directory listings
- paginated tables
- infinite scroll feeds

2) Page-details extraction
- product details pages
- article pages
- service pages

3) Contact extraction
- email-heavy pages
- phone-heavy pages
- mixed contact pages

4) Text/metadata extraction
- long-form content pages
- pages with JSON-LD metadata
- pages with noisy nav/ads sections

5) Maps-like extraction
- place listing pages with ratings/reviews/hours signals

6) Image extraction
- pages with mixed image dimensions/types/extensions

7) Operational paths
- CSV input flow
- datasource flow
- exports (csv/xlsx/json/sheets/clipboard)

## Target Size (Minimum)
1) 30 live benchmark targets:
- 6 list
- 6 page-details
- 6 contact
- 4 text/metadata
- 4 maps-like
- 4 image
2) 30 mirrored snapshot fixtures (one per live target where feasible)

## Field Expectations
Per benchmark define:
1) Required fields
2) Optional fields
3) Known edge cases
4) Expected row range
5) Known false-positive traps

## Pass Criteria
1) Extraction quality
- required-field completeness meets threshold
- dedupe rate within expected range
- false-positive rate under threshold for contact fields

2) Reliability
- run success >= target
- transient retry recovery >= target
- deterministic rerun behavior

3) Export integrity
- row counts and schema consistent across formats
- file validity checks pass

4) UX path checks
- first-run quick-start flow works for each extractor
- error recovery actions available for forced-failure tests

## Benchmark Artifact Schema
Each target must include:
1) `target_id`
2) `category`
3) `source_url`
4) `fixture_path` (if snapshot available)
5) `expected_fields`
6) `required_fields`
7) `expected_row_min`
8) `expected_row_max`
9) `notes`

## Execution Cadence
1) PR-level:
- run snapshot subset
2) Daily:
- run full snapshot suite
3) Pre-release:
- run full live + snapshot suite

## Failure Policy
1) Any blocker in required-field completeness fails release gate.
2) Any export schema corruption fails release gate.
3) Flaky targets must be flagged and replaced or stabilized before release.
