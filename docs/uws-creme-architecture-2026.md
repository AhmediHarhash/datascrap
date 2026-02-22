# Ultimate Web Scraper - Creme De La Creme Architecture (2026)

## North Star
Build a Mode 2 platform that is not just a scraper, but a full **lead-intelligence and data-ops engine**:
- discover targets
- extract reliably at scale
- normalize and enrich
- score and prioritize
- deliver directly into outbound workflows

## Operating Constraint (Mode 2 Commercial Lock)
- Local-first, thin-cloud model for cost control and trust:
  - no cloud row storage by us for extracted datasets by default
  - cloud is control-plane + auth/license/usage + optional settings sync
  - user data delivery goes to local exports or user-linked destinations
- Policy reference:
  - `docs/uws-data-residency-policy-mode2.md`

## Product Pillars
1) Precision extraction
- Robust selector extraction (CSS/XPath/attribute/text/image/link)
- Self-healing extraction fallback for layout changes
- Deep scan flows for contact discovery

2) Workflow automation
- Recurring schedules
- Trigger-based runs
- Re-run templates/playbooks
- Queue and retry orchestration

3) Lead intelligence
- Entity normalization (company/contact/location)
- Duplicate collapse across sources
- Business/category tagging
- Priority scoring for outreach

4) Activation
- CSV/XLSX/JSON/clipboard/sheets/export APIs
- Webhook/n8n style downstream automation
- CRM-ready field mapping

5) Trust and control
- Visibility into run quality and failures
- Human review checkpoints
- Compliance-first guardrails

## Reference System Architecture

### A) Client Layer
1) Browser extension (MV3)
- Sidepanel UX and element picker
- On-page interaction runtime
- Fast local preview extraction

2) Web command center
- Run history, pipelines, templates
- Data tables, QA review, analytics
- Scheduling and integration configuration

### B) Control Plane
1) API gateway
- Auth, tenancy, quotas, rate limiting

2) Orchestrator
- DAG/job planner (discover -> extract -> enrich -> deliver)
- Run state machine (queued/running/retrying/succeeded/failed)
- Per-step retry/backoff policies

3) Scheduler
- Interval, cron, and trigger-based runs
- Timezone-aware execution windows

4) Rules engine
- Filters, dedupe policy, suppression rules, quality thresholds

### C) Execution Plane
1) Browser worker pool
- Headless browser workers for bulk extraction
- Site-policy aware concurrency and pacing

2) Extractor strategies
- List extractor
- Page details extractor
- Email extractor (deep scanning)
- Phone/text/image/maps/metadata extractors

3) Recovery and resilience
- Selector fallback chain
- Auto screenshot + DOM snapshot on failure
- Replay package for debugging

### D) Data Plane
1) Operational DB
- jobs, runs, automation configs, schedules, connectors

2) Analytical store
- extracted rows, normalized entities, quality metrics

3) Object storage
- snapshots, exports, artifacts, run logs

4) Search index
- fast filtering across leads and extracted content

## Core Domain Model
1) `Workspace`
2) `PlaybookTemplate`
3) `AutomationRun`
4) `RunStep`
5) `SourceUrlBatch`
6) `ExtractedRow`
7) `EntityCompany`
8) `EntityContact`
9) `Signal` (category, rating, tech stack hints, intent clues)
10) `ExportJob`

## Creme Features (Differentiators)
1) Playbook Studio
- Save full workflows as reusable templates
- Clone by vertical (local services, ecommerce, suppliers, agencies)

2) Intelligent self-healing
- Detect selector drift and auto-repair with similarity ranking
- Human confirmation when confidence is low

3) Lead-fit scoring
- Custom ICP score based on services, geography, size signals, recency
- Route high-score leads to priority outreach queue

4) Contact confidence score
- Score each email/phone/contact method by evidence and context

5) Data quality firewall
- Hard gates before export:
  - required fields present
  - duplicate thresholds
  - malformed contact suppression

6) Human-in-the-loop QA
- Sample review queue before full export blast
- One-click approve/reject and rerun affected segment

7) Integration layer
- Webhooks
- n8n-first flow packs
- CRM mapping presets

## Reliability Targets
1) Run success SLO: >= 98% for configured supported flows
2) Retry recoverability: >= 80% of transient failures auto-recovered
3) Mean time to diagnose failed run: < 10 minutes via run packet
4) Export correctness checks on every run

## Security + Compliance By Design
1) Tenant isolation for data and credentials
2) Encrypted secrets for integration tokens
3) Audit trail on every extraction/export action
4) Compliance controls:
- suppression list support
- do-not-contact tagging
- source URL provenance tracking

## 90-Day Execution Plan (Post-Parity)
1) Weeks 1-3
- Playbook templates
- Scheduler core
- Webhook delivery

2) Weeks 4-6
- Self-healing selector engine
- QA review queue
- Lead-fit scoring v1

3) Weeks 7-9
- n8n packs
- CRM field mapper
- Advanced run analytics

4) Weeks 10-12
- Supplier intelligence preset
- Local-business outreach preset
- Hardening and scale tests

## Go-To-Market Product Pack
1) Local Lead Engine pack
- city + category discovery, contact extraction, outreach-ready export

2) Agency Prospecting pack
- website signal extraction + decision-maker contact paths

3) Supplier Sourcing pack
- item/spec/supplier/contact extraction across target catalogs

## Build Rule
Do not add these premium layers on unstable parity.
First stabilize Mode 2 parity acceptance, then turn on creme features behind feature flags.
