# UWS Mode 2 Implementation Backlog

## Delivery Rules
1) Build in vertical slices that are testable end-to-end.
2) No epic is complete without acceptance tests.
3) Preserve parity first, then premium upgrades behind feature flags.
4) Respect data residency lock:
- no cloud row storage for extracted datasets by default
- local-first tables/exports and user-linked destinations only

## Execution Snapshot (2026-02-24)
1) Epic 0 bootstrap slice implemented:
- package skeleton + contracts + storage migration model landed.
2) Epic 1 bootstrap slice implemented:
- runtime lifecycle + runner registry + permission gate + start/stop/rerun wiring landed.
3) Tracking artifact:
- `docs/phase0-1-extension-runtime-bootstrap-2026-02-23.md`
4) Epic 2 baseline slice implemented:
- picker session flow + sidepanel controls + list extractor `EXTRACT_LIST` + `LOAD_MORE` method loop.
5) Tracking artifact:
- `docs/phase2-picker-list-extractor-2026-02-23.md`
6) Epic 3 baseline slice implemented:
- page/bulk extraction engine + URL source modes + queue controls + datasource integration.
7) Tracking artifact:
- `docs/phase3-page-bulk-extractor-2026-02-23.md`
8) Epic 4 baseline slice implemented:
- data table history/filters/inline edits/column rename/dedupe.
9) Epic 5 baseline slice implemented:
- file export (`csv/xlsx/json`) + clipboard/sheets + image downloader + activation wiring.
10) Tracking artifact:
- `docs/phase5-exports-activation-2026-02-23.md`
11) Epic 6 baseline slice implemented:
- email deep scan options + text/maps advanced options + metadata extractor engine.
12) Tracking artifact:
- `docs/phase6-tool-specific-advanced-flows-2026-02-23.md`
13) Epic 7 baseline slice implemented:
- home hub shell nav + tool cards + roadmap notify + per-tool welcome first-3-visits flow.
14) Tracking artifact:
- `docs/phase7-home-hub-welcome-roadmap-2026-02-23.md`
15) Epic 8-11 wiring slice implemented:
- cloud control API wiring + schedules/integrations/jobs/observability panel controls + template/diagnostics workflows + smoke expansion.
16) Tracking artifact:
- `docs/phase8-11-cloud-templates-diagnostics-qa-2026-02-23.md`
17) Hardening verification completed:
- `npm run smoke:extension` pass
- `npm run test:local:hardening` pass
- `npm run hardening:railway` pass (cloud smoke enabled)
18) Epic 9 execution conversion completed:
- competitor gap-close workstreams prioritized and sequenced.
19) Tracking artifact:
- `docs/phase9-competitor-gap-close-2026-02-23.md`
20) Epic 9 Sprint A slice 1 implemented:
- list auto-detect setup (background + sidepanel apply + smoke coverage).
21) Tracking artifact:
- `docs/phase9-sprintA-autodetect-slice-2026-02-23.md`
22) Epic 9 Sprint A slice 2 implemented:
- template marketplace v1 (import/export + schema lock + source-domain metadata).
23) Tracking artifact:
- `docs/phase9-sprintA-template-marketplace-slice-2026-02-23.md`
24) Epic 9 Sprint B slice 1 implemented:
- integrations pack v1.1 (provider presets + API-backed test connection + cloud smoke coverage).
25) Tracking artifact:
- `docs/phase9-sprintB-integrations-pack-slice-2026-02-23.md`
26) Epic 9 Sprint C slice 1 implemented:
- monitoring alerts v1 (`monitor.page.diff`, persisted monitor states, field-level diff summary, monitor schedule/job presets).
27) Tracking artifact:
- `docs/phase9-sprintC-monitoring-alerts-slice-2026-02-23.md`
28) Epic 9 Sprint C slice 2 implemented:
- scale/recovery v1 (URL generator + retry-failed/resume-checkpoint controls + failure report export + checkpoint summary metadata).
29) Tracking artifact:
- `docs/phase9-sprintC-scale-recovery-slice-2026-02-23.md`
30) Epic 9 Sprint D slice 1 implemented:
- anti-block reliability profiles v1 (profile controls + bounded backoff/jitter + optional sticky session reuse + retry telemetry).
31) Tracking artifact:
- `docs/phase9-sprintD-reliability-profiles-slice-2026-02-23.md`
32) Epic 10 Sprint A slice 1 implemented:
- runtime telemetry + diagnostics depth v1 (event taxonomy + error packets + run artifacts + diagnostics summary enrichment).
33) Tracking artifact:
- `docs/phase10-sprintA-telemetry-diagnostics-slice-2026-02-23.md`
34) Epic 11 Sprint A slice 1 implemented:
- simple-mode first-run flow (intent command + quick extract + point-and-follow fallback + access preflight)
- maps quick-flow defaults tuned for exhaustive runs (`untilNoMore` + scroll stability controls)
- extension e2e harness added (`simple` + `maps`) and optional hardening integration via env flags
35) Tracking artifact:
- `docs/phase11-sprintA-simple-mode-e2e-slice-2026-02-24.md`
36) Epic 11 Sprint A slice 2 implemented:
- cross-platform hardening wrappers for extension e2e gates (`local`, `railway`, optional `maps`)
- full release gate variants with extension e2e coverage (`release:full:e2e`, `release:full:e2e:maps`)
- CI workflow gate wired (`.github/workflows/extension-hardening.yml`)
37) Tracking artifact:
- `docs/phase11-sprintA-e2e-gate-command-slice-2026-02-24.md`
38) Epic 11 Sprint A slice 3 implemented:
- branch protection automation script + playbook for required merge check enforcement
- required check lock: `Extension Hardening / local-hardening-e2e`
- mainline policy workflows added for defense-in-depth enforcement
39) Tracking artifact:
- `docs/phase11-sprintA-branch-protection-gate-slice-2026-02-24.md`
40) Epic 11 Sprint B slice 1 implemented:
- autonomous orchestration core module (goal parsing + strategy planning + discovery URL resolver)
- sidepanel intent flow upgraded to plan-first execution with phase/progress handoff
- quick-extract strategy routing across page/maps/list + guided fallback
- smoke expansion for orchestration wiring (`smoke:extension:epic16`)
41) Tracking artifact:
- `docs/phase11-sprintB-autonomous-orchestrator-slice-2026-02-24.md`
42) Epic 11 Sprint B slice 2 implemented:
- quickflow autonomous progress ring added to simple-mode command strip
- ring percent + phase text now bound to orchestration/runtime progress state
- visual state classes for running/error/completed with pulse effect
- smoke expansion for loader wiring (`smoke:extension:epic17`)
43) Tracking artifact:
- `docs/phase11-sprintB-quickflow-progress-ring-slice-2026-02-24.md`
44) Epic 11 Sprint B slice 3 implemented:
- fallback orchestration for page/maps strategy failures
- automatic downgrade path: list autodetect -> Point & Follow guidance
- point-follow readiness now returns explicit success/failure and status normalization
- smoke expansion for failover wiring (`smoke:extension:epic18`)
45) Tracking artifact:
- `docs/phase11-sprintB-fallback-orchestration-slice-2026-02-24.md`
46) Epic 11 Sprint B slice 4 implemented:
- intent golden scenarios added for conversational command routing
- fresh-query behavior regression checks added (`latest` -> recency-biased search)
- strategy assertions added for maps/page/list/access/export/point-follow command classes
- smoke expansion for orchestrator semantics (`smoke:extension:epic19`)
47) Tracking artifact:
- `docs/phase11-sprintB-intent-goldens-slice-2026-02-24.md`
48) Epic 11 Sprint B slice 5 implemented:
- Playwright extension e2e added for autonomous fallback transitions (`maps` strategy -> fallback path)
- hardening wrapper flags expanded with `--fallback` / `RUN_EXTENSION_E2E_FALLBACK`
- local/railway/release one-command fallback e2e variants added
- readiness/release playbooks updated with fallback gate commands
49) Tracking artifact:
- `docs/phase11-sprintB-e2e-fallback-gate-slice-2026-02-24.md`
50) Epic 11 Sprint B slice 6 implemented:
- extension hardening workflow dispatch extended with fallback toggle (`run_fallback`)
- CI can now run fallback-transition e2e on demand alongside maps toggle
- smoke guard added for workflow + package fallback dispatch contract (`smoke:extension:epic20`)
- docs updated to reflect `run_fallback` dispatch path
51) Tracking artifact:
- `docs/phase11-sprintB-ci-fallback-dispatch-slice-2026-02-24.md`
52) Epic 11 Sprint B slice 7 implemented:
- extension hardening workflow dispatch now supports custom fallback command text (`fallback_command`)
- e2e artifact uploads split by variant (`simple`, `maps`, `fallback`) for cleaner CI triage
- simple e2e now emits dedicated artifact files in `dist/e2e`
- smoke guard added for workflow artifact split + command-input contract (`smoke:extension:epic21`)
53) Tracking artifact:
- `docs/phase11-sprintB-ci-artifact-split-fallback-command-slice-2026-02-24.md`
54) Epic 11 Sprint B slice 8 implemented:
- per-domain autonomy memory added in sidepanel intent flow (`domainAutonomyHints`)
- strategy memory persists with TTL and normalizes to host-level hints
- list-intent plans now auto-upgrade to Point & Follow when prior domain guidance indicates it
- fallback/quickflow outcomes now record strategy hints (`list_autodetect` success vs guidance-required)
- smoke guard added for domain-memory wiring (`smoke:extension:epic22`)
55) Tracking artifact:
- `docs/phase11-sprintB-domain-autonomy-memory-slice-2026-02-24.md`
56) Epic 11 Sprint B slice 9 implemented:
- conversational intent parsing now extracts numeric result targets (e.g., `120 results`, `top 50`)
- list autopilot dynamically tunes load-more attempts/threshold for target/exhaustive commands
- list extraction engine now honors row cap (`maxRows`) and exits once target is reached
- maps autopilot now applies intent target to `maxResults` when numeric target is present
- smoke coverage expanded for result-target parsing + row-cap wiring (`smoke:extension:epic23`)
57) Tracking artifact:
- `docs/phase11-sprintB-intent-result-target-slice-2026-02-24.md`
58) Epic 11 Sprint B slice 10 implemented:
- list autopilot exhaustive mode now explicitly supports `untilNoMore` continuation semantics
- quick-flow exhaustive commands propagate `untilNoMore` + `maxRoundsSafety` into list start config
- list extraction runtime now respects `untilNoMore` with bounded safety cap instead of fixed attempt ceiling
- completion still ends on no-change threshold / terminal load-more conditions / row target cap
- smoke guard added for exhaustive continuation wiring (`smoke:extension:epic24`)
59) Tracking artifact:
- `docs/phase11-sprintB-list-until-no-more-slice-2026-02-24.md`
60) Epic 11 Sprint B slice 11 implemented:
- guided fallback now carries intent-derived list overrides into Point & Follow starts
- when fallback triggers, row target / exhaustive continuation flags are preserved (`maxRows`, `untilNoMore`, safety cap)
- Point & Follow picker completion now starts extraction with inherited overrides, not default UI-only values
- guided flow state cleanup added on success/cancel/error to avoid stale override leakage
- smoke guard added for guided override propagation contract (`smoke:extension:epic25`)
61) Tracking artifact:
- `docs/phase11-sprintB-guided-fallback-override-carry-slice-2026-02-24.md`
62) Epic 11 Sprint B slice 12 implemented:
- Playwright e2e added for targeted-result cap quick-flow (`extract 12 results ...`) using local deterministic fixture page
- targeted e2e asserts terminal completion + row cap enforcement + list strategy routing evidence
- hardening wrappers expanded with `--targeted` / `RUN_EXTENSION_E2E_TARGETED`
- local/railway/release targeted e2e command variants added
- CI workflow dispatch extended with `run_targeted` + dedicated targeted artifact upload
- smoke guard added for targeted e2e command/workflow contract (`smoke:extension:epic26`)
63) Tracking artifact:
- `docs/phase11-sprintB-targeted-result-e2e-gate-slice-2026-02-24.md`
64) Epic 11 Sprint B slice 13 implemented:
- targeted e2e cap now configurable in wrappers and CI dispatch (`--target-results`, `targeted_results`)
- targeted hardening path propagates `E2E_TARGET_RESULTS` end-to-end for deterministic cap assertions
- workflow targeted step now injects `E2E_TARGET_RESULTS` from manual dispatch input
- smoke guard added for targeted-results configurability contract (`smoke:extension:epic27`)
- playbooks/readiness updated with custom-cap command examples
65) Tracking artifact:
- `docs/phase11-sprintB-targeted-result-config-dispatch-slice-2026-02-24.md`
66) Epic 11 Sprint B slice 14 implemented:
- targeted cap validation hardened to fail fast across wrapper/env/workflow paths
- CI workflow now validates `targeted_results` before launching targeted Playwright runs
- targeted e2e now enforces exact target-hit contract and emits dedicated metadata artifact
- local hardening summary now reports effective targeted cap when targeted variant runs
- smoke guard added for strict-cap and metadata contract (`smoke:extension:epic28`)
67) Tracking artifact:
- `docs/phase11-sprintB-targeted-cap-validation-metadata-slice-2026-02-24.md`
68) Epic 11 Sprint B slice 15 implemented:
- queue monitor workflow cadence reduced to hourly to cut alert/noise volume
- queue monitor dead-letter default tolerance raised from `0` to `3` for transient failure buffering
- control-api queue monitor docs updated to match new default threshold
- smoke guard added for queue monitor cadence/threshold contract (`smoke:extension:epic29`)
69) Tracking artifact:
- `docs/phase11-sprintB-queue-monitor-noise-reduction-slice-2026-02-25.md`
70) Epic 11 Sprint B slice 16 implemented:
- extension hardening targeted artifact uploads now include requested cap in artifact name
- CI targeted run artifacts are easier to triage across multiple manual dispatch runs
- smoke guard added for cap-tagged artifact contract (`smoke:extension:epic30`)
71) Tracking artifact:
- `docs/phase11-sprintB-targeted-artifact-cap-tag-slice-2026-02-25.md`
72) Epic 11 Sprint B slice 17 implemented:
- queue schedule hygiene script added for operational noise control (list/pause active schedules)
- dry-run-first pause flow added with explicit apply step
- package command shortcuts added for list/pause-dry-run/pause-apply
- release/local hardening docs updated with queue hygiene runbook
- smoke guard added for queue hygiene command/script contract (`smoke:extension:epic31`)
73) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-script-slice-2026-02-25.md`
74) Epic 11 Sprint B slice 18 implemented:
- queue hygiene script now supports auto-login fallback when bearer token is absent
- optional register-if-missing path added for first-time operator accounts
- docs updated with tokenless operator flow (`email/password`)
- smoke guard contract extended for auto-login path tokens (`smoke:extension:epic31`)
75) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-auto-login-slice-2026-02-25.md`
76) Epic 11 Sprint B slice 19 implemented:
- queue hygiene monitor-only command presets added to target `monitor.page.diff` schedules quickly
- release/local hardening docs updated with monitor-only list/pause command variants
- smoke guard added for monitor-only queue hygiene command contract (`smoke:extension:epic32`)
77) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-monitor-presets-slice-2026-02-25.md`
78) Epic 11 Sprint B slice 20 implemented:
- queue hygiene interval-frequency filters added (`--interval-lte`) for quick detection of 30/60 minute schedule churn
- frequent-schedule list/pause presets added (dry-run + apply)
- release/local hardening docs updated with frequent schedule queue hygiene commands
- smoke guard added for frequent schedule preset/filter contract (`smoke:extension:epic33`)
79) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-frequent-interval-slice-2026-02-25.md`
80) Epic 11 Sprint B slice 21 implemented:
- queue hygiene duplicate-signature detection added (`job type + cadence + max attempts + normalized payload`)
- duplicate-only mode supports dry-run/apply pause while preserving one schedule per duplicate group
- keep strategy added (`--dedupe-keep=oldest|newest`) to control which duplicate remains active
- duplicate queue hygiene command presets added for list/pause-dry-run/pause-apply
- release/local hardening docs updated with duplicate schedule cleanup flow
- smoke guard added for duplicate schedule hygiene contract (`smoke:extension:epic34`)
81) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-duplicate-signature-slice-2026-02-25.md`
82) Epic 11 Sprint B slice 22 implemented:
- queue hygiene signature mode added (`strict|target`) to detect near-duplicates by target URL signature
- near-duplicate grouping now handles payload variants with same target/cadence (reduces false misses)
- near-duplicate list/pause command presets added (dry-run + apply)
- release/local/control-api docs updated with signature-mode guidance and env defaults
- smoke guard added for near-duplicate signature-mode contract (`smoke:extension:epic35`)
83) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-near-duplicate-signature-mode-slice-2026-02-25.md`
84) Epic 11 Sprint B slice 23 implemented:
- queue hygiene apply guardrail added (`max pause`) to prevent accidental large pause blasts
- default cap enabled (`25`) with explicit force override flag for intentional bulk operations
- force-apply command presets added for general/duplicate/near-duplicate pause flows
- control-api/local/release docs updated with guardrail + override runbook
- smoke guard added for pause guardrail contract (`smoke:extension:epic36`)
85) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-pause-guardrail-slice-2026-02-25.md`
86) Epic 11 Sprint B slice 24 implemented:
- queue hygiene pause batching added (chunked apply with optional inter-batch delay)
- batched execution controls added (`--pause-batch-size`, `--pause-batch-delay-ms`)
- optional fail-fast pause mode added (`--continue-on-pause-error=false`)
- batched force-apply command presets added for general/duplicate/near-duplicate flows
- control-api/local/release docs updated with batch safety runbook
- smoke guard added for pause batching contract (`smoke:extension:epic37`)
87) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-pause-batching-slice-2026-02-25.md`
88) Epic 11 Sprint B slice 25 implemented:
- queue hygiene report output added (`--output-file`, `--output-compact`) for ops/audit artifacts
- report presets added for near-duplicate list and batched apply workflows
- output file path now recorded in summary payload (`outputFile`)
- control-api/local/release docs updated with report-output runbook
- smoke guard added for report output contract (`smoke:extension:epic38`)
89) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-report-output-slice-2026-02-25.md`
90) Epic 11 Sprint B slice 26 implemented:
- queue hygiene report artifact hardening added (`--output-timestamp`, `--output-overwrite`)
- dated report presets added for near-duplicate list and batched apply operations
- summary metadata expanded with `runId`, `durationMs`, and generated timestamps
- guardrail-blocked pause runs can still produce report output artifacts
- control-api/local/release docs updated with immutable report artifact runbook
- smoke guard added for dated-report + overwrite contract (`smoke:extension:epic39`)
91) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-report-artifact-hardening-slice-2026-02-25.md`
92) Epic 11 Sprint B slice 27 implemented:
- queue hygiene signature redaction mode added for safer report sharing (`--redact-signatures`)
- redacted report presets added for near-duplicate list and batched apply workflows
- duplicate/schedule signatures can now be hashed in summaries (`sha256:<prefix>`)
- control-api/local/release docs updated with report redaction runbook
- smoke guard added for report signature-redaction contract (`smoke:extension:epic40`)
93) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-report-signature-redaction-slice-2026-02-25.md`
94) Epic 11 Sprint B slice 28 implemented:
- queue hygiene minimum-age safety filter added (`--min-age-minutes`) to avoid pausing newly-created schedules
- stale near-duplicate presets added for list/dry-run/batched-redacted apply flows
- age filter default added via env (`CONTROL_API_SCHEDULE_HYGIENE_MIN_AGE_MINUTES`)
- control-api/local/release docs updated with stale-schedule cleanup runbook
- smoke guard added for min-age safety contract (`smoke:extension:epic41`)
95) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-min-age-safety-slice-2026-02-25.md`
96) Epic 11 Sprint B slice 29 implemented:
- queue hygiene transient pause retry engine added (`--pause-retry-count`, `--pause-retry-delay-ms`)
- per-schedule pause now retries network/5xx/429-class failures before final failure
- resilient stale near-duplicate preset added for batched redacted cleanup operations
- control-api/local/release docs updated with retry runbook and defaults
- smoke guard added for pause-retry resilience contract (`smoke:extension:epic42`)
97) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-pause-retry-resilience-slice-2026-02-25.md`
98) Epic 11 Sprint B slice 30 implemented:
- queue schedule list endpoint now supports cursor pagination (`cursorCreatedAt`, `cursorId`)
- queue hygiene script now supports scan-all pagination (`--scan-all`, `--scan-max-pages`) to process beyond first 100 schedules
- stale near-duplicate scan-all list/pause presets added for full-queue cleanup
- control-api/local/release docs updated with scan-all runbook and defaults
- smoke guard added for scan-all pagination contract (`smoke:extension:epic43`)
99) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-scan-all-pagination-slice-2026-02-25.md`
100) Epic 11 Sprint B slice 31 implemented:
- queue hygiene scan resume/checkpoint mode added (`--scan-resume-file`, `--scan-start-cursor-created-at`, `--scan-start-cursor-id`)
- scan-all runs can now continue from prior report `paging.nextCursor` without restarting from first page
- checkpoint + resume command presets added for stale near-duplicate full-queue cleanup
- control-api/local/release docs updated with scan resume runbook and env defaults
- smoke guard added for scan resume/checkpoint contract (`smoke:extension:epic44`)
101) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-scan-resume-checkpoint-slice-2026-02-25.md`
102) Epic 11 Sprint B slice 32 implemented:
- queue hygiene scan-page retry engine added (`--list-retry-count`, `--list-retry-delay-ms`)
- scan-all list path now retries network/5xx/429-class failures before aborting page fetch
- paging summary now includes list retry telemetry (`paging.retry`)
- resilient checkpoint/resume presets now include list retry controls for long scans
- control-api/local/release docs updated with list retry runbook and defaults
- smoke guard added for list retry resilience contract (`smoke:extension:epic45`)
103) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-scan-list-retry-resilience-slice-2026-02-25.md`
104) Epic 11 Sprint B slice 33 implemented:
- queue hygiene uncapped scan mode added via `--scan-max-pages=0` (continue until exhausted)
- hard safety cap added (`--scan-hard-max-pages`) to prevent runaway loops in uncapped mode
- paging summary expanded with operator/hard-cap telemetry (`operatorCapEnabled`, `effectiveMaxPages`, `truncatedByHardMaxPages`)
- uncapped stale near-duplicate scan preset added for full coverage list sweeps
- control-api/local/release docs updated with uncapped scan runbook and safety defaults
- smoke guard added for uncapped scan contract (`smoke:extension:epic46`)
105) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-scan-uncapped-hard-cap-slice-2026-02-25.md`
106) Epic 11 Sprint B slice 34 implemented:
- queue hygiene scan auto-continue mode added (`--scan-auto-continue`) to chain capped scan segments automatically
- auto-continue segment ceiling added (`--scan-auto-continue-max-segments`) to keep bounded safety behavior
- paging summary expanded with continuation telemetry (`segmentsUsed`, `continuations`, `autoContinueLimitReached`)
- stale near-duplicate auto-continue preset added for hands-off long scans
- control-api/local/release docs updated with auto-continue runbook and defaults
- smoke guard added for auto-continue contract (`smoke:extension:epic47`)
107) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-scan-auto-continue-segments-slice-2026-02-25.md`
108) Epic 11 Sprint B slice 35 implemented:
- queue hygiene lightweight scan checkpoint sidecar added (`--scan-checkpoint-file`, `--scan-checkpoint-every-pages`)
- scan progress now persists resumable cursor checkpoints during scan runs (without full schedule payload output)
- checkpoint+resume presets now use dedicated cursor sidecar for lower overhead recovery flows
- control-api/local/release docs updated with scan checkpoint sidecar runbook and env defaults
- smoke guard added for scan checkpoint sidecar contract (`smoke:extension:epic48`)
109) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-scan-checkpoint-sidecar-slice-2026-02-25.md`
110) Epic 11 Sprint B slice 36 implemented:
- queue hygiene scan resume now supports exhausted checkpoint tolerance (`--scan-resume-allow-exhausted`)
- resume flow returns non-fatal `resume_file_exhausted` source when prior scan is complete and cursor is empty
- strict resume preset added for operators who require cursor presence on every resume run
- paging/filters/checkpoint metadata expanded with resume tolerance telemetry (`resumeAllowExhausted`, `resumeExhausted`)
- control-api/local/release docs updated with resume tolerance runbook and env defaults
- smoke guard added for resume exhausted-tolerance contract (`smoke:extension:epic49`)
111) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-scan-resume-exhausted-tolerance-slice-2026-02-26.md`
112) Epic 11 Sprint B slice 37 implemented:
- queue hygiene exhausted-resume behavior control added (`--scan-resume-exhausted-behavior=noop|restart`)
- resume flows can now no-op safely when checkpoint is already exhausted (default `noop`)
- explicit restart preset added for operators who intentionally want full re-scan after exhausted checkpoint
- paging/checkpoint metadata expanded with exhausted-mode telemetry (`resumeExhaustedBehavior`, `resumeExhaustedNoop`)
- control-api/local/release docs updated with exhausted-behavior runbook and env defaults
- smoke guard added for exhausted-resume behavior contract (`smoke:extension:epic50`)
113) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-scan-resume-exhausted-behavior-slice-2026-02-26.md`
114) Epic 11 Sprint B slice 38 implemented:
- queue hygiene auto-resume-from-checkpoint mode added (`--scan-resume-from-checkpoint`)
- when explicit resume file is omitted, scan resume can now automatically use checkpoint sidecar path
- checkpoint auto-resume source telemetry added (`checkpoint_file_auto`, `checkpoint_file_auto_exhausted`, `checkpoint_file_missing`)
- stale near-duplicate autorecover preset added for hands-off pause sweeps with checkpoint sidecar orchestration
- control-api/local/release docs updated with auto-resume checkpoint runbook and env defaults
- smoke guard added for auto-resume checkpoint contract (`smoke:extension:epic51`)
115) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-scan-resume-from-checkpoint-auto-slice-2026-02-26.md`
116) Epic 11 Sprint B slice 39 implemented:
- queue hygiene resume freshness guard added (`--scan-resume-max-age-minutes`, `--scan-resume-stale-behavior`)
- stale resume files can now restart scan safely or fail fast (`restart|error`) based on operator policy
- stale source telemetry added (`checkpoint_file_auto_stale`, `resume_file_stale`) with age/reason metadata
- stale near-duplicate autorecover fresh preset added for bounded checkpoint age orchestration
- control-api/local/release docs updated with resume freshness runbook and env defaults
- smoke guard added for resume freshness contract (`smoke:extension:epic52`)
117) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-scan-resume-freshness-guard-slice-2026-02-26.md`
118) Epic 11 Sprint B slice 40 implemented:
- queue hygiene checkpoint/report artifact writes now use atomic temp-file rename to reduce partial JSON corruption risk
- checkpoint sidecar + summary output paths share the same atomic write helper for consistent durability semantics
- release/local/control-api docs updated with atomic artifact-write behavior notes for ops expectations
- smoke guard added for atomic artifact write contract (`smoke:extension:epic53`)
119) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-atomic-artifact-write-slice-2026-02-26.md`
120) Epic 11 Sprint B slice 41 implemented:
- queue hygiene resume source validation added for API-base mismatch safety (`--scan-resume-validate-api-base`, `--scan-resume-api-base-mismatch-behavior`)
- resume sources now expose mismatch telemetry and can fail fast (`error`) or restart scan (`restart`) on source mismatch
- autorecover presets now pin API-base validation defaults for safer production operations
- paging/checkpoint/summary metadata expanded with resume source validation fields (`resumeApiBaseUrl`, `resumeApiBaseMismatch`, behavior)
- control-api/local/release docs updated with source-validation runbook and env defaults
- smoke guard added for resume source-validation contract (`smoke:extension:epic54`)
121) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-resume-source-validation-slice-2026-02-26.md`
122) Epic 11 Sprint B slice 42 implemented:
- queue hygiene resume filter validation added to prevent cursor reuse across intent/filter changes (`--scan-resume-validate-filters`, `--scan-resume-filter-mismatch-behavior`)
- resume flows now compare artifact filter snapshot against active run filters and expose mismatch telemetry
- filter mismatch handling supports strict fail-fast (`error`) or safe restart (`restart`) without stale cursor carryover
- autorecover presets now pin resume filter validation defaults for safer no-config operations
- paging/checkpoint/summary metadata expanded with resume filter validation fields (`resumeFilterMismatch`, behavior, mismatched fields)
- control-api/local/release docs updated with resume filter-validation runbook and env defaults
- smoke guard added for resume filter-validation contract (`smoke:extension:epic55`)
123) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-resume-filter-validation-slice-2026-02-26.md`
124) Epic 11 Sprint B slice 43 implemented:
- queue hygiene resume artifact-kind validation added to prevent accidental resume from non-checkpoint payloads (`--scan-resume-validate-kind`, `--scan-resume-kind-mismatch-behavior`)
- resume flows now require expected checkpoint kind (`queue_hygiene_scan_checkpoint`) when kind validation is enabled
- kind mismatch handling supports strict fail-fast (`error`) or safe restart (`restart`) before scan execution
- autorecover presets now pin resume kind-validation defaults for safer production resume behavior
- paging/checkpoint/summary metadata expanded with resume kind fields (`resumeKind`, `resumeKindMismatch`, behavior)
- control-api/local/release docs updated with resume kind-validation runbook and env defaults
- smoke guard added for resume kind-validation contract (`smoke:extension:epic56`)
125) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-resume-kind-validation-slice-2026-02-26.md`
126) Epic 11 Sprint B slice 44 implemented:
- queue hygiene resume schema-version validation added to prevent unsafe resume from incompatible artifact revisions (`--scan-resume-validate-schema-version`, `--scan-resume-schema-version-mismatch-behavior`)
- checkpoint sidecar payloads now include `schemaVersion` metadata (`1`) for explicit compatibility checks
- schema-version mismatch handling supports fail-fast (`error`) or safe restart (`restart`) prior to scan execution
- autorecover presets now pin schema-version validation defaults for safer long-running resume workflows
- paging/checkpoint/summary metadata expanded with resume schema fields (`resumeSchemaVersion`, expected version, mismatch behavior)
- control-api/local/release docs updated with resume schema-version runbook and env defaults
- smoke guard added for resume schema-version contract (`smoke:extension:epic57`)
127) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-resume-schema-version-validation-slice-2026-02-26.md`
128) Epic 11 Sprint B slice 45 implemented:
- queue hygiene resume future-timestamp guard added to prevent unsafe continuation from clock-skewed artifacts (`--scan-resume-max-future-minutes`, `--scan-resume-future-behavior`)
- resume flow now detects future `generatedAt` skew and can fail fast (`error`) or safely restart (`restart`)
- autorecover presets now pin future-skew guard defaults for resilient long-running operations
- paging/checkpoint/summary metadata expanded with future-skew fields (`resumeFuture`, `resumeFutureMinutes`, behavior)
- control-api/local/release docs updated with resume future-skew runbook and env defaults
- smoke guard added for resume future-skew contract (`smoke:extension:epic58`)
129) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-resume-future-timestamp-guard-slice-2026-02-26.md`
130) Epic 11 Sprint B slice 46 implemented:
- queue hygiene resume timestamp source policy added to harden freshness/future guards when payload timestamps are missing or unreliable (`--scan-resume-generated-at-source`)
- resume flow can now use checkpoint payload timestamp (`payload`), filesystem mtime (`file-mtime`), or fallback mode (`payload-or-file-mtime`)
- paging/checkpoint/summary metadata expanded with source telemetry (`resumeGeneratedAtSourcePolicy`, `resumeGeneratedAtSource`)
- autorecover presets now pin resume timestamp-source policy for deterministic operations
- control-api/local/release docs updated with resume timestamp-source runbook and env defaults
- smoke guard added for resume timestamp-source contract (`smoke:extension:epic59`)
131) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-resume-generated-at-source-slice-2026-02-26.md`
132) Epic 11 Sprint B slice 47 implemented:
- queue hygiene resume artifact-size guard added to prevent loading oversized checkpoint files (`--scan-resume-max-bytes`, `--scan-resume-size-behavior`)
- resume flow now checks file size before parsing and can fail fast (`error`) or safely restart (`restart`) on oversized artifacts
- paging/checkpoint/summary metadata expanded with resume size fields (`resumeMaxBytes`, `resumeOversized`, `resumeSizeBytes`, behavior)
- autorecover presets now pin resume size-guard defaults for safer unattended operations
- control-api/local/release docs updated with resume size-guard runbook and env defaults
- smoke guard added for resume size-guard contract (`smoke:extension:epic60`)
133) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-resume-size-guard-slice-2026-02-26.md`
134) Epic 11 Sprint B slice 48 implemented:
- queue hygiene resume hash-integrity guard added for deterministic checkpoint trust (`--scan-resume-sha256`, `--scan-resume-hash-behavior`)
- resume flow now computes checkpoint SHA-256 prior to parse and can fail fast (`error`) or safely restart (`restart`) on hash mismatch
- paging/checkpoint/summary metadata expanded with resume hash fields (`resumeHashExpected`, `resumeHashActual`, mismatch, behavior)
- autorecover presets now pin hash-mismatch handling defaults for unattended recovery stability
- control-api/local/release docs updated with resume hash-integrity runbook and env defaults
- smoke guard added for resume hash-integrity contract (`smoke:extension:epic61`)
135) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-resume-hash-integrity-slice-2026-02-26.md`
136) Epic 11 Sprint B slice 49 implemented:
- queue hygiene resume API-base presence guard added to prevent source-blind resume from artifacts missing `apiBaseUrl` (`--scan-resume-require-api-base`, `--scan-resume-api-base-missing-behavior`)
- resume flow now distinguishes API-base missing vs mismatch and can fail fast (`error`) or safely restart (`restart`) on missing source metadata
- paging/checkpoint/summary metadata expanded with source-presence fields (`resumeApiBaseRequired`, `resumeApiBaseMissing`, behavior)
- autorecover presets now pin API-base presence guard defaults for safer unattended resume
- control-api/local/release docs updated with API-base presence runbook and env defaults
- smoke guard added for API-base presence guard contract (`smoke:extension:epic62`)
137) Tracking artifact:
- `docs/phase11-sprintB-queue-hygiene-resume-api-base-presence-slice-2026-02-26.md`
138) Epic 11 Sprint B slice 50 implemented:
- autonomous list quick-flow now defaults to smart exhaustive continuation when no explicit row target is provided
- users no longer need to type explicit "until no more" phrasing to get full-run behavior in one-command mode
- list smart-default mode now uses stronger bounded safety (`maxRoundsSafety=240`) while still stopping on no-change conditions
- maps quick-flow smart-default path now runs with extended scroll budget (`maxScrollSteps=500`) and explicit `untilNoMore=true`
- conversational result target ceiling raised to `50000` across orchestrator + sidepanel + maps option normalization
- simple-mode command placeholder/hints updated to natural lead-gen phrasing
- smoke guard added for smart-default exhaustive + high-target contracts (`smoke:extension:epic63`)
139) Tracking artifact:
- `docs/phase11-sprintB-smart-default-exhaustive-autonomy-slice-2026-02-26.md`
140) Epic 11 Sprint B slice 51 implemented:
- quick-flow list autopilot now applies smart pagination auto-continue defaults in exhaustive runs when load-more method is unset
- smart pagination fallback promotes `loadMore.method=navigate` and injects resilient next-page selector bundles for search-result style pages
- auto-continue telemetry now emits pagination enablement details (`quick_extract_pagination_autocontinue_enabled`) plus start metadata fields (`paginationAutoContinueEnabled`, selector)
- exhaustive intent parsing expanded for natural phrasing (`whole website`, `entire website`, `all pages`)
- smoke guard added for smart pagination auto-continue + exhaustive intent phrases (`smoke:extension:epic64`)
141) Tracking artifact:
- `docs/phase11-sprintB-smart-pagination-autocontinue-slice-2026-02-26.md`
142) Epic 11 Sprint B slice 52 implemented:
- maps quick-flow now supports two-stage autonomous enrichment:
  - stage 1: collect map place URLs from search/feed extraction
  - stage 2: auto-run detail enrichment on discovered place URLs for phone/website/hours and other map detail fields
- enrichment launch is automatic in simple mode, and export is deferred until enrichment completes
- telemetry/events added for enrichment lifecycle (`quick_extract_maps_enrichment_starting`, `started`, `completed`)
- quick-extract start metadata now exposes enrichment intent (`autoMapDetailsEnrichPlanned`)
- smoke guard added for maps two-stage enrichment orchestration (`smoke:extension:epic65`)
143) Tracking artifact:
- `docs/phase11-sprintB-maps-two-stage-auto-enrichment-slice-2026-02-26.md`
144) Epic 11 Sprint B slice 53 implemented:
- list quick-flow now supports stage-2 URL enrichment after initial row extraction
- enrichment URLs are auto-derived from extracted table rows (`rowData` + source URL) with dedupe and search-engine host filtering
- stage-2 enrichment runs metadata extractor automatically in simple mode with contact signals enabled
- export sequencing now defers until list-stage enrichment completes when planned
- telemetry/events added for list URL enrichment lifecycle (`quick_extract_url_enrichment_starting`, `started`, `completed`)
- quick-extract metadata now includes list enrichment intent (`autoUrlEnrichmentPlanned`)
- smoke guard added for list two-stage URL enrichment contract (`smoke:extension:epic66`)
145) Tracking artifact:
- `docs/phase11-sprintB-list-two-stage-url-enrichment-slice-2026-02-26.md`
146) Epic 11 Sprint B slice 54 implemented:
- list extraction engine now supports segmented auto-continue for exhaustive runs in a single automation run (no manual restart required)
- when per-segment safety rounds are reached, runtime can auto-extend pagination windows (`autoContinueSegments`) up to configured segment and hard-round caps
- completion metadata now reports terminal reason (`terminationReason`) and segmented continuation diagnostics (`autoContinueSegmentsUsed`, caps) for transparent run outcomes
- quick-flow list autopilot now injects segmented continuation defaults (`autoContinueSegments=true`, `autoContinueMaxSegments=24`, `hardRoundCap=5000`)
- simple-mode status now reports safety-cap terminal states clearly for rerun decisions
- smoke guard added for segmented auto-continue pagination contract (`smoke:extension:epic67`)
147) Tracking artifact:
- `docs/phase11-sprintB-list-segmented-autocontinue-slice-2026-02-27.md`
148) Epic 11 Sprint B slice 55 implemented:
- list exhaustive autopilot now applies deeper safety ceilings for explicit full-site intent (`autoContinueMaxSegments=40`, `hardRoundCap=10000`)
- list runtime navigation now guards against repeated next-page URL loops via normalized URL signatures
- terminal summaries now include navigation coverage metadata (`visitedNavigationUrlCount`) for run diagnostics
- simple-mode terminal messaging now explicitly reports pagination-loop stop condition
- smoke guard added for deep exhaustive defaults + pagination loop guard contract (`smoke:extension:epic68`)
149) Tracking artifact:
- `docs/phase11-sprintB-list-deep-exhaustive-loop-guard-slice-2026-02-27.md`
150) Epic 11 Sprint B slice 56 implemented:
- list runtime now supports hard-cap auto-resume chaining within the same automation run (no manual rerun needed)
- when `hardRoundCap` is reached in exhaustive runs, engine can extend the hard boundary in bounded chains up to an absolute ceiling
- new list load-more controls added: `hardCapAutoContinue`, `hardCapAutoContinueMaxChains`, `hardRoundAbsoluteLimit`
- quick-flow defaults now enable hard-cap auto-resume with bounded chain counts and absolute limits for autonomous operation
- runtime progress/summary now expose hard-cap chain telemetry (`hardCapAutoContinueUsed`, `effectiveHardRoundCap`, absolute limit)
- smoke guard added for hard-cap auto-resume chain contract (`smoke:extension:epic69`)
151) Tracking artifact:
- `docs/phase11-sprintB-list-hardcap-chain-autocontinue-slice-2026-02-27.md`
152) Epic 11 Sprint B slice 57 implemented:
- added deterministic long-pagination e2e gate (`e2e:extension:long-pagination`) using a local fixture with >220 pagination rounds
- long-run e2e now validates:
  - extraction exceeds legacy 120-row ceiling
  - full fixture completion in one run
  - segmented auto-continue evidence (`autoContinueSegmentsUsed > 0`)
  - hard-cap auto-resume configuration visibility in runtime event payload
- hardening wrappers now support this variant:
  - `--long-pagination` in `scripts/run-hardening-with-flags.mjs`
  - `RUN_EXTENSION_E2E_LONG_PAGINATION=true` in `scripts/local-hardening-pass.mjs`
- smoke guard added for long-pagination e2e/hardening command contract (`smoke:extension:epic70`)
153) Tracking artifact:
- `docs/phase11-sprintB-e2e-long-pagination-autocontinue-slice-2026-02-27.md`
154) Epic 11 Sprint B slice 58 implemented:
- extension hardening workflow dispatch now supports long-pagination e2e variant (`run_long_pagination`)
- new dispatch inputs added for deterministic fixture controls:
  - `long_total_rows` (`300..5000`)
  - `long_batch_size` (`1..24`)
- CI now validates long-pagination inputs before execution (`scripts/validate-long-pagination-input.mjs`)
- conditional long-pagination hardening step added:
  - `npm run test:local:hardening:e2e:long-pagination`
- dedicated CI artifact upload added for long-pagination runs:
  - `extension-e2e-artifacts-long-pagination-<rows>r-<batch>b`
  - `dist/e2e/e2e-long-pagination-*`
- smoke guard added for long-pagination CI dispatch + artifact contract (`smoke:extension:epic71`)
155) Tracking artifact:
- `docs/phase11-sprintB-ci-long-pagination-dispatch-slice-2026-02-27.md`
156) Epic 11 Sprint B slice 59 implemented:
- release/local/readiness playbooks now document long-pagination hardening/release commands
- CI dispatch runbook expanded with long-pagination knobs:
  - `run_long_pagination`
  - `long_total_rows`
  - `long_batch_size`
- docs now include long-pagination validation boundaries and artifact naming conventions
- smoke guard added for long-pagination runbook documentation contract (`smoke:extension:epic72`)
157) Tracking artifact:
- `docs/phase11-sprintB-long-pagination-playbook-runbook-slice-2026-02-27.md`
158) Epic 11 Sprint B slice 60 implemented:
- added deterministic navigate-pagination cycle e2e gate (`e2e:extension:navigate-cycle`) using a local multi-page fixture that loops back to page 1
- navigate-cycle e2e now validates:
  - extraction exceeds legacy 120-row ceiling
  - full fixture completion across all unique pages in one run
  - loop-safe termination via `terminationReason=next_link_cycle`
  - navigation coverage diagnostics via `visitedNavigationUrlCount`
- hardening wrappers now support this variant:
  - `--navigate-cycle` in `scripts/run-hardening-with-flags.mjs`
  - `RUN_EXTENSION_E2E_NAVIGATE_CYCLE=true` in `scripts/local-hardening-pass.mjs`
- local/railway/release command variants added for navigate-cycle e2e
- smoke guard added for navigate-cycle e2e/hardening command contract (`smoke:extension:epic73`)
159) Tracking artifact:
- `docs/phase11-sprintB-e2e-navigate-cycle-loop-guard-slice-2026-02-28.md`

## Epic 0 - Foundation
1) Repository/package skeleton for extension + shared core + storage.
2) Message contracts and event types frozen.
3) IndexedDB repositories and migration model.
Acceptance:
- Extension loads with sidepanel shell and background worker.
- Storage init and CRUD smoke tests pass.

## Epic 1 - Core Automation Runtime
1) Runner registry (`listExtractor`, `pageExtractor`, `metadataExtractor`).
2) Lifecycle state machine (start/progress/stop/complete/error/rerun).
3) Permissions and host/optional permission prompts.
Acceptance:
- Start/stop/rerun works from UI.
- Progress events stream correctly.
- Permission-denied scenarios handled cleanly.

## Epic 2 - Picker + List Extraction
1) On-page picker (extract/click modes, selector outputs).
2) `EXTRACT_LIST` action implementation.
3) `LOAD_MORE` methods: `scroll`, `navigate`, `click_button`, `none`.
4) Speed profiles and profile editing/reset.
Acceptance:
- List extraction passes on infinite scroll + paginated benchmarks.
- Load-more method matrix passes.

## Epic 3 - Page/Bulk Extraction
1) URL source modes: manual/csv/datasource.
2) Action types: pages/email/phone/text/maps.
3) Bulk queue controls (concurrency/delays/timeouts/retries).
Acceptance:
- Multi-URL runs complete with per-url status and recoverable failures.
- CSV column mapping and datasource selection flows pass.

## Epic 4 - Data Table + Editing + History
1) Data table views and filters.
2) Column edits, row edits, dedupe behavior.
3) History and table continuity.
Acceptance:
- Edited data persists across sessions.
- Dedupe index behavior matches parity.

## Epic 5 - Exports + Activation
1) Export formats: CSV/XLSX/JSON.
2) Clipboard and Google Sheets flows.
3) Image download config and progress/error reporting.
Acceptance:
- All export formats validated for schema and row integrity.
- Image download mode and naming pattern tests pass.

## Epic 6 - Tool-Specific Advanced Flows
1) Email deep scanning (depth/domain/link controls).
2) Text extractor structured outputs (title/content/metadata/word count).
3) Metadata extractor (JSON-LD/meta and count fields).
4) Maps extractor fields and options.
Acceptance:
- Tool-level benchmark suites meet quality thresholds.

## Epic 7 - Home Hub + Welcome + Roadmap UI
1) Main navigation and tool cards parity.
2) Per-tool welcome/quick-start/tutorial card flows.
3) Roadmap cards/status/notify interactions.
Acceptance:
- UI parity checklist passes against captured references.

## Epic 8 - Scheduling + Integrations (Mode 2 Claims)
1) Scheduler core (interval/cron/timezone).
2) Integration endpoints/webhook delivery.
3) n8n-ready payload contracts.
Acceptance:
- Scheduled runs execute reliably.
- Webhook delivery success/failure observable and retryable.

## Epic 9 - Templates + Playbooks
1) One-click auto-detect extraction setup.
2) Template/recipe library with import/export + schema lock.
3) Destination integrations pack (Sheets hardening + Airtable + signed webhook).
4) Monitoring diff alerts and schedule presets.
5) Scale URL operations + failure recovery UX.
6) Anti-block reliability profiles.
Acceptance:
- New-user one-click extraction succeeds on benchmark targets.
- Template flows are deterministic and portable.
- Destination delivery and monitoring flows are observable and retryable.

## Epic 10 - Telemetry + Diagnostics
1) Event taxonomy implementation.
2) Error packet capture and run artifacts.
3) Run diagnostics panel.
Acceptance:
- Telemetry/event suite passes.
- Failed runs include actionable diagnostics.

## Epic 11 - QA Hardening + Release
1) Full benchmark suite execution.
2) Regression tests for core parity paths.
3) Release gate checks.
Acceptance:
- All quality gates pass.
- Release candidate signed off.

## Story Template (Use For Every Story)
1) Story
- user outcome statement
2) Scope
- exact components touched
3) Acceptance
- explicit pass/fail tests
4) Non-goals
- what is out of scope
