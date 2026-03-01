import {
  AUTOMATION_EVENT_TYPES,
  AUTOMATION_STATES,
  LOAD_MORE_METHODS,
  PAGE_ACTION_TYPES,
  PICKER_MODES,
  RUNNER_TYPES,
  URL_SOURCE_MODES
} from "../vendor/shared/src/events.mjs";
import { MESSAGE_TYPES } from "../vendor/shared/src/messages.mjs";
import {
  ORCHESTRATION_STRATEGIES,
  createAutonomousExecutionPlan,
  parseAutonomousGoal,
  summarizeAutonomousPlan
} from "../vendor/core/src/autonomous-orchestrator.mjs";
import {
  buildFailureReportCsv,
  buildFailureReportEntries,
  dedupeUrls,
  generatePatternUrls,
  generateRangeUrls,
  generateSeedUrls,
  parseSeedList,
  resolveResumeUrls,
  resolveRetryFailedUrls
} from "./page-recovery.mjs";

const elements = {
  navMenuBtn: document.getElementById("nav-menu-btn"),
  navHistoryBtn: document.getElementById("nav-history-btn"),
  navDataBtn: document.getElementById("nav-data-btn"),
  navToolsBtn: document.getElementById("nav-tools-btn"),
  navLatestBtn: document.getElementById("nav-latest-btn"),
  shellNavButtons: Array.from(document.querySelectorAll(".shell-nav-btn[data-shell-view]")),
  appViewPanels: Array.from(document.querySelectorAll(".app-view-panel")),
  homeHubPanel: document.getElementById("home-hub-panel"),
  toolCards: Array.from(document.querySelectorAll(".tool-card[data-tool]")),
  roadmapSchedulingNotifyBtn: document.getElementById("roadmap-scheduling-notify-btn"),
  roadmapIntegrationsNotifyBtn: document.getElementById("roadmap-integrations-notify-btn"),
  roadmapStatusLine: document.getElementById("roadmap-status-line"),
  toolWelcomePanel: document.getElementById("tool-welcome-panel"),
  toolWelcomeLabel: document.getElementById("tool-welcome-label"),
  toolWelcomeTitle: document.getElementById("tool-welcome-title"),
  toolWelcomeSubtitle: document.getElementById("tool-welcome-subtitle"),
  toolWelcomeVideoLabel: document.getElementById("tool-welcome-video-label"),
  toolWelcomeBenefits: document.getElementById("tool-welcome-benefits"),
  toolWelcomeSteps: document.getElementById("tool-welcome-steps"),
  toolWelcomeExtra: document.getElementById("tool-welcome-extra"),
  toolWelcomeStartBtn: document.getElementById("tool-welcome-start-btn"),
  toolWelcomeSkipBtn: document.getElementById("tool-welcome-skip-btn"),
  latestChangesPanel: document.getElementById("latest-changes-panel"),
  openWelcomeBtn: document.getElementById("open-welcome-btn"),
  runnerField: document.getElementById("runner-field"),
  startUrlField: document.getElementById("start-url-field"),
  selectedToolField: document.getElementById("selected-tool-field"),
  activeToolHeading: document.getElementById("active-tool-heading"),
  selectedToolName: document.getElementById("selected-tool-name"),
  simpleModeToggle: document.getElementById("simple-mode-toggle"),
  simpleModeHint: document.getElementById("simple-mode-hint"),
  intentCommandInput: document.getElementById("intent-command-input"),
  intentRunBtn: document.getElementById("intent-run-btn"),
  intentCommandHint: document.getElementById("intent-command-hint"),
  setupAccessBtn: document.getElementById("setup-access-btn"),
  pointFollowBtn: document.getElementById("point-follow-btn"),
  setupAccessStatusLine: document.getElementById("setup-access-status-line"),
  quickFlowStatusLine: document.getElementById("quick-flow-status-line"),
  quickFlowProgressRing: document.getElementById("quick-flow-progress-ring"),
  quickFlowProgressPct: document.getElementById("quick-flow-progress-pct"),
  quickFlowProgressPhase: document.getElementById("quick-flow-progress-phase"),
  runnerType: document.getElementById("runner-type"),
  startUrl: document.getElementById("start-url"),
  quickExtractBtn: document.getElementById("quick-extract-btn"),
  startBtn: document.getElementById("start-btn"),
  stopBtn: document.getElementById("stop-btn"),
  rerunBtn: document.getElementById("rerun-btn"),
  automationActionsRow: document.getElementById("automation-actions-row"),
  statusPill: document.getElementById("status-pill"),
  eventLog: document.getElementById("event-log"),
  clearLogBtn: document.getElementById("clear-log-btn"),
  pickerStatus: document.getElementById("picker-status"),

  listConfigPanel: document.getElementById("list-config-panel"),
  listAdvancedControls: document.getElementById("list-advanced-controls"),
  containerSelector: document.getElementById("container-selector"),
  pickContainerBtn: document.getElementById("pick-container-btn"),
  listAutoDetectBtn: document.getElementById("list-autodetect-btn"),
  listAutoDetectStatusLine: document.getElementById("list-autodetect-status-line"),
  listAutoDetectPreview: document.getElementById("list-autodetect-preview"),
  fieldList: document.getElementById("field-list"),
  pickFieldsBtn: document.getElementById("pick-fields-btn"),
  clearFieldsBtn: document.getElementById("clear-fields-btn"),
  loadMoreMethod: document.getElementById("load-more-method"),
  speedProfile: document.getElementById("speed-profile"),
  speedProfileEditor: document.getElementById("speed-profile-editor"),
  speedProfileEditAttempts: document.getElementById("speed-profile-edit-attempts"),
  speedProfileEditDelayMs: document.getElementById("speed-profile-edit-delay-ms"),
  speedProfileEditNoChangeThreshold: document.getElementById("speed-profile-edit-no-change-threshold"),
  speedProfileSaveBtn: document.getElementById("speed-profile-save-btn"),
  speedProfileResetBtn: document.getElementById("speed-profile-reset-btn"),
  speedProfileStatusLine: document.getElementById("speed-profile-status-line"),
  loadMoreAttempts: document.getElementById("load-more-attempts"),
  loadMoreDelayMs: document.getElementById("load-more-delay-ms"),
  loadMoreScrollPx: document.getElementById("load-more-scroll-px"),
  loadMoreNoChangeThreshold: document.getElementById("load-more-no-change-threshold"),
  loadMoreButtonSelector: document.getElementById("load-more-button-selector"),
  pickLoadMoreBtn: document.getElementById("pick-load-more-btn"),
  loadMoreNextSelector: document.getElementById("load-more-next-selector"),

  pageConfigPanel: document.getElementById("page-config-panel"),
  pageUrlSourceMode: document.getElementById("page-url-source-mode"),
  pageActionTypeField: document.getElementById("page-action-type-field"),
  pageActionType: document.getElementById("page-action-type"),
  pageManualUrlsField: document.getElementById("page-manual-urls-field"),
  pageManualUrls: document.getElementById("page-manual-urls"),
  pageCsvField: document.getElementById("page-csv-field"),
  pageCsvFile: document.getElementById("page-csv-file"),
  pageCsvCount: document.getElementById("page-csv-count"),
  pageDatasourceField: document.getElementById("page-datasource-field"),
  pageDatasourceSelect: document.getElementById("page-datasource-select"),
  refreshDatasourcesBtn: document.getElementById("refresh-datasources-btn"),
  loadDatasourceUrlsBtn: document.getElementById("load-datasource-urls-btn"),
  pageDatasourceColumnRow: document.getElementById("page-datasource-column-row"),
  pageDatasourceColumn: document.getElementById("page-datasource-column"),
  pageDatasourceCount: document.getElementById("page-datasource-count"),
  pageResolvedUrlsPreview: document.getElementById("page-resolved-urls-preview"),
  pageUrlGeneratorPanel: document.getElementById("page-url-generator-panel"),
  urlgenTemplate: document.getElementById("urlgen-template"),
  urlgenRangeStart: document.getElementById("urlgen-range-start"),
  urlgenRangeEnd: document.getElementById("urlgen-range-end"),
  urlgenRangeStep: document.getElementById("urlgen-range-step"),
  urlgenPadding: document.getElementById("urlgen-padding"),
  urlgenSeeds: document.getElementById("urlgen-seeds"),
  urlgenAppendMode: document.getElementById("urlgen-append-mode"),
  urlgenGenerateRangeBtn: document.getElementById("urlgen-generate-range-btn"),
  urlgenGenerateSeedsBtn: document.getElementById("urlgen-generate-seeds-btn"),
  urlgenGeneratePatternBtn: document.getElementById("urlgen-generate-pattern-btn"),
  urlgenClearBtn: document.getElementById("urlgen-clear-btn"),
  urlgenStatusLine: document.getElementById("urlgen-status-line"),
  pageRetryFailedBtn: document.getElementById("page-retry-failed-btn"),
  pageResumeCheckpointBtn: document.getElementById("page-resume-checkpoint-btn"),
  pageFailureReportCsvBtn: document.getElementById("page-failure-report-csv-btn"),
  pageFailureReportJsonBtn: document.getElementById("page-failure-report-json-btn"),
  pageRecoveryPreview: document.getElementById("page-recovery-preview"),
  pageRecoveryStatusLine: document.getElementById("page-recovery-status-line"),
  pageRecoveryPanel: document.getElementById("page-recovery-panel"),
  pageFieldsPanel: document.getElementById("page-fields-panel"),
  pageFieldList: document.getElementById("page-field-list"),
  pickPageFieldsBtn: document.getElementById("pick-page-fields-btn"),
  clearPageFieldsBtn: document.getElementById("clear-page-fields-btn"),
  pageEmailOptionsPanel: document.getElementById("page-email-options-panel"),
  emailDeepScanEnabled: document.getElementById("email-deep-scan-enabled"),
  emailDeepMaxDepth: document.getElementById("email-deep-max-depth"),
  emailDeepMaxLinksPerPage: document.getElementById("email-deep-max-links-per-page"),
  emailDeepSameDomainOnly: document.getElementById("email-deep-same-domain-only"),
  emailDeepLinkSelector: document.getElementById("email-deep-link-selector"),
  emailRemoveDuplicates: document.getElementById("email-remove-duplicates"),
  emailToLowercase: document.getElementById("email-to-lowercase"),
  emailBasicValidation: document.getElementById("email-basic-validation"),
  emailIncludeMailto: document.getElementById("email-include-mailto"),
  emailDomainFilters: document.getElementById("email-domain-filters"),
  pagePhoneOptionsPanel: document.getElementById("page-phone-options-panel"),
  phoneRemoveDuplicates: document.getElementById("phone-remove-duplicates"),
  phoneBasicValidation: document.getElementById("phone-basic-validation"),
  phonePatterns: document.getElementById("phone-patterns"),
  pageTextOptionsPanel: document.getElementById("page-text-options-panel"),
  textIncludeMetadata: document.getElementById("text-include-metadata"),
  textMaxContentChars: document.getElementById("text-max-content-chars"),
  pageMapsOptionsPanel: document.getElementById("page-maps-options-panel"),
  mapsIncludeBasicInfo: document.getElementById("maps-include-basic-info"),
  mapsIncludeContactDetails: document.getElementById("maps-include-contact-details"),
  mapsIncludeReviews: document.getElementById("maps-include-reviews"),
  mapsIncludeHours: document.getElementById("maps-include-hours"),
  mapsIncludeLocation: document.getElementById("maps-include-location"),
  mapsIncludeImages: document.getElementById("maps-include-images"),
  metadataOptionsPanel: document.getElementById("metadata-options-panel"),
  metadataIncludeMetaTags: document.getElementById("metadata-include-meta-tags"),
  metadataIncludeJsonLd: document.getElementById("metadata-include-jsonld"),
  metadataIncludeReviewSignals: document.getElementById("metadata-include-review-signals"),
  metadataIncludeContactSignals: document.getElementById("metadata-include-contact-signals"),
  metadataIncludeRawJsonLd: document.getElementById("metadata-include-raw-jsonld"),
  queueConcurrency: document.getElementById("queue-concurrency"),
  queueDelayMs: document.getElementById("queue-delay-ms"),
  queuePageTimeoutMs: document.getElementById("queue-page-timeout-ms"),
  queueRetries: document.getElementById("queue-retries"),
  queueRetryDelayMs: document.getElementById("queue-retry-delay-ms"),
  queueJitterMs: document.getElementById("queue-jitter-ms"),
  queueReliabilityProfile: document.getElementById("queue-reliability-profile"),
  queueBackoffStrategy: document.getElementById("queue-backoff-strategy"),
  queueJitterMode: document.getElementById("queue-jitter-mode"),
  queueRetryMinDelayMs: document.getElementById("queue-retry-min-delay-ms"),
  queueRetryMaxDelayMs: document.getElementById("queue-retry-max-delay-ms"),
  queueSessionReuseMode: document.getElementById("queue-session-reuse-mode"),
  queueWaitSelector: document.getElementById("queue-wait-selector"),
  queueWaitSelectorTimeoutMs: document.getElementById("queue-wait-selector-timeout-ms"),
  queueWaitPageLoad: document.getElementById("queue-wait-page-load"),
  reliabilityProfileStatusLine: document.getElementById("reliability-profile-status-line"),
  queueAdvancedControls: document.getElementById("queue-advanced-controls"),

  dataTablePanel: document.getElementById("data-table-panel"),
  tableAdvancedControls: document.getElementById("table-advanced-controls"),
  tableRefreshBtn: document.getElementById("table-refresh-btn"),
  tableHistorySelect: document.getElementById("table-history-select"),
  tableLimit: document.getElementById("table-limit"),
  tableSearch: document.getElementById("table-search"),
  tableLoadBtn: document.getElementById("table-load-btn"),
  tableClearFilterBtn: document.getElementById("table-clear-filter-btn"),
  tableFilterColumn: document.getElementById("table-filter-column"),
  tableFilterValue: document.getElementById("table-filter-value"),
  tableRenameFrom: document.getElementById("table-rename-from"),
  tableRenameTo: document.getElementById("table-rename-to"),
  tableRenameBtn: document.getElementById("table-rename-btn"),
  tableDedupeBtn: document.getElementById("table-dedupe-btn"),
  tableCleanupRemoveEmptyRows: document.getElementById("table-cleanup-remove-empty-rows"),
  tableCleanupRemoveEmptyColumns: document.getElementById("table-cleanup-remove-empty-columns"),
  tableCleanupRemoveRepeatingColumns: document.getElementById("table-cleanup-remove-repeating-columns"),
  tableCleanupRemoveDuplicateColumns: document.getElementById("table-cleanup-remove-duplicate-columns"),
  tableCleanupPrioritizeDensity: document.getElementById("table-cleanup-prioritize-density"),
  tableCleanupHideMostlyEmptyColumns: document.getElementById("table-cleanup-hide-mostly-empty-columns"),
  tableCleanupMostlyEmptyThreshold: document.getElementById("table-cleanup-mostly-empty-threshold"),
  tableCleanupIncludeImages: document.getElementById("table-cleanup-include-images"),
  tableCleanupBtn: document.getElementById("table-cleanup-btn"),
  tableMergeColumns: document.getElementById("table-merge-columns"),
  tableMergeTarget: document.getElementById("table-merge-target"),
  tableMergeSeparator: document.getElementById("table-merge-separator"),
  tableMergeRemoveSources: document.getElementById("table-merge-remove-sources"),
  tableMergeBtn: document.getElementById("table-merge-btn"),
  tableStatusLine: document.getElementById("table-status-line"),
  tableGrid: document.getElementById("table-grid"),

  exportPanel: document.getElementById("export-panel"),
  exportTableSelect: document.getElementById("export-table-select"),
  exportFormat: document.getElementById("export-format"),
  exportUseCurrentFilters: document.getElementById("export-use-current-filters"),
  exportFileBtn: document.getElementById("export-file-btn"),
  exportClipboardBtn: document.getElementById("export-clipboard-btn"),
  exportSheetsBtn: document.getElementById("export-sheets-btn"),
  exportStatusLine: document.getElementById("export-status-line"),

  imagePanel: document.getElementById("image-panel"),
  imageScanBtn: document.getElementById("image-scan-btn"),
  imageSearch: document.getElementById("image-search"),
  imageMinWidth: document.getElementById("image-min-width"),
  imageMinHeight: document.getElementById("image-min-height"),
  imageExtFilter: document.getElementById("image-ext-filter"),
  imageSizeFilter: document.getElementById("image-size-filter"),
  imageAltFilter: document.getElementById("image-alt-filter"),
  imageDownloadMode: document.getElementById("image-download-mode"),
  imageNamingPattern: document.getElementById("image-naming-pattern"),
  imageDownloadBtn: document.getElementById("image-download-btn"),
  imageSelectAllBtn: document.getElementById("image-select-all-btn"),
  imageClearSelectionBtn: document.getElementById("image-clear-selection-btn"),
  imageStatusLine: document.getElementById("image-status-line"),
  imagePreview: document.getElementById("image-preview"),

  activationPanel: document.getElementById("activation-panel"),
  activationApiBase: document.getElementById("activation-api-base"),
  activationDeviceName: document.getElementById("activation-device-name"),
  activationLicenseKey: document.getElementById("activation-license-key"),
  activationSaveConfigBtn: document.getElementById("activation-save-config-btn"),
  activationRefreshSessionBtn: document.getElementById("activation-refresh-session-btn"),
  activationProfileBtn: document.getElementById("activation-profile-btn"),
  activationEmail: document.getElementById("activation-email"),
  activationPassword: document.getElementById("activation-password"),
  activationDisplayName: document.getElementById("activation-display-name"),
  activationRegisterBtn: document.getElementById("activation-register-btn"),
  activationLoginBtn: document.getElementById("activation-login-btn"),
  activationLogoutBtn: document.getElementById("activation-logout-btn"),
  activationLicenseRegisterBtn: document.getElementById("activation-license-register-btn"),
  activationLicenseStatusBtn: document.getElementById("activation-license-status-btn"),
  activationDeviceValidateBtn: document.getElementById("activation-device-validate-btn"),
  activationDevicesRefreshBtn: document.getElementById("activation-devices-refresh-btn"),
  activationStatusLine: document.getElementById("activation-status-line"),
  activationSessionSummary: document.getElementById("activation-session-summary"),
  activationDeviceList: document.getElementById("activation-device-list"),

  cloudControlPanel: document.getElementById("cloud-control-panel"),
  cloudPolicyLoadBtn: document.getElementById("cloud-policy-load-btn"),
  cloudFeaturesOptIn: document.getElementById("cloud-features-opt-in"),
  cloudWebhookOptIn: document.getElementById("cloud-webhook-opt-in"),
  cloudConsentVersion: document.getElementById("cloud-consent-version"),
  cloudPolicySaveBtn: document.getElementById("cloud-policy-save-btn"),
  jobsPolicyBtn: document.getElementById("jobs-policy-btn"),
  cloudRefreshAllBtn: document.getElementById("cloud-refresh-all-btn"),
  cloudStatusLine: document.getElementById("cloud-status-line"),

  integrationProvider: document.getElementById("integration-provider"),
  integrationSecretName: document.getElementById("integration-secret-name"),
  integrationSecretValue: document.getElementById("integration-secret-value"),
  integrationSecretLabel: document.getElementById("integration-secret-label"),
  integrationPresetWebhookBtn: document.getElementById("integration-preset-webhook-btn"),
  integrationPresetAirtableBtn: document.getElementById("integration-preset-airtable-btn"),
  integrationPresetN8nBtn: document.getElementById("integration-preset-n8n-btn"),
  integrationTestTargetUrl: document.getElementById("integration-test-target-url"),
  integrationTestMethod: document.getElementById("integration-test-method"),
  integrationTestSecretPlacement: document.getElementById("integration-test-secret-placement"),
  integrationTestHeaderName: document.getElementById("integration-test-header-name"),
  integrationTestBody: document.getElementById("integration-test-body"),
  integrationsListBtn: document.getElementById("integrations-list-btn"),
  integrationsUpsertBtn: document.getElementById("integrations-upsert-btn"),
  integrationsTestBtn: document.getElementById("integrations-test-btn"),
  integrationsRemoveBtn: document.getElementById("integrations-remove-btn"),
  integrationsList: document.getElementById("integrations-list"),

  jobsJobType: document.getElementById("jobs-job-type"),
  jobsPayload: document.getElementById("jobs-payload"),
  jobsFillWebhookBtn: document.getElementById("jobs-fill-webhook-btn"),
  jobsFillExtractSummaryBtn: document.getElementById("jobs-fill-extract-summary-btn"),
  jobsFillMonitorDiffBtn: document.getElementById("jobs-fill-monitor-diff-btn"),
  jobsCancelId: document.getElementById("jobs-cancel-id"),
  jobsEnqueueBtn: document.getElementById("jobs-enqueue-btn"),
  jobsListBtn: document.getElementById("jobs-list-btn"),
  jobsDeadBtn: document.getElementById("jobs-dead-btn"),
  jobsCancelBtn: document.getElementById("jobs-cancel-btn"),
  jobsList: document.getElementById("jobs-list"),

  scheduleName: document.getElementById("schedule-name"),
  scheduleKind: document.getElementById("schedule-kind"),
  scheduleIntervalMinutes: document.getElementById("schedule-interval-minutes"),
  scheduleCronExpr: document.getElementById("schedule-cron-expr"),
  scheduleTimezone: document.getElementById("schedule-timezone"),
  scheduleTargetJobType: document.getElementById("schedule-target-job-type"),
  scheduleTargetPayload: document.getElementById("schedule-target-payload"),
  scheduleFillWebhookBtn: document.getElementById("schedule-fill-webhook-btn"),
  scheduleFillExtractSummaryBtn: document.getElementById("schedule-fill-extract-summary-btn"),
  scheduleFillMonitorDiffBtn: document.getElementById("schedule-fill-monitor-diff-btn"),
  scheduleCreateBtn: document.getElementById("schedule-create-btn"),
  scheduleListBtn: document.getElementById("schedule-list-btn"),
  scheduleListActiveBtn: document.getElementById("schedule-list-active-btn"),
  scheduleActionId: document.getElementById("schedule-action-id"),
  scheduleToggleActive: document.getElementById("schedule-toggle-active"),
  scheduleToggleBtn: document.getElementById("schedule-toggle-btn"),
  scheduleRunNowBtn: document.getElementById("schedule-run-now-btn"),
  scheduleRemoveBtn: document.getElementById("schedule-remove-btn"),
  scheduleList: document.getElementById("schedule-list"),

  observabilityApiKey: document.getElementById("observability-api-key"),
  obsDashboardBtn: document.getElementById("obs-dashboard-btn"),
  obsSloBtn: document.getElementById("obs-slo-btn"),
  obsErrorsBtn: document.getElementById("obs-errors-btn"),
  obsJobsBtn: document.getElementById("obs-jobs-btn"),
  obsOutput: document.getElementById("obs-output"),

  templateName: document.getElementById("template-name"),
  templateSourceDomains: document.getElementById("template-source-domains"),
  templateSchemaLockEnabled: document.getElementById("template-schema-lock-enabled"),
  templateSelect: document.getElementById("template-select"),
  templateNotes: document.getElementById("template-notes"),
  templateSaveBtn: document.getElementById("template-save-btn"),
  templateApplyBtn: document.getElementById("template-apply-btn"),
  templateRunBtn: document.getElementById("template-run-btn"),
  templateDeleteBtn: document.getElementById("template-delete-btn"),
  templateExportSelectedBtn: document.getElementById("template-export-selected-btn"),
  templateExportAllBtn: document.getElementById("template-export-all-btn"),
  templateImportBtn: document.getElementById("template-import-btn"),
  templateImportFile: document.getElementById("template-import-file"),
  templateList: document.getElementById("template-list"),
  templatesStatusLine: document.getElementById("templates-status-line"),

  diagnosticsSnapshotBtn: document.getElementById("diagnostics-snapshot-btn"),
  diagnosticsReportBtn: document.getElementById("diagnostics-report-btn"),
  diagnosticsCopyBtn: document.getElementById("diagnostics-copy-btn"),
  diagnosticsOutput: document.getElementById("diagnostics-output"),
  templatesDiagnosticsPanel: document.getElementById("templates-diagnostics-panel")
};

const state = {
  currentAutomationId: null,
  lastTerminalAutomationId: null,
  currentStatus: AUTOMATION_STATES.IDLE,
  pickerSessionPurposeById: new Map(),
  runnerCatalog: [],
  listFields: [],
  pageFields: [],
  csvUrls: [],
  dataSources: [],
  dataSourceColumns: [],
  dataSourceUrls: [],
  tableHistory: [],
  tableColumns: [],
  tableRows: [],
  activeTableDataId: null,
  imageScanResults: [],
  imageSelection: new Set(),
  activationSession: null,
  activationDevices: [],
  cloudPolicy: null,
  integrationSecrets: [],
  cloudJobs: [],
  cloudDeadJobs: [],
  cloudSchedules: [],
  templates: [],
  diagnosticsReport: null,
  activeShellView: "menu",
  activeTool: "list",
  showWelcomeOverride: false,
  sessionWelcomeCounted: new Set(),
  dismissedWelcomeTools: new Set(),
  welcomeVisits: {},
  speedProfiles: {},
  reliabilitySettings: null,
  simpleMode: true,
  pointFollowActive: false,
  pointFollowStartOptions: null,
  lastStartError: "",
  statusProgressPct: 0,
  statusPhase: "",
  intentAutoExport: false,
  intentAutoExportFormat: "csv",
  intentLastCommand: "",
  intentAutoMapsDetailEnrichPending: false,
  intentAutoMapsDetailEnrichAutomationId: null,
  intentAutoListUrlEnrichPending: false,
  intentAutoListUrlEnrichAutomationId: null,
  domainAutonomyHints: {},
  lastOrchestrationPlan: null,
  lastOrchestrationAt: ""
};

const SHELL_VIEWS = Object.freeze({
  MENU: "menu",
  HISTORY: "history",
  DATA: "data",
  TOOLS: "tools",
  LATEST: "latest"
});
const SIMPLE_MODE_ALLOWED_VIEWS = new Set([SHELL_VIEWS.MENU, SHELL_VIEWS.TOOLS, SHELL_VIEWS.DATA]);

const WELCOME_VISIT_LIMIT = 3;
const WELCOME_VISITS_STORAGE_KEY = "datascrap.sidepanel.welcome-visits.v1";
const SIMPLE_MODE_STORAGE_KEY = "datascrap.sidepanel.simple-mode.v1";
const TEMPLATES_STORAGE_KEY = "datascrap.sidepanel.templates.v1";
const SPEED_PROFILES_STORAGE_KEY = "datascrap.sidepanel.speed-profiles.v1";
const RELIABILITY_SETTINGS_STORAGE_KEY = "datascrap.sidepanel.reliability-settings.v1";
const TEMPLATE_LIMIT = 200;
const TEMPLATE_BUNDLE_TYPE = "datascrap.templates.bundle";
const TEMPLATE_BUNDLE_VERSION = "2026-02-23";
const DOMAIN_AUTONOMY_HINTS_STORAGE_KEY = "datascrap.sidepanel.domain-autonomy-hints.v1";
const DOMAIN_AUTONOMY_HINT_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const DOMAIN_HINT_ALLOWED_STRATEGIES = new Set([
  ORCHESTRATION_STRATEGIES.LIST_AUTODETECT_AUTOPILOT,
  ORCHESTRATION_STRATEGIES.POINT_FOLLOW_GUIDED
]);
const DEFAULT_SPEED_PROFILES = Object.freeze({
  slow: Object.freeze({
    attempts: 8,
    delayMs: 1600,
    noChangeThreshold: 3
  }),
  normal: Object.freeze({
    attempts: 5,
    delayMs: 900,
    noChangeThreshold: 2
  }),
  fast: Object.freeze({
    attempts: 3,
    delayMs: 450,
    noChangeThreshold: 1
  })
});
const RELIABILITY_PROFILES = Object.freeze({
  conservative: Object.freeze({
    backoffStrategy: "exponential",
    jitterMode: "full",
    minRetryDelayMs: 1200,
    maxRetryDelayMs: 30000,
    sessionReuseMode: "sticky"
  }),
  balanced: Object.freeze({
    backoffStrategy: "linear",
    jitterMode: "bounded",
    minRetryDelayMs: 700,
    maxRetryDelayMs: 12000,
    sessionReuseMode: "off"
  }),
  aggressive: Object.freeze({
    backoffStrategy: "fixed",
    jitterMode: "none",
    minRetryDelayMs: 200,
    maxRetryDelayMs: 3500,
    sessionReuseMode: "off"
  })
});
const RELIABILITY_PROFILE_NAMES = Object.freeze(["conservative", "balanced", "aggressive", "custom"]);
const BACKOFF_STRATEGIES = Object.freeze(["fixed", "linear", "exponential"]);
const JITTER_MODES = Object.freeze(["none", "bounded", "full"]);
const SESSION_REUSE_MODES = Object.freeze(["off", "sticky"]);
const DEFAULT_RELIABILITY_PROFILE = "balanced";
const ROADMAP_NOTIFY_URLS = Object.freeze({
  scheduling: "https://datascrap.app/waitlist/scheduling",
  integrations: "https://datascrap.app/waitlist/integrations"
});
const SMART_PAGINATION_SELECTOR_CANDIDATES = Object.freeze([
  "a#pnnext",
  "a[aria-label='Next']",
  "a[aria-label='Next page']",
  "a[aria-label='next page']",
  "a[aria-label='Next results page']",
  "a[aria-label='next results page']",
  "a.sb_pagN",
  "a[title='Next page']",
  "a[rel='next']",
  "li.next a",
  "a.next"
]);
const SMART_PAGINATION_NEXT_SELECTOR = SMART_PAGINATION_SELECTOR_CANDIDATES.join(", ");
const AUTO_URL_ENRICHMENT_MAX_URLS = 500;
const LIST_AUTOCONTINUE_SEGMENTS_DEFAULT = 24;
const LIST_AUTOCONTINUE_SEGMENTS_EXHAUSTIVE = 40;
const LIST_AUTOCONTINUE_HARD_ROUND_CAP_DEFAULT = 5000;
const LIST_AUTOCONTINUE_HARD_ROUND_CAP_EXHAUSTIVE = 10000;
const LIST_HARDCAP_AUTOCONTINUE_CHAINS_DEFAULT = 3;
const LIST_HARDCAP_AUTOCONTINUE_CHAINS_EXHAUSTIVE = 5;
const LIST_HARDCAP_ABSOLUTE_LIMIT_DEFAULT = 25000;
const LIST_HARDCAP_ABSOLUTE_LIMIT_EXHAUSTIVE = 50000;

const PAGE_ACTION_SCHEMA_COLUMNS = Object.freeze({
  [PAGE_ACTION_TYPES.EXTRACT_PAGES_EMAIL]: Object.freeze(["emails", "emailCount", "emailDomains", "deepScannedPages"]),
  [PAGE_ACTION_TYPES.EXTRACT_PAGES_PHONE]: Object.freeze(["phones", "phoneCount"]),
  [PAGE_ACTION_TYPES.EXTRACT_PAGES_TEXT]: Object.freeze([
    "title",
    "description",
    "author",
    "publishDate",
    "canonicalUrl",
    "lang",
    "h1",
    "h2Count",
    "paragraphCount",
    "wordCount",
    "excerpt",
    "content"
  ]),
  [PAGE_ACTION_TYPES.EXTRACT_PAGES_GOOGLE_MAPS]: Object.freeze([
    "mapName",
    "mapRating",
    "mapCategory",
    "mapAddress",
    "mapLatitude",
    "mapLongitude",
    "mapPhone",
    "mapWebsite",
    "mapHours",
    "mapReviewCount",
    "mapImageCount"
  ])
});

const METADATA_SCHEMA_COLUMNS = Object.freeze([
  "url",
  "title",
  "description",
  "author",
  "publishDate",
  "canonicalUrl",
  "ogTitle",
  "ogDescription",
  "ogType",
  "ogImage",
  "twitterCard",
  "metadataTagCount",
  "schemaTypes",
  "schemaTypeCount",
  "jsonLdScriptsCount",
  "jsonLdNodeCount",
  "reviewCount",
  "aggregateRatingCount",
  "emailCount",
  "phoneCount",
  "detectedLang",
  "jsonLdPreview"
]);

const TOOL_PRESETS = Object.freeze({
  list: {
    label: "LIST EXTRACTOR",
    title: "Extract Lists and Tables from any website",
    subtitle: "Pull repeating data from lists, tables, and paginated content.",
    videoLabel: "Watch: Extract Lists",
    benefits: [
      "Product listings, search results, and feeds",
      "Tables, directories, and catalogs",
      "Automatic pagination and load-more handling"
    ],
    quickStart: [
      "Click on any list item or container",
      "Configure pagination settings if needed",
      "Run extraction and download your data"
    ],
    runnerType: RUNNER_TYPES.LIST_EXTRACTOR,
    shellView: SHELL_VIEWS.TOOLS,
    tablePanelView: SHELL_VIEWS.DATA
  },
  page_details: {
    label: "PAGE DETAILS EXTRACTOR",
    title: "Extract Page Details from any website",
    subtitle: "Pull specific data from multiple pages at once.",
    videoLabel: "Watch: Extract Page Details",
    benefits: [
      "Prices, titles, descriptions, and links",
      "Images, ratings, and other visible fields",
      "Same details extracted from hundreds of URLs"
    ],
    quickStart: [
      "Add URLs to extract from",
      "Click elements to select what to extract",
      "Run extraction and download your data"
    ],
    runnerType: RUNNER_TYPES.PAGE_EXTRACTOR,
    actionType: PAGE_ACTION_TYPES.EXTRACT_PAGES,
    shellView: SHELL_VIEWS.TOOLS,
    tablePanelView: SHELL_VIEWS.DATA
  },
  email: {
    label: "EMAIL EXTRACTOR",
    title: "Extract Email Addresses from any website",
    subtitle: "Collect email addresses listed on pages with optional deep scanning.",
    videoLabel: "Watch: Extract Emails",
    benefits: [
      "Find common and uncommon email formats",
      "Deep scan internal pages for better coverage",
      "Process many websites with progress tracking"
    ],
    quickStart: [
      "Add URLs manually, via CSV, or data source",
      "Configure deep scanning and post-processing",
      "Run extraction and export cleaned email lists"
    ],
    extraLines: [
      "URL sources: Manual Input, Upload CSV, Data Source",
      "Optional: Deep Scanning",
      "Pro path: Faster Extraction (upgrade flow)"
    ],
    runnerType: RUNNER_TYPES.PAGE_EXTRACTOR,
    actionType: PAGE_ACTION_TYPES.EXTRACT_PAGES_EMAIL,
    shellView: SHELL_VIEWS.TOOLS,
    tablePanelView: SHELL_VIEWS.DATA
  },
  image: {
    label: "IMAGE DOWNLOADER",
    title: "Download Images from current page",
    subtitle: "Scan, filter, and bulk download page images with custom naming.",
    videoLabel: "Watch: Download Images",
    benefits: [
      "Scan image URLs, dimensions, and alt text",
      "Filter by size, extension, and metadata",
      "Bulk download filtered or selected images"
    ],
    quickStart: [
      "Open the DATA tab image panel",
      "Scan the active page",
      "Choose filters and download images"
    ],
    shellView: SHELL_VIEWS.DATA,
    tablePanelView: SHELL_VIEWS.DATA
  },
  text: {
    label: "PAGE TEXT EXTRACTOR",
    title: "Extract Clean Text from any website",
    subtitle: "Structured clean text ready for AI processing and analysis.",
    videoLabel: "Watch: Extract Text",
    benefits: [
      "Main page content cleaned from noise",
      "Title, author, publish date, and metadata",
      "Output ready for GPT, Claude, and other models"
    ],
    quickStart: [
      "Add URLs manually, from CSV, or data source",
      "Set extraction settings (optional)",
      "Run extraction and download clean text data"
    ],
    runnerType: RUNNER_TYPES.PAGE_EXTRACTOR,
    actionType: PAGE_ACTION_TYPES.EXTRACT_PAGES_TEXT,
    shellView: SHELL_VIEWS.TOOLS,
    tablePanelView: SHELL_VIEWS.DATA
  }
});

function randomId(prefix = "id") {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function appendLog(line, payload = null) {
  const timestamp = new Date().toISOString();
  const text = payload ? `${timestamp} ${line}\n${JSON.stringify(payload, null, 2)}` : `${timestamp} ${line}`;
  const next = elements.eventLog.textContent ? `${elements.eventLog.textContent}\n${text}` : text;
  elements.eventLog.textContent = next;
  elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeEnumValue(value, allowedValues, fallback) {
  const normalized = String(value || "").trim().toLowerCase();
  return allowedValues.includes(normalized) ? normalized : fallback;
}

function friendlyErrorText(message, { cloud = false } = {}) {
  const raw = String(message || "").trim();
  if (!raw) return "Unknown error";

  if (raw.includes("Host permission denied by user") || raw.includes("API host permission denied by user")) {
    return cloud
      ? "Access to this API host was denied. Allow browser access and retry."
      : "Access to this site was denied. Allow browser access and retry.";
  }
  if (raw.includes("Permission API timeout")) {
    return "Permission prompt timed out. Click Enable All Access again and approve the browser prompt.";
  }
  if (raw.includes("must be called during a user gesture")) {
    return "Permission request must be triggered by a click. Click Enable All Access again.";
  }
  if (raw.includes("Extension manifest must request permission to access this host")) {
    return "Access to this site is missing. Click Enable All Access, allow permission, then retry.";
  }
  if (raw.includes("Required permission was denied by the user")) {
    return "Access to this site was denied. Use Enable All Access and allow permission, then retry.";
  }
  if (raw.includes("Missing bearer token") || raw.includes("Invalid or expired token")) {
    return "Login required. Open Activation, sign in, then retry.";
  }
  if (raw.includes("Cloud features are not enabled for this account")) {
    return "Enable Cloud features opt-in in Cloud Control, then retry.";
  }
  if (raw.includes("Webhook delivery is not enabled for this account")) {
    return "Enable Webhook delivery opt-in in Cloud Control, then retry.";
  }
  if (raw.includes("Optional cloud features are disabled")) {
    return "Cloud features are disabled on the server. Local extraction still works.";
  }
  return raw;
}

function formatStatusErrorText(text, { cloud = false, error = false } = {}) {
  const raw = String(text || "");
  if (!error) return raw;
  const friendly = friendlyErrorText(raw, {
    cloud
  });
  if (!friendly || friendly === raw) return raw;
  const separatorIndex = raw.indexOf(":");
  if (separatorIndex >= 0) {
    const prefix = raw.slice(0, separatorIndex + 1).trim();
    return `${prefix} ${friendly}`;
  }
  return friendly;
}

function toCellText(value) {
  return String(value === undefined || value === null ? "" : value);
}

function normalizeColumnName(value, fallback = "") {
  const raw = String(value || "").trim().toLowerCase();
  const normalized = raw
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function formatRelativeTimestamp(value) {
  const iso = String(value || "").trim();
  if (!iso) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function normalizeFieldName(value, index) {
  const fallback = `field_${index + 1}`;
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "") || fallback;
}

function preferredExtractMode(selection) {
  const hints = Array.isArray(selection?.attributeHints) ? selection.attributeHints : [];
  if (hints.some((hint) => hint.mode === "image_url")) return "image_url";
  if (hints.some((hint) => hint.mode === "link_url")) return "link_url";
  return "text";
}

function createFieldFromSelection(selection, targetListLength, index) {
  const preview = String(selection?.textPreview || "").trim();
  const baseName = preview
    ? preview
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, " ")
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join("_")
    : "";

  const name = normalizeFieldName(baseName || `field_${targetListLength + index + 1}`, targetListLength + index);
  const extractMode = preferredExtractMode(selection);
  const attributeHint = (Array.isArray(selection?.attributeHints) ? selection.attributeHints : []).find(
    (hint) => hint.mode === "attribute" && hint.attribute
  );

  return {
    id: randomId("field"),
    name,
    selector: String(selection?.selector || "").trim(),
    relativeSelector: String(selection?.relativeSelector || "").trim(),
    extractMode,
    attribute: attributeHint?.attribute || ""
  };
}

function createFieldFromAutoDetect(field, index) {
  const mode = String(field?.extractMode || "text").trim().toLowerCase();
  const normalizedMode = ["text", "link_url", "image_url", "attribute"].includes(mode) ? mode : "text";
  const relativeSelector = String(field?.relativeSelector || "").trim();
  const selector = String(field?.selector || relativeSelector).trim();
  const fallbackName = `field_${index + 1}`;
  return {
    id: randomId("field"),
    name: normalizeFieldName(field?.name || fallbackName, index),
    selector,
    relativeSelector,
    extractMode: normalizedMode,
    attribute: String(field?.attribute || "").trim()
  };
}

function toProgressPercent(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return clamp(Number(fallback || 0), 0, 100);
  return clamp(Math.round(parsed), 0, 100);
}

function renderQuickFlowProgress() {
  if (!elements.quickFlowProgressRing) return;
  const status = String(state.currentStatus || AUTOMATION_STATES.IDLE);
  const isRunning = status === AUTOMATION_STATES.RUNNING || status === AUTOMATION_STATES.STOPPING;
  const isError = status === AUTOMATION_STATES.ERROR;
  const isCompleted = status === AUTOMATION_STATES.COMPLETED;
  const visualPct = isCompleted ? 100 : toProgressPercent(state.statusProgressPct, 0);

  elements.quickFlowProgressRing.style.setProperty("--progress-pct", `${visualPct}%`);
  elements.quickFlowProgressRing.classList.toggle("is-running", isRunning);
  elements.quickFlowProgressRing.classList.toggle("is-error", isError);
  elements.quickFlowProgressRing.classList.toggle("is-complete", isCompleted);
  if (elements.quickFlowProgressPct) {
    elements.quickFlowProgressPct.textContent = `${visualPct}%`;
  }

  const phase = String(state.statusPhase || "").trim();
  let phaseLabel = "Ready to run";
  if (isRunning) {
    phaseLabel = phase || "Autonomous extraction running";
  } else if (isCompleted) {
    phaseLabel = phase || "Extraction complete";
  } else if (isError) {
    phaseLabel = phase || "Needs attention";
  } else if (status === AUTOMATION_STATES.STOPPED) {
    phaseLabel = phase || "Stopped";
  } else if (phase) {
    phaseLabel = phase;
  }
  if (elements.quickFlowProgressPhase) {
    elements.quickFlowProgressPhase.textContent = phaseLabel;
  }
}

function renderStatusPill() {
  const status = String(state.currentStatus || AUTOMATION_STATES.IDLE);
  const isRunning = status === AUTOMATION_STATES.RUNNING || status === AUTOMATION_STATES.STOPPING;
  const isError = status === AUTOMATION_STATES.ERROR;
  const isCompleted = status === AUTOMATION_STATES.COMPLETED;
  const pct = toProgressPercent(state.statusProgressPct, 0);
  const visualPct = isCompleted ? 100 : isRunning ? pct : pct;
  const label = isRunning ? `${status} ${visualPct}%` : isCompleted ? "completed 100%" : status;

  elements.statusPill.textContent = label;
  elements.statusPill.classList.toggle("status-running", isRunning);
  elements.statusPill.classList.toggle("status-error", isError);
  elements.statusPill.style.setProperty("--progress-pct", `${visualPct}%`);
  const phase = String(state.statusPhase || "").trim();
  if (phase) {
    elements.statusPill.title = phase;
  } else {
    elements.statusPill.removeAttribute("title");
  }
  renderQuickFlowProgress();
}

function setStatus(status) {
  const nextStatus = String(status || AUTOMATION_STATES.IDLE);
  state.currentStatus = nextStatus;
  if (nextStatus === AUTOMATION_STATES.IDLE) {
    state.statusProgressPct = 0;
    state.statusPhase = "";
  } else if (nextStatus === AUTOMATION_STATES.RUNNING || nextStatus === AUTOMATION_STATES.STOPPING) {
    if (state.statusProgressPct <= 0) {
      state.statusProgressPct = 2;
    }
  } else if (nextStatus === AUTOMATION_STATES.COMPLETED) {
    state.statusProgressPct = 100;
    if (!state.statusPhase) {
      state.statusPhase = "Extraction complete";
    }
  }
  renderStatusPill();
}

function setStatusProgress(progressValue, { phase = "" } = {}) {
  state.statusProgressPct = toProgressPercent(progressValue, state.statusProgressPct);
  if (phase) {
    state.statusPhase = String(phase || "").trim();
  }
  renderStatusPill();
}

function setPickerStatus(text) {
  elements.pickerStatus.textContent = `picker: ${text}`;
}

function setListAutoDetectStatus(text, { error = false } = {}) {
  const next = formatStatusErrorText(text, {
    error
  });
  if (elements.listAutoDetectStatusLine) {
    elements.listAutoDetectStatusLine.textContent = next;
    elements.listAutoDetectStatusLine.classList.toggle("status-error", Boolean(error));
  }
  if (elements.quickFlowStatusLine) {
    elements.quickFlowStatusLine.textContent = next;
    elements.quickFlowStatusLine.classList.toggle("status-error", Boolean(error));
  }
}

function renderListAutoDetectPreview(payload) {
  if (!elements.listAutoDetectPreview) return;
  const fields = Array.isArray(payload?.fields) ? payload.fields : [];
  const previewRows = Array.isArray(payload?.previewRows) ? payload.previewRows : [];
  if (!payload || fields.length === 0) {
    elements.listAutoDetectPreview.textContent = "No auto-detect run yet.";
    return;
  }

  const lines = [];
  lines.push(
    `container=${String(payload.containerSelector || "")} | rows=${Number(payload.containerCount || 0)} | confidence=${Math.round(
      Number(payload.confidence || 0) * 100
    )}%`
  );
  lines.push(`fields=${fields.map((field) => String(field.name || "")).join(", ")}`);
  if (previewRows.length > 0) {
    lines.push("preview:");
    for (const row of previewRows.slice(0, 2)) {
      lines.push(JSON.stringify(row));
    }
  }
  elements.listAutoDetectPreview.textContent = lines.join("\n");
}

function sendMessage(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message || "Failed to send message"));
        return;
      }

      if (!response) {
        reject(new Error("No response from background"));
        return;
      }

      if (response.type === MESSAGE_TYPES.ERROR) {
        reject(new Error(response.payload?.message || "Background error"));
        return;
      }

      resolve(response.payload || {});
    });
  });
}

function renderFieldList({ target, fields }) {
  target.innerHTML = "";
  if (fields.length === 0) {
    const empty = document.createElement("div");
    empty.className = "field-empty";
    empty.textContent = "No fields selected yet.";
    target.appendChild(empty);
    return;
  }

  for (const field of fields) {
    const wrapper = document.createElement("div");
    wrapper.className = "field-item";

    const header = document.createElement("div");
    header.className = "field-item-head";

    const nameInput = document.createElement("input");
    nameInput.className = "field-name-input";
    nameInput.value = field.name;
    nameInput.placeholder = "field_name";
    nameInput.addEventListener("input", () => {
      field.name = normalizeFieldName(nameInput.value, 0);
    });

    const removeButton = document.createElement("button");
    removeButton.className = "btn btn-ghost";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      const index = fields.findIndex((item) => item.id === field.id);
      if (index >= 0) {
        fields.splice(index, 1);
      }
      renderFieldList({
        target,
        fields
      });
    });

    header.appendChild(nameInput);
    header.appendChild(removeButton);

    const modeSelect = document.createElement("select");
    modeSelect.innerHTML = `
      <option value="text">text</option>
      <option value="link_url">link_url</option>
      <option value="image_url">image_url</option>
      <option value="attribute">attribute</option>
    `;
    modeSelect.value = field.extractMode || "text";
    modeSelect.addEventListener("change", () => {
      field.extractMode = modeSelect.value;
      renderFieldList({
        target,
        fields
      });
    });

    const modeLabel = document.createElement("label");
    modeLabel.className = "field";
    modeLabel.innerHTML = "<span>Extract Mode</span>";
    modeLabel.appendChild(modeSelect);

    wrapper.appendChild(header);
    wrapper.appendChild(modeLabel);

    if (field.extractMode === "attribute") {
      const attrInput = document.createElement("input");
      attrInput.className = "field-name-input";
      attrInput.placeholder = "attribute name (e.g. data-id)";
      attrInput.value = field.attribute || "";
      attrInput.addEventListener("input", () => {
        field.attribute = attrInput.value.trim();
      });

      const attrLabel = document.createElement("label");
      attrLabel.className = "field";
      attrLabel.innerHTML = "<span>Attribute</span>";
      attrLabel.appendChild(attrInput);
      wrapper.appendChild(attrLabel);
    }

    const selectorLine = document.createElement("div");
    selectorLine.className = "field-meta";
    selectorLine.textContent = `selector: ${field.selector}`;
    wrapper.appendChild(selectorLine);

    if (field.relativeSelector) {
      const relativeLine = document.createElement("div");
      relativeLine.className = "field-meta";
      relativeLine.textContent = `relative: ${field.relativeSelector}`;
      wrapper.appendChild(relativeLine);
    }

    target.appendChild(wrapper);
  }
}

function renderListFields() {
  renderFieldList({
    target: elements.fieldList,
    fields: state.listFields
  });
}

function renderPageFields() {
  renderFieldList({
    target: elements.pageFieldList,
    fields: state.pageFields
  });
}

function setSpeedProfileStatus(text, { error = false } = {}) {
  if (!elements.speedProfileStatusLine) return;
  elements.speedProfileStatusLine.textContent = String(text || "");
  elements.speedProfileStatusLine.classList.toggle("status-error", Boolean(error));
}

function normalizeSpeedProfileInput(input, fallback = DEFAULT_SPEED_PROFILES.normal) {
  const source = input && typeof input === "object" ? input : {};
  const attempts = clamp(parseNumber(source.attempts, fallback.attempts), 1, 30);
  const delayMs = clamp(parseNumber(source.delayMs, fallback.delayMs), 100, 10000);
  const noChangeThreshold = clamp(parseNumber(source.noChangeThreshold, fallback.noChangeThreshold), 1, 10);
  return {
    attempts,
    delayMs,
    noChangeThreshold
  };
}

function loadSpeedProfilesFromStorage() {
  try {
    const raw = globalThis.localStorage?.getItem(SPEED_PROFILES_STORAGE_KEY);
    if (!raw) {
      return Object.fromEntries(Object.entries(DEFAULT_SPEED_PROFILES).map(([key, value]) => [key, { ...value }]));
    }
    const parsed = JSON.parse(raw);
    const output = {};
    for (const [name, defaults] of Object.entries(DEFAULT_SPEED_PROFILES)) {
      output[name] = normalizeSpeedProfileInput(parsed?.[name], defaults);
    }
    return output;
  } catch {
    return Object.fromEntries(Object.entries(DEFAULT_SPEED_PROFILES).map(([key, value]) => [key, { ...value }]));
  }
}

function saveSpeedProfilesToStorage() {
  try {
    globalThis.localStorage?.setItem(SPEED_PROFILES_STORAGE_KEY, JSON.stringify(state.speedProfiles || {}));
  } catch {
    // ignore storage failures
  }
}

function getSpeedProfile(profileName) {
  const key = String(profileName || "normal").trim().toLowerCase();
  const defaults = DEFAULT_SPEED_PROFILES[key] || DEFAULT_SPEED_PROFILES.normal;
  const candidate = state.speedProfiles?.[key];
  return normalizeSpeedProfileInput(candidate, defaults);
}

function syncSpeedProfileEditorFromSelection() {
  const profile = getSpeedProfile(elements.speedProfile.value);
  elements.speedProfileEditAttempts.value = String(profile.attempts);
  elements.speedProfileEditDelayMs.value = String(profile.delayMs);
  elements.speedProfileEditNoChangeThreshold.value = String(profile.noChangeThreshold);
}

function applySpeedProfileDefaults(profileName, { preserveManualOverrides = false } = {}) {
  const profile = getSpeedProfile(profileName);
  if (!preserveManualOverrides) {
    elements.loadMoreAttempts.value = String(profile.attempts);
    elements.loadMoreDelayMs.value = String(profile.delayMs);
    elements.loadMoreNoChangeThreshold.value = String(profile.noChangeThreshold);
  }
  syncSpeedProfileEditorFromSelection();
}

function onSpeedProfileSave() {
  const profileName = String(elements.speedProfile.value || "normal").toLowerCase();
  const defaults = DEFAULT_SPEED_PROFILES[profileName];
  if (!defaults) {
    setSpeedProfileStatus(`Unknown profile: ${profileName}`, {
      error: true
    });
    return;
  }

  const normalized = normalizeSpeedProfileInput(
    {
      attempts: elements.speedProfileEditAttempts.value,
      delayMs: elements.speedProfileEditDelayMs.value,
      noChangeThreshold: elements.speedProfileEditNoChangeThreshold.value
    },
    defaults
  );

  state.speedProfiles[profileName] = normalized;
  saveSpeedProfilesToStorage();
  applySpeedProfileDefaults(profileName);
  setSpeedProfileStatus(`Saved profile "${profileName}"`);
}

function onSpeedProfileReset() {
  const profileName = String(elements.speedProfile.value || "normal").toLowerCase();
  const defaults = DEFAULT_SPEED_PROFILES[profileName];
  if (!defaults) {
    setSpeedProfileStatus(`Unknown profile: ${profileName}`, {
      error: true
    });
    return;
  }
  state.speedProfiles[profileName] = { ...defaults };
  saveSpeedProfilesToStorage();
  applySpeedProfileDefaults(profileName);
  setSpeedProfileStatus(`Reset profile "${profileName}" to defaults`);
}

function setReliabilityProfileStatus(text, { error = false } = {}) {
  if (!elements.reliabilityProfileStatusLine) return;
  elements.reliabilityProfileStatusLine.textContent = String(text || "");
  elements.reliabilityProfileStatusLine.classList.toggle("status-error", Boolean(error));
}

function normalizeReliabilitySettingsInput(input = {}, fallbackProfile = DEFAULT_RELIABILITY_PROFILE) {
  const source = input && typeof input === "object" ? input : {};
  const fallback = normalizeEnumValue(fallbackProfile, RELIABILITY_PROFILE_NAMES, DEFAULT_RELIABILITY_PROFILE);
  const profile = normalizeEnumValue(source.profile, RELIABILITY_PROFILE_NAMES, fallback);
  const defaults = RELIABILITY_PROFILES[profile] || RELIABILITY_PROFILES[fallback] || RELIABILITY_PROFILES.balanced;
  const minRetryDelayMs = clamp(parseNumber(source.minRetryDelayMs, defaults.minRetryDelayMs), 0, 120000);
  const maxRetryDelayMs = clamp(parseNumber(source.maxRetryDelayMs, defaults.maxRetryDelayMs), minRetryDelayMs, 120000);
  return {
    profile,
    backoffStrategy: normalizeEnumValue(source.backoffStrategy, BACKOFF_STRATEGIES, defaults.backoffStrategy),
    jitterMode: normalizeEnumValue(source.jitterMode, JITTER_MODES, defaults.jitterMode),
    minRetryDelayMs,
    maxRetryDelayMs,
    sessionReuseMode: normalizeEnumValue(source.sessionReuseMode, SESSION_REUSE_MODES, defaults.sessionReuseMode)
  };
}

function loadReliabilitySettingsFromStorage() {
  try {
    const raw = globalThis.localStorage?.getItem(RELIABILITY_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return normalizeReliabilitySettingsInput({
        profile: DEFAULT_RELIABILITY_PROFILE
      });
    }
    const parsed = JSON.parse(raw);
    return normalizeReliabilitySettingsInput(parsed, DEFAULT_RELIABILITY_PROFILE);
  } catch {
    return normalizeReliabilitySettingsInput({
      profile: DEFAULT_RELIABILITY_PROFILE
    });
  }
}

function saveReliabilitySettingsToStorage() {
  try {
    globalThis.localStorage?.setItem(
      RELIABILITY_SETTINGS_STORAGE_KEY,
      JSON.stringify(state.reliabilitySettings || normalizeReliabilitySettingsInput())
    );
  } catch {
    // ignore storage failures
  }
}

function applyReliabilitySettingsToControls(settings, { persist = true } = {}) {
  const normalized = normalizeReliabilitySettingsInput(settings, DEFAULT_RELIABILITY_PROFILE);
  elements.queueReliabilityProfile.value = normalized.profile;
  elements.queueBackoffStrategy.value = normalized.backoffStrategy;
  elements.queueJitterMode.value = normalized.jitterMode;
  elements.queueRetryMinDelayMs.value = String(normalized.minRetryDelayMs);
  elements.queueRetryMaxDelayMs.value = String(normalized.maxRetryDelayMs);
  elements.queueSessionReuseMode.value = normalized.sessionReuseMode;
  state.reliabilitySettings = normalized;
  if (persist) {
    saveReliabilitySettingsToStorage();
  }
  return normalized;
}

function readReliabilitySettingsFromControls() {
  return normalizeReliabilitySettingsInput(
    {
      profile: elements.queueReliabilityProfile.value,
      backoffStrategy: elements.queueBackoffStrategy.value,
      jitterMode: elements.queueJitterMode.value,
      minRetryDelayMs: elements.queueRetryMinDelayMs.value,
      maxRetryDelayMs: elements.queueRetryMaxDelayMs.value,
      sessionReuseMode: elements.queueSessionReuseMode.value
    },
    elements.queueReliabilityProfile.value || DEFAULT_RELIABILITY_PROFILE
  );
}

function syncReliabilitySettingsFromControls({ persist = true } = {}) {
  const normalized = readReliabilitySettingsFromControls();
  return applyReliabilitySettingsToControls(normalized, {
    persist
  });
}

function onReliabilityProfileSelected() {
  const profileName = normalizeEnumValue(
    elements.queueReliabilityProfile.value,
    RELIABILITY_PROFILE_NAMES,
    DEFAULT_RELIABILITY_PROFILE
  );
  if (profileName === "custom") {
    const custom = syncReliabilitySettingsFromControls({
      persist: true
    });
    setReliabilityProfileStatus(
      `Profile "${custom.profile}" using ${custom.backoffStrategy} backoff, ${custom.jitterMode} jitter`
    );
    return;
  }

  const defaults = RELIABILITY_PROFILES[profileName] || RELIABILITY_PROFILES.balanced;
  const normalized = applyReliabilitySettingsToControls(
    {
      profile: profileName,
      ...defaults
    },
    {
      persist: true
    }
  );
  setReliabilityProfileStatus(
    `Profile "${normalized.profile}" applied (${normalized.backoffStrategy}, ${normalized.jitterMode}, ${normalized.sessionReuseMode})`
  );
}

function onReliabilityControlChanged() {
  const currentProfile = normalizeEnumValue(
    elements.queueReliabilityProfile.value,
    RELIABILITY_PROFILE_NAMES,
    DEFAULT_RELIABILITY_PROFILE
  );
  if (currentProfile !== "custom") {
    elements.queueReliabilityProfile.value = "custom";
  }
  const normalized = syncReliabilitySettingsFromControls({
    persist: true
  });
  setReliabilityProfileStatus(
    `Profile "${normalized.profile}" saved (${normalized.backoffStrategy}, ${normalized.jitterMode}, ${normalized.sessionReuseMode})`
  );
}

function buildQueueReliabilityConfig() {
  const normalized = syncReliabilitySettingsFromControls({
    persist: true
  });
  return {
    profile: normalized.profile,
    backoffStrategy: normalized.backoffStrategy,
    jitterMode: normalized.jitterMode,
    minRetryDelayMs: normalized.minRetryDelayMs,
    maxRetryDelayMs: normalized.maxRetryDelayMs,
    sessionReuseMode: normalized.sessionReuseMode
  };
}

function applySimpleModeUi() {
  if (elements.simpleModeToggle) {
    elements.simpleModeToggle.checked = true;
    elements.simpleModeToggle.disabled = true;
    const toggleRow = elements.simpleModeToggle.closest("label");
    if (toggleRow) {
      toggleRow.style.display = "none";
    }
  }

  if (elements.simpleModeHint) {
    elements.simpleModeHint.textContent =
      "Simple mode active: type one command and run. Example: find home service businesses in Miami.";
  }

  const showAdvanced = !state.simpleMode;
  if (elements.runnerField) {
    elements.runnerField.style.display = showAdvanced ? "grid" : "none";
  }
  if (elements.selectedToolField) {
    elements.selectedToolField.style.display = showAdvanced ? "grid" : "none";
  }
  if (elements.openWelcomeBtn) {
    elements.openWelcomeBtn.style.display = showAdvanced ? "" : "none";
  }
  if (elements.automationActionsRow) {
    elements.automationActionsRow.style.display = showAdvanced ? "grid" : "none";
  }

  const isListRunner = String(elements.runnerType.value || "") === RUNNER_TYPES.LIST_EXTRACTOR;
  const showListAdvanced = isListRunner && showAdvanced;
  if (elements.listAdvancedControls) {
    elements.listAdvancedControls.style.display = showListAdvanced ? "grid" : "none";
  }
  if (elements.listConfigPanel) {
    elements.listConfigPanel.style.display = state.simpleMode ? "none" : isListRunner ? "grid" : "none";
  }
  if (elements.pageConfigPanel) {
    if (state.simpleMode) {
      elements.pageConfigPanel.style.display = "none";
    }
  }
  if (elements.queueAdvancedControls) {
    elements.queueAdvancedControls.style.display = showAdvanced ? "grid" : "none";
  }
  if (elements.pageUrlGeneratorPanel) {
    elements.pageUrlGeneratorPanel.style.display = showAdvanced ? "grid" : "none";
  }
  if (elements.pageRecoveryPanel) {
    elements.pageRecoveryPanel.style.display = showAdvanced ? "grid" : "none";
  }
  if (elements.activationPanel) {
    elements.activationPanel.style.display = showAdvanced ? "grid" : "none";
  }
  if (elements.cloudControlPanel) {
    elements.cloudControlPanel.style.display = showAdvanced ? "grid" : "none";
  }
  if (elements.templatesDiagnosticsPanel) {
    elements.templatesDiagnosticsPanel.style.display = showAdvanced ? "grid" : "none";
  }
  if (elements.tableAdvancedControls) {
    elements.tableAdvancedControls.style.display = showAdvanced ? "" : "none";
  }

  const exportUseFiltersRow = elements.exportUseCurrentFilters?.closest("label");
  if (exportUseFiltersRow) {
    exportUseFiltersRow.style.display = showAdvanced ? "" : "none";
  }
  if (elements.exportClipboardBtn) {
    elements.exportClipboardBtn.style.display = showAdvanced ? "" : "none";
  }
  if (elements.exportSheetsBtn) {
    elements.exportSheetsBtn.style.display = showAdvanced ? "" : "none";
  }

  if (state.simpleMode) {
    const imageOnlyTool = state.activeTool === "image";
    if (elements.dataTablePanel) {
      elements.dataTablePanel.style.display = imageOnlyTool ? "none" : "";
    }
    if (elements.exportPanel) {
      elements.exportPanel.style.display = imageOnlyTool ? "none" : "";
    }
    if (elements.imagePanel) {
      elements.imagePanel.style.display = imageOnlyTool ? "" : "none";
    }
  } else {
    if (elements.dataTablePanel) {
      elements.dataTablePanel.style.display = "";
    }
    if (elements.exportPanel) {
      elements.exportPanel.style.display = "";
    }
    if (elements.imagePanel) {
      elements.imagePanel.style.display = "";
    }
  }

  if (elements.quickExtractBtn) {
    elements.quickExtractBtn.classList.toggle("btn-primary", true);
  }
  if (elements.startBtn) {
    elements.startBtn.classList.toggle("btn-primary", false);
  }

  for (const button of elements.shellNavButtons || []) {
    const view = String(button.dataset.shellView || "").trim();
    const show = !state.simpleMode || SIMPLE_MODE_ALLOWED_VIEWS.has(view);
    button.style.display = show ? "" : "none";
  }
  if (state.simpleMode && !SIMPLE_MODE_ALLOWED_VIEWS.has(state.activeShellView)) {
    setShellView(SHELL_VIEWS.MENU);
  }
}

function onSimpleModeToggle() {
  state.simpleMode = true;
  if (elements.simpleModeToggle) {
    elements.simpleModeToggle.checked = true;
  }
  saveSimpleModeToStorage();
  applySimpleModeUi();
  trackUiEvent("simple_mode_toggled", {
    enabled: state.simpleMode
  });
}

function updateRunnerUi() {
  const runnerType = elements.runnerType.value;
  const isListRunner = runnerType === RUNNER_TYPES.LIST_EXTRACTOR;
  const isPageRunner = runnerType === RUNNER_TYPES.PAGE_EXTRACTOR;
  const isMetadataRunner = runnerType === RUNNER_TYPES.METADATA_EXTRACTOR;
  const showListAdvanced = isListRunner && !state.simpleMode;
  elements.listConfigPanel.style.display = isListRunner ? "grid" : "none";
  elements.speedProfileEditor.style.display = showListAdvanced ? "grid" : "none";
  if (elements.listAdvancedControls) {
    elements.listAdvancedControls.style.display = showListAdvanced ? "grid" : "none";
  }
  elements.pageConfigPanel.style.display = isPageRunner || isMetadataRunner ? "grid" : "none";
  elements.pageActionTypeField.style.display = isMetadataRunner ? "none" : "grid";
  applySimpleModeUi();
  updatePageActionUi();
}

function updatePageSourceUi() {
  const mode = String(elements.pageUrlSourceMode.value || URL_SOURCE_MODES.MANUAL).trim();
  elements.pageManualUrlsField.style.display = mode === URL_SOURCE_MODES.MANUAL ? "grid" : "none";
  elements.pageCsvField.style.display = mode === URL_SOURCE_MODES.CSV ? "grid" : "none";
  const showDatasource = mode === URL_SOURCE_MODES.DATASOURCE;
  elements.pageDatasourceField.style.display = showDatasource ? "grid" : "none";
  elements.pageDatasourceColumnRow.style.display = showDatasource ? "grid" : "none";
}

function updatePageActionUi() {
  const runnerType = elements.runnerType.value;
  const isMetadataRunner = runnerType === RUNNER_TYPES.METADATA_EXTRACTOR;
  const actionType = String(elements.pageActionType.value || PAGE_ACTION_TYPES.EXTRACT_PAGES).trim();
  const isCustomFieldMode = !isMetadataRunner && actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES;
  elements.pageFieldsPanel.style.display = isCustomFieldMode ? "grid" : "none";
  elements.pageEmailOptionsPanel.style.display =
    !isMetadataRunner && actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_EMAIL ? "grid" : "none";
  elements.pagePhoneOptionsPanel.style.display =
    !isMetadataRunner && actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_PHONE ? "grid" : "none";
  elements.pageTextOptionsPanel.style.display =
    !isMetadataRunner && actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_TEXT ? "grid" : "none";
  elements.pageMapsOptionsPanel.style.display =
    !isMetadataRunner && actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_GOOGLE_MAPS ? "grid" : "none";
  elements.metadataOptionsPanel.style.display = isMetadataRunner ? "grid" : "none";
  syncToolFromRunnerSelection();
}

function setResolvedUrlsPreview(urls) {
  const list = Array.isArray(urls) ? urls : [];
  elements.pageResolvedUrlsPreview.value = list.slice(0, 25).join("\n");
}

function setUrlGeneratorStatus(text, { error = false } = {}) {
  elements.urlgenStatusLine.textContent = String(text || "");
  elements.urlgenStatusLine.classList.toggle("status-error", Boolean(error));
}

function setPageRecoveryStatus(text, { error = false } = {}) {
  elements.pageRecoveryStatusLine.textContent = String(text || "");
  elements.pageRecoveryStatusLine.classList.toggle("status-error", Boolean(error));
}

function setTableStatus(text, { error = false } = {}) {
  elements.tableStatusLine.textContent = String(text || "");
  elements.tableStatusLine.classList.toggle("status-error", Boolean(error));
}

function setExportStatus(text, { error = false } = {}) {
  elements.exportStatusLine.textContent = String(text || "");
  elements.exportStatusLine.classList.toggle("status-error", Boolean(error));
}

function setImageStatus(text, { error = false } = {}) {
  elements.imageStatusLine.textContent = String(text || "");
  elements.imageStatusLine.classList.toggle("status-error", Boolean(error));
}

function setActivationStatus(text, { error = false } = {}) {
  elements.activationStatusLine.textContent = formatStatusErrorText(text, {
    error
  });
  elements.activationStatusLine.classList.toggle("status-error", Boolean(error));
}

function setRoadmapStatus(text, { error = false } = {}) {
  if (!elements.roadmapStatusLine) return;
  elements.roadmapStatusLine.textContent = String(text || "");
  elements.roadmapStatusLine.classList.toggle("status-error", Boolean(error));
}

function setCloudStatus(text, { error = false } = {}) {
  elements.cloudStatusLine.textContent = formatStatusErrorText(text, {
    cloud: true,
    error
  });
  elements.cloudStatusLine.classList.toggle("status-error", Boolean(error));
}

function setTemplatesStatus(text, { error = false } = {}) {
  elements.templatesStatusLine.textContent = String(text || "");
  elements.templatesStatusLine.classList.toggle("status-error", Boolean(error));
}

function loadTemplatesFromStorage() {
  try {
    const raw = globalThis.localStorage?.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => normalizeTemplateRecord(item))
      .slice(0, TEMPLATE_LIMIT);
  } catch {
    return [];
  }
}

function saveTemplatesToStorage() {
  try {
    globalThis.localStorage?.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(state.templates || []));
  } catch {
    // ignore storage write failures
  }
}

function renderTextLines(target, lines, emptyText) {
  target.innerHTML = "";
  if (!Array.isArray(lines) || lines.length === 0) {
    target.textContent = emptyText;
    return;
  }
  for (const line of lines) {
    const row = document.createElement("div");
    row.className = "field-meta";
    row.textContent = line;
    target.append(row);
  }
}

function summarizeJson(value, label = "payload") {
  try {
    return `${label}: ${JSON.stringify(value)}`;
  } catch {
    return `${label}: (unserializable)`;
  }
}

function renderIntegrationSecrets() {
  const lines = state.integrationSecrets.map((item) => {
    const provider = String(item.provider || "unknown");
    const secretName = String(item.secretName || "unknown");
    const updatedAt = formatRelativeTimestamp(item.updatedAt || item.createdAt);
    return `${provider}/${secretName} | ${item.label || "-"} | updated ${updatedAt}`;
  });
  renderTextLines(elements.integrationsList, lines, "No integration secrets loaded.");
}

function renderJobs(list, { deadLetter = false } = {}) {
  const rows = Array.isArray(list) ? list : [];
  const lines = rows.map((job) => {
    const id = String(job.id || "unknown");
    const status = String(job.status || (deadLetter ? "dead_letter" : "unknown"));
    const type = String(job.jobType || "unknown");
    const attempt = `${Number(job.attemptCount || 0)}/${Number(job.maxAttempts || 0)}`;
    return `${id} | ${status} | ${type} | attempts ${attempt}`;
  });
  renderTextLines(elements.jobsList, lines, deadLetter ? "No dead-letter jobs." : "No jobs loaded.");
}

function renderSchedules() {
  const lines = state.cloudSchedules.map((schedule) => {
    const id = String(schedule.id || "unknown");
    const mode = String(schedule.scheduleKind || "unknown");
    const active = schedule.isActive ? "active" : "paused";
    const nextRun = formatRelativeTimestamp(schedule.nextRunAt);
    return `${id} | ${mode} | ${active} | next ${nextRun}`;
  });
  renderTextLines(elements.scheduleList, lines, "No schedules loaded.");
}

function renderTemplates() {
  const previousSelection = String(elements.templateSelect.value || "").trim();
  elements.templateSelect.innerHTML = "";
  if (state.templates.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No saved templates";
    elements.templateSelect.append(option);
    applyTemplateMetaControls(null);
    elements.templateList.textContent = "No templates saved.";
    return;
  }

  for (const template of state.templates) {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = `${template.name} (${formatRelativeTimestamp(template.updatedAt)})`;
    elements.templateSelect.append(option);
  }

  if (previousSelection && state.templates.some((template) => template.id === previousSelection)) {
    elements.templateSelect.value = previousSelection;
  }
  const selectedTemplate = findSelectedTemplate() || state.templates[0];
  if (selectedTemplate) {
    elements.templateSelect.value = selectedTemplate.id;
    applyTemplateMetaControls(selectedTemplate);
  }

  const lines = state.templates.map((template) => {
    const runnerType = String(template.payload?.runnerType || "unknown");
    const domains = Array.isArray(template.sourceDomains) ? template.sourceDomains.join(",") : "";
    const schema = template.schemaLock?.enabled ? `schema:${template.schemaLock.columns.length}` : "schema:off";
    return `${template.id} | ${template.name} | ${runnerType} | ${schema} | domains=${domains || "-"} | ${template.notes || "-"}`;
  });
  renderTextLines(elements.templateList, lines, "No templates saved.");
}

function setObservabilityOutput(value) {
  let text = "";
  try {
    text = JSON.stringify(value, null, 2);
  } catch {
    text = String(value || "");
  }
  elements.obsOutput.textContent = text;
}

function setDiagnosticsOutput(value) {
  let text = "";
  try {
    text = JSON.stringify(value, null, 2);
  } catch {
    text = String(value || "");
  }
  elements.diagnosticsOutput.textContent = text;
}

function trackUiEvent(eventName, payload = {}) {
  appendLog(`ui:${eventName}`, payload);
}

function loadWelcomeVisits() {
  try {
    const raw = globalThis.localStorage?.getItem(WELCOME_VISITS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, Math.max(0, Number(value) || 0)])
    );
  } catch {
    return {};
  }
}

function saveWelcomeVisits() {
  try {
    globalThis.localStorage?.setItem(WELCOME_VISITS_STORAGE_KEY, JSON.stringify(state.welcomeVisits || {}));
  } catch {
    // no-op: localStorage may be unavailable in some contexts
  }
}

function loadSimpleModeFromStorage() {
  try {
    const raw = globalThis.localStorage?.getItem(SIMPLE_MODE_STORAGE_KEY);
    if (raw === null || raw === undefined || raw === "") return true;
    return raw !== "false";
  } catch {
    return true;
  }
}

function saveSimpleModeToStorage() {
  try {
    globalThis.localStorage?.setItem(SIMPLE_MODE_STORAGE_KEY, state.simpleMode ? "true" : "false");
  } catch {
    // no-op: localStorage may be unavailable in some contexts
  }
}

function normalizeDomainHintHostKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const normalized = raw.replace(/^www\./, "").replace(/\.+$/, "");
  if (!/^[a-z0-9.-]+$/.test(normalized)) return "";
  return normalized;
}

function normalizeDomainHintHostFromUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!/^https?:$/i.test(parsed.protocol)) return "";
    return normalizeDomainHintHostKey(parsed.hostname);
  } catch {
    return "";
  }
}

function normalizeDomainHintRecord(input, { nowMs = Date.now() } = {}) {
  const source = input && typeof input === "object" ? input : {};
  const strategy = String(source.strategy || "").trim();
  if (!DOMAIN_HINT_ALLOWED_STRATEGIES.has(strategy)) return null;
  const updatedAtFromMs = Number(source.updatedAtMs);
  const updatedAtFromIso = Date.parse(String(source.updatedAt || "").trim());
  const updatedAtMs = Number.isFinite(updatedAtFromMs)
    ? Math.floor(updatedAtFromMs)
    : Number.isFinite(updatedAtFromIso)
      ? Math.floor(updatedAtFromIso)
      : nowMs;
  const boundedUpdatedAtMs = clamp(updatedAtMs, 0, nowMs + DOMAIN_AUTONOMY_HINT_TTL_MS);
  const ageMs = nowMs - boundedUpdatedAtMs;
  if (ageMs > DOMAIN_AUTONOMY_HINT_TTL_MS) return null;
  return {
    strategy,
    reason: String(source.reason || "").trim().slice(0, 180),
    updatedAtMs: boundedUpdatedAtMs
  };
}

function normalizeDomainAutonomyHintsMap(input, { nowMs = Date.now() } = {}) {
  const source = input && typeof input === "object" ? input : {};
  const output = {};
  for (const [key, value] of Object.entries(source)) {
    const host = normalizeDomainHintHostKey(key);
    if (!host) continue;
    const record = normalizeDomainHintRecord(value, {
      nowMs
    });
    if (!record) continue;
    output[host] = record;
  }
  return output;
}

function loadDomainAutonomyHintsFromStorage() {
  try {
    const raw = globalThis.localStorage?.getItem(DOMAIN_AUTONOMY_HINTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return normalizeDomainAutonomyHintsMap(parsed);
  } catch {
    return {};
  }
}

function saveDomainAutonomyHintsToStorage() {
  try {
    const normalized = normalizeDomainAutonomyHintsMap(state.domainAutonomyHints || {});
    state.domainAutonomyHints = normalized;
    globalThis.localStorage?.setItem(DOMAIN_AUTONOMY_HINTS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // no-op: localStorage may be unavailable in some contexts
  }
}

function resolveDomainAutonomyHintHost(...urlCandidates) {
  for (const candidate of urlCandidates) {
    const host = normalizeDomainHintHostFromUrl(candidate);
    if (host) return host;
  }
  return "";
}

function getDomainAutonomyHintForHost(host, { persistCleanup = true } = {}) {
  const normalizedHost = normalizeDomainHintHostKey(host);
  if (!normalizedHost) return null;
  const current = state.domainAutonomyHints?.[normalizedHost];
  const normalizedRecord = normalizeDomainHintRecord(current);
  if (!normalizedRecord) {
    if (current) {
      const next = {
        ...(state.domainAutonomyHints || {})
      };
      delete next[normalizedHost];
      state.domainAutonomyHints = next;
      if (persistCleanup) {
        saveDomainAutonomyHintsToStorage();
      }
    }
    return null;
  }

  const changed =
    !current ||
    String(current.strategy || "").trim() !== normalizedRecord.strategy ||
    String(current.reason || "").trim() !== normalizedRecord.reason ||
    Number(current.updatedAtMs || 0) !== normalizedRecord.updatedAtMs;
  if (changed) {
    state.domainAutonomyHints = {
      ...(state.domainAutonomyHints || {}),
      [normalizedHost]: normalizedRecord
    };
    if (persistCleanup) {
      saveDomainAutonomyHintsToStorage();
    }
  }
  return {
    host: normalizedHost,
    ...normalizedRecord
  };
}

function applyDomainAutonomyHintToPlan(plan, { startUrl = "", activeUrl = "" } = {}) {
  const currentPlan = plan && typeof plan === "object" ? plan : null;
  if (!currentPlan) {
    return {
      plan: currentPlan,
      applied: false,
      host: "",
      hint: null
    };
  }
  if (String(currentPlan.strategy || "").trim() !== ORCHESTRATION_STRATEGIES.LIST_AUTODETECT_AUTOPILOT) {
    return {
      plan: currentPlan,
      applied: false,
      host: "",
      hint: null
    };
  }

  const host = resolveDomainAutonomyHintHost(currentPlan.targetUrl, startUrl, activeUrl, currentPlan.discoveredUrl);
  if (!host) {
    return {
      plan: currentPlan,
      applied: false,
      host: "",
      hint: null
    };
  }

  const hint = getDomainAutonomyHintForHost(host, {
    persistCleanup: true
  });
  if (!hint || hint.strategy !== ORCHESTRATION_STRATEGIES.POINT_FOLLOW_GUIDED) {
    return {
      plan: currentPlan,
      applied: false,
      host,
      hint
    };
  }

  const targetUrl = String(currentPlan.targetUrl || "").trim();
  const nextPlan = {
    ...currentPlan,
    strategy: ORCHESTRATION_STRATEGIES.POINT_FOLLOW_GUIDED,
    shouldNavigateActiveTab: Boolean(targetUrl) && targetUrl !== String(activeUrl || "").trim(),
    domainHintApplied: true,
    domainHintHost: host,
    domainHintReason: String(hint.reason || "").trim()
  };
  return {
    plan: nextPlan,
    applied: true,
    host,
    hint
  };
}

function rememberDomainAutonomyHint(strategy, { reason = "", urlCandidates = [] } = {}) {
  const strategyValue = String(strategy || "").trim();
  if (!DOMAIN_HINT_ALLOWED_STRATEGIES.has(strategyValue)) {
    return {
      saved: false,
      changed: false,
      host: ""
    };
  }

  const candidates = Array.isArray(urlCandidates) ? urlCandidates : [urlCandidates];
  const host = resolveDomainAutonomyHintHost(...candidates);
  if (!host) {
    return {
      saved: false,
      changed: false,
      host: ""
    };
  }

  const previous = getDomainAutonomyHintForHost(host, {
    persistCleanup: false
  });
  const nextRecord = {
    strategy: strategyValue,
    reason: String(reason || "").trim().slice(0, 180),
    updatedAtMs: Date.now()
  };
  state.domainAutonomyHints = {
    ...(state.domainAutonomyHints || {}),
    [host]: nextRecord
  };
  saveDomainAutonomyHintsToStorage();

  const changed =
    !previous || previous.strategy !== nextRecord.strategy || String(previous.reason || "").trim() !== nextRecord.reason;
  if (changed) {
    appendLog("domain autonomy hint updated", {
      host,
      strategy: nextRecord.strategy,
      reason: nextRecord.reason
    });
    trackUiEvent("domain_autonomy_hint_updated", {
      host,
      strategy: nextRecord.strategy,
      reason: nextRecord.reason
    });
  }

  return {
    saved: true,
    changed,
    host
  };
}

function normalizeShellView(value) {
  const next = String(value || "").trim();
  if (Object.values(SHELL_VIEWS).includes(next)) return next;
  return SHELL_VIEWS.MENU;
}

function setShellView(view) {
  const normalized = normalizeShellView(view);
  const next = state.simpleMode && !SIMPLE_MODE_ALLOWED_VIEWS.has(normalized) ? SHELL_VIEWS.MENU : normalized;
  state.activeShellView = next;

  for (const button of elements.shellNavButtons) {
    button.classList.toggle("is-active", String(button.dataset.shellView || "") === next);
  }

  for (const panel of elements.appViewPanels) {
    const allowedViews = String(panel.dataset.views || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    panel.hidden = !allowedViews.includes(next);
  }

  updateWelcomeVisibility();
}

function getToolPreset(toolId) {
  const key = String(toolId || "").trim();
  return TOOL_PRESETS[key] || TOOL_PRESETS.list;
}

function setToolHeadingText(label) {
  const text = String(label || "LIST EXTRACTOR");
  if (elements.activeToolHeading) {
    elements.activeToolHeading.textContent = text;
  }
  if (elements.selectedToolName) {
    elements.selectedToolName.value = text;
  }
}

function renderToolCardState() {
  for (const card of elements.toolCards) {
    const toolId = String(card.dataset.tool || "").trim();
    card.classList.toggle("is-active", toolId === state.activeTool);
  }
}

function renderWelcomeLists(container, lines) {
  container.innerHTML = "";
  for (const line of lines) {
    const item = document.createElement("li");
    item.textContent = line;
    container.append(item);
  }
}

function renderWelcomeCard(toolId) {
  const preset = getToolPreset(toolId);
  elements.toolWelcomeLabel.textContent = preset.label;
  elements.toolWelcomeTitle.textContent = preset.title;
  elements.toolWelcomeSubtitle.textContent = preset.subtitle;
  elements.toolWelcomeVideoLabel.textContent = preset.videoLabel;

  renderWelcomeLists(elements.toolWelcomeBenefits, Array.isArray(preset.benefits) ? preset.benefits : []);
  renderWelcomeLists(elements.toolWelcomeSteps, Array.isArray(preset.quickStart) ? preset.quickStart : []);

  const extraLines = Array.isArray(preset.extraLines) ? preset.extraLines : [];
  elements.toolWelcomeExtra.innerHTML = "";
  if (extraLines.length > 0) {
    const list = document.createElement("ul");
    list.className = "roadmap-list";
    for (const line of extraLines) {
      const item = document.createElement("li");
      item.textContent = line;
      list.append(item);
    }
    elements.toolWelcomeExtra.classList.add("is-visible");
    elements.toolWelcomeExtra.append(list);
  } else {
    elements.toolWelcomeExtra.classList.remove("is-visible");
  }
}

function getWelcomeVisitCount(toolId) {
  return Math.max(0, Number(state.welcomeVisits?.[toolId] || 0));
}

function shouldShowWelcome(toolId) {
  if (state.showWelcomeOverride) return true;
  if (state.dismissedWelcomeTools.has(toolId)) return false;
  return getWelcomeVisitCount(toolId) < WELCOME_VISIT_LIMIT;
}

function registerWelcomeShown(toolId) {
  if (state.showWelcomeOverride) return;
  if (state.sessionWelcomeCounted.has(toolId)) return;
  const current = getWelcomeVisitCount(toolId);
  if (current >= WELCOME_VISIT_LIMIT) return;
  const next = current + 1;
  state.welcomeVisits[toolId] = next;
  state.sessionWelcomeCounted.add(toolId);
  saveWelcomeVisits();
  trackUiEvent("welcome_shown", {
    toolId,
    visitCount: next
  });
}

function updateWelcomeVisibility() {
  const toolId = state.activeTool;
  renderWelcomeCard(toolId);
  setToolHeadingText(getToolPreset(toolId).label);
  renderToolCardState();

  if (state.simpleMode) {
    if (elements.toolWelcomePanel) {
      elements.toolWelcomePanel.hidden = true;
    }
    return;
  }

  const welcomeViews = String(elements.toolWelcomePanel?.dataset.views || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const inActiveView = welcomeViews.includes(state.activeShellView);
  if (!inActiveView) {
    elements.toolWelcomePanel.hidden = true;
    return;
  }

  if (state.activeShellView === SHELL_VIEWS.DATA && state.activeTool !== "image") {
    elements.toolWelcomePanel.hidden = true;
    return;
  }

  const show = shouldShowWelcome(toolId);
  elements.toolWelcomePanel.hidden = !show;
  if (show) {
    registerWelcomeShown(toolId);
  }
}

function setRunnerTypeIfAvailable(runnerType) {
  const target = String(runnerType || "").trim();
  if (!target) return;
  const hasOption = Array.from(elements.runnerType.options).some((option) => option.value === target);
  if (!hasOption) return;
  elements.runnerType.value = target;
}

function applyToolPreset(toolId, { navigate = true, forceWelcome = false, track = false } = {}) {
  const key = TOOL_PRESETS[toolId] ? toolId : "list";
  const preset = getToolPreset(key);
  state.activeTool = key;
  state.showWelcomeOverride = Boolean(forceWelcome);

  if (preset.runnerType) {
    setRunnerTypeIfAvailable(preset.runnerType);
  }
  if (preset.actionType) {
    elements.pageActionType.value = preset.actionType;
  }
  updateRunnerUi();

  if (navigate) {
    setShellView(preset.shellView || SHELL_VIEWS.TOOLS);
  } else {
    updateWelcomeVisibility();
  }

  if (track) {
    trackUiEvent("quick_start_opened", {
      toolId: key
    });
  }
}

function inferToolFromRunnerSelection() {
  const runnerType = String(elements.runnerType.value || "").trim();
  if (runnerType === RUNNER_TYPES.LIST_EXTRACTOR) return "list";
  if (runnerType === RUNNER_TYPES.PAGE_EXTRACTOR) {
    const actionType = String(elements.pageActionType.value || PAGE_ACTION_TYPES.EXTRACT_PAGES).trim();
    if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_EMAIL) return "email";
    if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_TEXT) return "text";
    return "page_details";
  }
  if (runnerType === RUNNER_TYPES.METADATA_EXTRACTOR) return "text";
  return state.activeTool || "list";
}

function syncToolFromRunnerSelection() {
  if (state.activeTool === "image") return;
  const inferredTool = inferToolFromRunnerSelection();
  if (!inferredTool || inferredTool === state.activeTool) return;
  state.activeTool = inferredTool;
  state.showWelcomeOverride = false;
  updateWelcomeVisibility();
}

function dismissWelcomeForActiveTool() {
  state.dismissedWelcomeTools.add(state.activeTool);
  state.showWelcomeOverride = false;
  updateWelcomeVisibility();
}

function showWelcomeForActiveTool() {
  state.dismissedWelcomeTools.delete(state.activeTool);
  state.showWelcomeOverride = true;
  updateWelcomeVisibility();
}

function onRoadmapNotify(cardKey) {
  const key = String(cardKey || "").trim().toLowerCase();
  const targetUrl = ROADMAP_NOTIFY_URLS[key];
  if (!targetUrl) {
    setRoadmapStatus("Roadmap notify target is not configured", {
      error: true
    });
    return;
  }

  trackUiEvent("roadmap_notify_clicked", {
    card: key,
    url: targetUrl
  });
  const opened = globalThis.open(targetUrl, "_blank", "noopener,noreferrer");
  if (opened) {
    setRoadmapStatus(`Notify form opened for ${key}`);
    return;
  }
  setRoadmapStatus(`Unable to open notify form for ${key}`, {
    error: true
  });
}

function renderExportTableOptions(items, preferredValue = "") {
  const list = Array.isArray(items) ? items : [];
  const preferred = String(preferredValue || elements.exportTableSelect.value || "").trim();
  elements.exportTableSelect.innerHTML = "";

  if (list.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No tables available";
    elements.exportTableSelect.append(option);
    return;
  }

  for (const item of list) {
    const tableDataId = String(item?.tableDataId || "").trim();
    if (!tableDataId) continue;
    const option = document.createElement("option");
    option.value = tableDataId;
    option.textContent = `${tableDataId.slice(0, 8)}... (${Number(item?.rowCount || 0)} rows)`;
    elements.exportTableSelect.append(option);
  }

  if (preferred && list.some((item) => String(item?.tableDataId || "").trim() === preferred)) {
    elements.exportTableSelect.value = preferred;
  }
}

function getSelectedExportTableDataId() {
  return String(elements.exportTableSelect.value || "").trim();
}

function buildExportFilterPayload() {
  if (!elements.exportUseCurrentFilters.checked) {
    return {
      search: "",
      filterColumn: "",
      filterValue: "",
      limit: 20000
    };
  }
  return {
    search: String(elements.tableSearch.value || "").trim(),
    filterColumn: String(elements.tableFilterColumn.value || "").trim(),
    filterValue: String(elements.tableFilterValue.value || "").trim(),
    limit: parseTableLimit()
  };
}

function callChromePermissions(method, details, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = Number.isFinite(timeoutMs) && timeoutMs > 0
      ? setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error("Permission API timeout"));
        }, timeoutMs)
      : null;
    chrome.permissions[method](details, (result) => {
      if (settled) return;
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message || "Permission API failed"));
        return;
      }
      resolve(Boolean(result));
    });
  });
}

async function ensureClipboardPermission() {
  if (!chrome.permissions) return true;
  const details = {
    permissions: ["clipboardWrite"]
  };
  const hasAccess = await callChromePermissions("contains", details).catch(() => false);
  if (hasAccess) return true;
  return callChromePermissions("request", details);
}

function normalizePermissionRequest({ origins = [], permissions = [] } = {}) {
  const normalizedOrigins = Array.from(
    new Set((Array.isArray(origins) ? origins : []).map((value) => String(value || "").trim()).filter(Boolean))
  );
  const normalizedPermissions = Array.from(
    new Set((Array.isArray(permissions) ? permissions : []).map((value) => String(value || "").trim()).filter(Boolean))
  );
  const details = {};
  if (normalizedOrigins.length > 0) {
    details.origins = normalizedOrigins;
  }
  if (normalizedPermissions.length > 0) {
    details.permissions = normalizedPermissions;
  }
  return {
    origins: normalizedOrigins,
    permissions: normalizedPermissions,
    details,
    hasRequest: normalizedOrigins.length > 0 || normalizedPermissions.length > 0
  };
}

async function containsPermissionRequest(request) {
  if (!request?.hasRequest || !chrome.permissions) {
    return {
      granted: !request?.hasRequest,
      skipped: true,
      error: ""
    };
  }
  let errorText = "";
  const granted = await callChromePermissions("contains", request.details).catch((error) => {
    errorText = error?.message || "Permission check failed";
    return false;
  });
  return {
    granted: Boolean(granted),
    skipped: false,
    error: errorText
  };
}

async function requestPermissionRequest(request) {
  if (!request?.hasRequest || !chrome.permissions) {
    return {
      granted: !request?.hasRequest,
      skipped: true,
      error: ""
    };
  }
  let errorText = "";
  const granted = await callChromePermissions("request", request.details).catch((error) => {
    errorText = error?.message || "Permission request failed";
    return false;
  });
  return {
    granted: Boolean(granted),
    skipped: false,
    error: errorText
  };
}

function setSetupAccessStatus(text, { error = false } = {}) {
  if (!elements.setupAccessStatusLine) return;
  elements.setupAccessStatusLine.textContent = formatStatusErrorText(text, {
    cloud: true,
    error
  });
  elements.setupAccessStatusLine.classList.toggle("status-error", Boolean(error));
}

function toOriginPattern(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!/^https?:$/i.test(parsed.protocol)) return "";
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch {
    return "";
  }
}

function hasManifestAllHostAccess() {
  try {
    const manifest = chrome.runtime?.getManifest?.();
    const hostPermissions = Array.isArray(manifest?.host_permissions) ? manifest.host_permissions : [];
    return hostPermissions.some((pattern) => String(pattern || "").trim() === "<all_urls>");
  } catch {
    return false;
  }
}

async function getActiveTabUrl() {
  if (!chrome.tabs?.query) return "";
  return new Promise((resolve) => {
    chrome.tabs.query(
      {
        active: true,
        currentWindow: true
      },
      (tabs) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          resolve("");
          return;
        }
        const url = String(tabs?.[0]?.url || "").trim();
        resolve(url);
      }
    );
  });
}

async function maybeHydrateStartUrlFromActiveTab({ force = false } = {}) {
  const current = String(elements.startUrl.value || "").trim();
  if (!force && current) {
    return current;
  }
  const activeUrl = await getActiveTabUrl();
  const pattern = toOriginPattern(activeUrl);
  if (!pattern) return current;
  elements.startUrl.value = activeUrl;
  return activeUrl;
}

function waitForUi(ms) {
  const waitMs = Math.max(0, Math.floor(Number(ms) || 0));
  if (waitMs <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, waitMs));
}

async function getActiveTabMeta() {
  if (!chrome.tabs?.query) {
    return {
      id: null,
      url: ""
    };
  }
  return new Promise((resolve) => {
    chrome.tabs.query(
      {
        active: true,
        currentWindow: true
      },
      (tabs) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          resolve({
            id: null,
            url: ""
          });
          return;
        }
        resolve({
          id: Number.isFinite(Number(tabs?.[0]?.id)) ? Number(tabs[0].id) : null,
          url: String(tabs?.[0]?.url || "").trim()
        });
      }
    );
  });
}

async function navigateActiveTabToUrl(targetUrl) {
  const nextUrl = String(targetUrl || "").trim();
  if (!nextUrl) {
    return {
      ok: false,
      reason: "Target URL is empty"
    };
  }
  if (!/^https?:\/\//i.test(nextUrl)) {
    return {
      ok: false,
      reason: "Target URL must be http/https"
    };
  }
  if (!chrome.tabs?.update) {
    return {
      ok: false,
      reason: "chrome.tabs.update unavailable"
    };
  }

  const activeTab = await getActiveTabMeta();
  if (!Number.isFinite(activeTab.id)) {
    return {
      ok: false,
      reason: "No active tab found"
    };
  }

  return new Promise((resolve) => {
    chrome.tabs.update(
      activeTab.id,
      {
        url: nextUrl,
        active: true
      },
      (_tab) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          resolve({
            ok: false,
            reason: lastError.message || "Failed to navigate active tab"
          });
          return;
        }
        resolve({
          ok: true
        });
      }
    );
  });
}

function setOrchestrationPhase(plan, phaseId, statusText) {
  const phases = Array.isArray(plan?.phases) ? plan.phases : [];
  const matched = phases.find((phase) => String(phase?.id || "").trim() === String(phaseId || "").trim());
  const progress = Number.isFinite(Number(matched?.progress)) ? Number(matched.progress) : state.statusProgressPct;
  const phaseLabel = String(matched?.label || statusText || "").trim();
  if (phaseLabel) {
    setStatusProgress(progress, {
      phase: phaseLabel
    });
  }
  if (statusText) {
    setListAutoDetectStatus(statusText);
  }
}

function cacheOrchestrationPlan(plan) {
  state.lastOrchestrationPlan = plan || null;
  state.lastOrchestrationAt = new Date().toISOString();
  if (!plan) return;
  appendLog("autonomous plan", {
    strategy: plan.strategy,
    targetUrl: plan.targetUrl,
    discoveredUrl: plan.discoveredUrl,
    shouldNavigateActiveTab: plan.shouldNavigateActiveTab,
    summary: summarizeAutonomousPlan(plan)
  });
}

async function onSetupAccess({
  includeApi = false,
  includeDownloads = false,
  includeClipboard = false,
  silent = false,
  preferFullHostAccess = false
} = {}) {
  if (!silent) {
    setSetupAccessStatus("Checking browser access...");
  }
  let startUrl = String(elements.startUrl.value || "").trim();
  if (!startUrl && !preferFullHostAccess) {
    startUrl = await maybeHydrateStartUrlFromActiveTab({
      force: false
    });
  }
  const apiBaseUrl = String(elements.activationApiBase.value || "").trim();
  const builtInAllHostAccess = hasManifestAllHostAccess();

  const requestedOrigins = preferFullHostAccess
    ? ["<all_urls>"]
    : Array.from(new Set([toOriginPattern(startUrl), includeApi ? toOriginPattern(apiBaseUrl) : ""].filter(Boolean)));
  const originPatterns = requestedOrigins.length > 0 ? requestedOrigins : builtInAllHostAccess ? ["<all_urls>"] : [];
  const optionalPermissionList = Array.from(
    new Set([includeDownloads ? "downloads" : "", includeClipboard ? "clipboardWrite" : ""].filter(Boolean))
  );

  if (originPatterns.length === 0) {
    if (!silent) {
      setSetupAccessStatus("Open a normal website tab first, then click Enable All Access.", {
        error: true
      });
    }
    return {
      ok: false,
      hostGranted: 0,
      hostDenied: 1,
      hostRequested: preferFullHostAccess ? 1 : 0,
      optionalDenied: 0,
      fullHostAccess: false
    };
  }

  const hostRequest = normalizePermissionRequest({
    origins: originPatterns
  });
  const optionalRequest = normalizePermissionRequest({
    permissions: optionalPermissionList
  });

  let hostState = builtInAllHostAccess
    ? {
        granted: true,
        skipped: true,
        error: ""
      }
    : await containsPermissionRequest(hostRequest);
  let optionalState =
    optionalPermissionList.length > 0
      ? await containsPermissionRequest(optionalRequest)
      : {
          granted: true,
          skipped: true,
          error: ""
        };

  const missingRequest = normalizePermissionRequest({
    origins: builtInAllHostAccess || hostState.granted ? [] : originPatterns,
    permissions: optionalState.granted ? [] : optionalPermissionList
  });
  let requestErrorText = "";

  if (missingRequest.hasRequest) {
    const requested = await requestPermissionRequest(missingRequest);
    if (!requested.granted && requested.error) {
        requestErrorText = requested.error;
    }
    hostState = builtInAllHostAccess
      ? {
          granted: true,
          skipped: true,
          error: ""
        }
      : await containsPermissionRequest(hostRequest);
    optionalState =
      optionalPermissionList.length > 0
        ? await containsPermissionRequest(optionalRequest)
        : {
            granted: true,
            skipped: true,
            error: ""
          };
  }

  const hostGranted = hostState.granted ? originPatterns.length : 0;
  const hostDenied = originPatterns.length - hostGranted;
  const optionalDenied = optionalPermissionList.length > 0 && !optionalState.granted ? optionalPermissionList.length : 0;
  const ok = hostGranted > 0 && hostDenied === 0;

  if (!silent) {
    if (ok) {
      if (optionalDenied > 0) {
        setSetupAccessStatus("Site access ready. Optional export permissions were skipped.");
      } else if (builtInAllHostAccess) {
        setSetupAccessStatus("Access ready: all-site host access is already enabled.");
      } else if (preferFullHostAccess) {
        setSetupAccessStatus("Access ready: full-site permission granted.");
      } else {
        setSetupAccessStatus("Access ready for this site.");
      }
    } else {
      const suffix = requestErrorText ? ` (${friendlyErrorText(requestErrorText)})` : "";
      setSetupAccessStatus(`Access setup incomplete. Click Enable All Access and approve browser permission.${suffix}`, {
        error: true
      });
    }
  }

  return {
    ok,
    hostGranted,
    hostDenied,
    hostRequested: originPatterns.length,
    optionalDenied,
    fullHostAccess: preferFullHostAccess && ok,
    builtInHostAccess: builtInAllHostAccess
  };
}

function getSelectedTableDataId() {
  return String(elements.tableHistorySelect.value || "").trim();
}

function parseTableLimit() {
  return clamp(parseNumber(elements.tableLimit.value, 300), 20, 2000);
}

function renderTableHistoryOptions(items, preferredTableDataId = "") {
  const list = Array.isArray(items) ? items : [];
  const preferred = String(preferredTableDataId || "").trim();
  const current = getSelectedTableDataId();
  const desired = preferred || current || String(state.activeTableDataId || "");

  elements.tableHistorySelect.innerHTML = "";
  if (list.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No table history yet";
    elements.tableHistorySelect.append(option);
    state.activeTableDataId = null;
    return;
  }

  for (const item of list) {
    const tableDataId = String(item?.tableDataId || "").trim();
    if (!tableDataId) continue;
    const option = document.createElement("option");
    option.value = tableDataId;
    const runner = String(item?.runnerType || "unknown");
    const rowCount = Number(item?.rowCount || 0);
    const updatedAt = formatRelativeTimestamp(item?.updatedAt || item?.createdAt);
    option.textContent = `${tableDataId.slice(0, 8)}... | ${runner} | rows ${rowCount} | ${updatedAt}`;
    elements.tableHistorySelect.append(option);
  }

  const hasDesired = list.some((item) => String(item?.tableDataId || "").trim() === desired);
  if (hasDesired) {
    elements.tableHistorySelect.value = desired;
  } else {
    const fallbackTableDataId = String(list[0]?.tableDataId || "").trim();
    if (fallbackTableDataId) {
      elements.tableHistorySelect.value = fallbackTableDataId;
    }
  }
  state.activeTableDataId = getSelectedTableDataId() || String(list[0]?.tableDataId || "").trim() || null;
}

function resolveCurrentTableDataId() {
  const selected = getSelectedTableDataId();
  if (selected) return selected;

  const active = String(state.activeTableDataId || "").trim();
  if (active) {
    elements.tableHistorySelect.value = active;
    return active;
  }

  const optionFallback = String(elements.tableHistorySelect?.options?.[0]?.value || "").trim();
  if (optionFallback) {
    elements.tableHistorySelect.value = optionFallback;
    return optionFallback;
  }

  const historyFallback = String(state.tableHistory?.[0]?.tableDataId || "").trim();
  if (historyFallback) {
    elements.tableHistorySelect.value = historyFallback;
    return historyFallback;
  }

  return "";
}

function renderTableColumnOptions(columns) {
  const list = Array.isArray(columns) ? columns : [];
  const filterValue = String(elements.tableFilterColumn.value || "").trim();
  const renameValue = String(elements.tableRenameFrom.value || "").trim();
  const mergeValues = new Set(
    Array.from(elements.tableMergeColumns?.selectedOptions || []).map((option) => String(option.value || "").trim())
  );
  state.tableColumns = list;

  elements.tableFilterColumn.innerHTML = "";
  const allColumnsOption = document.createElement("option");
  allColumnsOption.value = "";
  allColumnsOption.textContent = "All columns";
  elements.tableFilterColumn.append(allColumnsOption);

  elements.tableRenameFrom.innerHTML = "";
  const renamePlaceholder = document.createElement("option");
  renamePlaceholder.value = "";
  renamePlaceholder.textContent = "Select column";
  elements.tableRenameFrom.append(renamePlaceholder);
  elements.tableMergeColumns.innerHTML = "";

  for (const columnName of list) {
    const filterOption = document.createElement("option");
    filterOption.value = columnName;
    filterOption.textContent = columnName;
    elements.tableFilterColumn.append(filterOption);

    const renameOption = document.createElement("option");
    renameOption.value = columnName;
    renameOption.textContent = columnName;
    elements.tableRenameFrom.append(renameOption);

    const mergeOption = document.createElement("option");
    mergeOption.value = columnName;
    mergeOption.textContent = columnName;
    if (mergeValues.has(columnName)) {
      mergeOption.selected = true;
    }
    elements.tableMergeColumns.append(mergeOption);
  }

  if (list.includes(filterValue)) {
    elements.tableFilterColumn.value = filterValue;
  }
  if (list.includes(renameValue)) {
    elements.tableRenameFrom.value = renameValue;
  }
}

async function onTableCellBlur(cell) {
  if (!(cell instanceof HTMLElement)) return;

  const tableDataId = String(state.activeTableDataId || "").trim();
  const dedupeKey = String(cell.dataset.rowKey || "").trim();
  const columnName = String(cell.dataset.columnName || "").trim();
  if (!tableDataId || !dedupeKey || !columnName) return;

  const previousValue = toCellText(cell.dataset.value || "");
  const nextValue = toCellText(cell.textContent || "");
  if (nextValue === previousValue || cell.dataset.saving === "1") return;

  cell.dataset.saving = "1";
  cell.style.opacity = "0.6";
  try {
    const response = await sendMessage(MESSAGE_TYPES.TABLE_UPDATE_CELL_REQUEST, {
      tableDataId,
      dedupeKey,
      columnName,
      value: nextValue
    });
    const committedValue = toCellText(response?.rowData?.[columnName] ?? nextValue);
    cell.textContent = committedValue;
    cell.dataset.value = committedValue;

    const targetRow = state.tableRows.find((item) => item?.dedupeKey === dedupeKey);
    if (targetRow) {
      targetRow.rowData = {
        ...(targetRow.rowData || {}),
        [columnName]: committedValue
      };
      targetRow.updatedAt = response?.updatedAt || new Date().toISOString();
    }

    setTableStatus(`Saved cell: ${columnName}`);
  } catch (error) {
    cell.textContent = previousValue;
    setTableStatus(`Cell update failed: ${error.message}`, {
      error: true
    });
    appendLog("table cell update failed", {
      tableDataId,
      dedupeKey,
      columnName,
      message: error.message
    });
  } finally {
    delete cell.dataset.saving;
    cell.style.opacity = "";
  }
}

function renderTableGrid(rows, columns) {
  const dataRows = Array.isArray(rows) ? rows : [];
  const dataColumns = Array.isArray(columns) ? columns : [];
  elements.tableGrid.innerHTML = "";

  if (dataRows.length === 0 || dataColumns.length === 0) {
    elements.tableGrid.className = "table-grid-empty";
    elements.tableGrid.textContent = "No rows found for this table and filter.";
    return;
  }

  elements.tableGrid.className = "";
  const table = document.createElement("table");
  table.className = "table-grid-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const indexHead = document.createElement("th");
  indexHead.textContent = "#";
  headRow.append(indexHead);
  for (const columnName of dataColumns) {
    const th = document.createElement("th");
    th.textContent = columnName;
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  dataRows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    if (row?.sourceUrl) {
      tr.title = `source: ${row.sourceUrl}`;
    }

    const indexCell = document.createElement("td");
    indexCell.className = "table-grid-meta";
    indexCell.textContent = String(rowIndex + 1);
    tr.append(indexCell);

    for (const columnName of dataColumns) {
      const td = document.createElement("td");
      td.className = "table-grid-cell";
      td.contentEditable = "true";
      td.spellcheck = false;
      const cellValue = toCellText(row?.rowData?.[columnName]);
      td.textContent = cellValue;
      td.dataset.value = cellValue;
      td.dataset.rowKey = String(row?.dedupeKey || "");
      td.dataset.columnName = columnName;
      td.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          td.blur();
        }
      });
      td.addEventListener("blur", () => {
        void onTableCellBlur(td);
      });
      tr.append(td);
    }

    tbody.append(tr);
  });
  table.append(tbody);
  elements.tableGrid.append(table);
}

async function hydrateTableHistory({ preserveSelection = true } = {}) {
  const preferredTableDataId = preserveSelection ? getSelectedTableDataId() || String(state.activeTableDataId || "") : "";
  const preferredExportTableId = preserveSelection ? getSelectedExportTableDataId() : "";
  const response = await sendMessage(MESSAGE_TYPES.TABLE_HISTORY_LIST_REQUEST, {
    limit: 160
  });
  const items = Array.isArray(response.items) ? response.items : [];
  state.tableHistory = items;
  renderTableHistoryOptions(items, preferredTableDataId);
  renderExportTableOptions(items, preferredExportTableId || preferredTableDataId);
  updatePageRecoveryPreview();
}

async function loadSelectedTableRows({ silent = false } = {}) {
  const tableDataId = resolveCurrentTableDataId();
  if (!tableDataId) {
    state.activeTableDataId = null;
    state.tableRows = [];
    renderTableColumnOptions([]);
    renderTableGrid([], []);
    setTableStatus("No table selected");
    return;
  }

  state.activeTableDataId = tableDataId;
  if (!silent) {
    setTableStatus("Loading rows...");
  }

  const payload = {
    tableDataId,
    limit: parseTableLimit(),
    search: String(elements.tableSearch.value || "").trim(),
    filterColumn: String(elements.tableFilterColumn.value || "").trim(),
    filterValue: String(elements.tableFilterValue.value || "").trim()
  };

  try {
    const response = await sendMessage(MESSAGE_TYPES.TABLE_ROWS_REQUEST, payload);
    const rows = Array.isArray(response.rows) ? response.rows : [];
    const columns = Array.isArray(response.columns) ? response.columns : [];
    state.tableRows = rows;
    renderTableColumnOptions(columns);
    renderTableGrid(rows, columns);

    setTableStatus(
      `Rows loaded: ${Number(response.filteredRows || rows.length)}/${Number(response.totalRows || rows.length)}`
    );
    appendLog("table rows loaded", {
      tableDataId,
      totalRows: Number(response.totalRows || rows.length),
      filteredRows: Number(response.filteredRows || rows.length),
      columns: columns.length
    });
  } catch (error) {
    state.tableRows = [];
    renderTableGrid([], []);
    setTableStatus(`Table load failed: ${error.message}`, {
      error: true
    });
    appendLog("table rows load failed", {
      tableDataId,
      message: error.message
    });
  }
}

function clearTableFilters() {
  elements.tableSearch.value = "";
  elements.tableFilterColumn.value = "";
  elements.tableFilterValue.value = "";
}

async function onRenameTableColumn() {
  const tableDataId = getSelectedTableDataId();
  const fromColumn = String(elements.tableRenameFrom.value || "").trim();
  const toColumn = normalizeColumnName(elements.tableRenameTo.value, "");
  if (!tableDataId) {
    setTableStatus("Pick a table before renaming", {
      error: true
    });
    return;
  }
  if (!fromColumn || !toColumn) {
    setTableStatus("Both source and target column names are required", {
      error: true
    });
    return;
  }

  setTableStatus(`Renaming ${fromColumn} -> ${toColumn}...`);
  try {
    const response = await sendMessage(MESSAGE_TYPES.TABLE_RENAME_COLUMN_REQUEST, {
      tableDataId,
      fromColumn,
      toColumn
    });
    await hydrateDataSources();
    await hydrateTableHistory({
      preserveSelection: true
    });
    await loadSelectedTableRows({
      silent: true
    });
    elements.tableRenameTo.value = "";
    elements.tableRenameFrom.value = toColumn;
    setTableStatus(`Column renamed. Updated rows: ${Number(response.renamedRows || 0)}`);
    appendLog("table column renamed", response);
  } catch (error) {
    setTableStatus(`Rename failed: ${error.message}`, {
      error: true
    });
    appendLog("table column rename failed", {
      tableDataId,
      fromColumn,
      toColumn,
      message: error.message
    });
  }
}

async function onDedupeTableRows() {
  const tableDataId = getSelectedTableDataId();
  if (!tableDataId) {
    setTableStatus("Pick a table before dedupe", {
      error: true
    });
    return;
  }

  setTableStatus("Deduping rows...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.TABLE_DEDUPE_REQUEST, {
      tableDataId
    });
    await hydrateDataSources();
    await hydrateTableHistory({
      preserveSelection: true
    });
    await loadSelectedTableRows({
      silent: true
    });
    setTableStatus(
      `Dedupe done. Removed: ${Number(response.removed || 0)}, Remaining: ${Number(response.remaining || 0)}`
    );
    appendLog("table dedupe complete", response);
  } catch (error) {
    setTableStatus(`Dedupe failed: ${error.message}`, {
      error: true
    });
    appendLog("table dedupe failed", {
      tableDataId,
      message: error.message
    });
  }
}

function getSelectedMergeColumns() {
  return Array.from(elements.tableMergeColumns?.selectedOptions || [])
    .map((option) => String(option.value || "").trim())
    .filter(Boolean);
}

function buildTableCleanupOptions() {
  return {
    removeEmptyRows: Boolean(elements.tableCleanupRemoveEmptyRows.checked),
    removeEmptyColumns: Boolean(elements.tableCleanupRemoveEmptyColumns.checked),
    removeRepeatingColumns: Boolean(elements.tableCleanupRemoveRepeatingColumns.checked),
    removeDuplicateColumns: Boolean(elements.tableCleanupRemoveDuplicateColumns.checked),
    prioritizeDataDensity: Boolean(elements.tableCleanupPrioritizeDensity.checked),
    hideMostlyEmptyColumns: Boolean(elements.tableCleanupHideMostlyEmptyColumns.checked),
    mostlyEmptyThreshold: clamp(parseNumber(elements.tableCleanupMostlyEmptyThreshold.value, 0.9), 0.5, 0.99),
    includeImages: Boolean(elements.tableCleanupIncludeImages.checked)
  };
}

async function onCleanupTableRows() {
  const tableDataId = getSelectedTableDataId();
  if (!tableDataId) {
    setTableStatus("Pick a table before cleanup", {
      error: true
    });
    return;
  }

  const options = buildTableCleanupOptions();
  setTableStatus("Applying table cleanup...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.TABLE_CLEANUP_REQUEST, {
      tableDataId,
      options
    });
    await hydrateDataSources();
    await hydrateTableHistory({
      preserveSelection: true
    });
    await loadSelectedTableRows({
      silent: true
    });
    setTableStatus(
      `Cleanup complete. Rows updated=${Number(response.updatedRows || 0)}, removed=${Number(response.removedRows || 0)}, columns removed=${Array.isArray(response.removedColumns) ? response.removedColumns.length : 0}`
    );
    appendLog("table cleanup complete", response);
  } catch (error) {
    setTableStatus(`Cleanup failed: ${error.message}`, {
      error: true
    });
    appendLog("table cleanup failed", {
      tableDataId,
      options,
      message: error.message
    });
  }
}

async function onMergeTableColumns() {
  const tableDataId = getSelectedTableDataId();
  if (!tableDataId) {
    setTableStatus("Pick a table before merge", {
      error: true
    });
    return;
  }
  const sourceColumns = getSelectedMergeColumns();
  const mergedColumnName = normalizeColumnName(elements.tableMergeTarget.value, "");
  const separator = String(elements.tableMergeSeparator.value || "");
  const removeSourceColumns = Boolean(elements.tableMergeRemoveSources.checked);
  if (sourceColumns.length < 2) {
    setTableStatus("Select at least two columns to merge", {
      error: true
    });
    return;
  }
  if (!mergedColumnName) {
    setTableStatus("Merged column name is required", {
      error: true
    });
    return;
  }

  setTableStatus(`Merging ${sourceColumns.length} columns...`);
  try {
    const response = await sendMessage(MESSAGE_TYPES.TABLE_MERGE_COLUMNS_REQUEST, {
      tableDataId,
      sourceColumns,
      mergedColumnName,
      separator,
      removeSourceColumns
    });
    await hydrateDataSources();
    await hydrateTableHistory({
      preserveSelection: true
    });
    await loadSelectedTableRows({
      silent: true
    });
    elements.tableMergeTarget.value = mergedColumnName;
    setTableStatus(`Merge complete. Updated rows: ${Number(response.updatedRows || 0)}`);
    appendLog("table merge complete", response);
  } catch (error) {
    setTableStatus(`Merge failed: ${error.message}`, {
      error: true
    });
    appendLog("table merge failed", {
      tableDataId,
      sourceColumns,
      mergedColumnName,
      message: error.message
    });
  }
}

async function onExportFile() {
  const tableDataId = getSelectedExportTableDataId();
  if (!tableDataId) {
    setExportStatus("Select a table to export", {
      error: true
    });
    return;
  }

  setExportStatus("Preparing export...");
  const format = String(elements.exportFormat.value || "csv").trim().toLowerCase();
  const filterPayload = buildExportFilterPayload();
  try {
    const response = await sendMessage(MESSAGE_TYPES.TABLE_EXPORT_REQUEST, {
      tableDataId,
      format,
      ...filterPayload
    });
    setExportStatus(
      `Export queued: ${response.filename} (${Number(response.rowCount || 0)} rows, ${Number(response.columnCount || 0)} columns)`
    );
    appendLog("table export created", response);
  } catch (error) {
    setExportStatus(`Export failed: ${error.message}`, {
      error: true
    });
    appendLog("table export failed", {
      tableDataId,
      format,
      message: error.message
    });
  }
}

async function fetchClipboardExport() {
  const tableDataId = getSelectedExportTableDataId();
  if (!tableDataId) {
    throw new Error("Select a table first");
  }
  const filterPayload = buildExportFilterPayload();
  return sendMessage(MESSAGE_TYPES.TABLE_EXPORT_CLIPBOARD_REQUEST, {
    tableDataId,
    ...filterPayload
  });
}

async function onCopyClipboard({ openSheets = false } = {}) {
  setExportStatus("Building clipboard payload...");
  try {
    const hasPermission = await ensureClipboardPermission();
    if (!hasPermission) {
      throw new Error("Clipboard permission denied by user");
    }
    const response = await fetchClipboardExport();
    await navigator.clipboard.writeText(String(response.text || ""));

    if (openSheets) {
      await chrome.tabs.create({
        url: "https://docs.google.com/spreadsheets/create"
      });
      setExportStatus(`Copied ${Number(response.rowCount || 0)} rows. Opened Google Sheets, paste with Ctrl+V.`);
    } else {
      setExportStatus(`Copied ${Number(response.rowCount || 0)} rows to clipboard.`);
    }
    appendLog("clipboard export copied", {
      rowCount: Number(response.rowCount || 0),
      columnCount: Number(response.columnCount || 0),
      openSheets
    });
  } catch (error) {
    setExportStatus(`Clipboard export failed: ${error.message}`, {
      error: true
    });
    appendLog("clipboard export failed", {
      message: error.message,
      openSheets
    });
  }
}

function getFilteredImages() {
  const search = String(elements.imageSearch.value || "").trim().toLowerCase();
  const minWidth = Math.max(0, parseNumber(elements.imageMinWidth.value, 0));
  const minHeight = Math.max(0, parseNumber(elements.imageMinHeight.value, 0));
  const extFilter = String(elements.imageExtFilter.value || "").trim().toLowerCase();
  const sizeFilter = String(elements.imageSizeFilter.value || "").trim().toLowerCase();
  const altFilter = String(elements.imageAltFilter.value || "").trim().toLowerCase();

  return state.imageScanResults.filter((image) => {
    const imageUrl = String(image?.url || "").toLowerCase();
    const imageAlt = String(image?.alt || "").toLowerCase();
    const imageExt = String(image?.ext || "").toLowerCase();
    const width = Number(image?.width || 0);
    const height = Number(image?.height || 0);
    const category = String(image?.sizeCategory || "").toLowerCase();
    const hasAlt = Boolean(String(image?.alt || "").trim());

    if (search && !imageUrl.includes(search) && !imageAlt.includes(search)) return false;
    if (width < minWidth || height < minHeight) return false;
    if (extFilter && imageExt !== extFilter) return false;
    if (sizeFilter && category !== sizeFilter) return false;
    if (altFilter === "has" && !hasAlt) return false;
    if (altFilter === "none" && hasAlt) return false;
    return true;
  });
}

function renderImagePreview() {
  const filtered = getFilteredImages();
  elements.imagePreview.innerHTML = "";

  if (state.imageScanResults.length === 0) {
    elements.imagePreview.textContent = "No images scanned yet.";
    return;
  }

  if (filtered.length === 0) {
    elements.imagePreview.textContent = "No images match your filters.";
    return;
  }

  const capped = filtered.slice(0, 150);
  for (const image of capped) {
    const row = document.createElement("div");
    row.className = "image-row";

    const head = document.createElement("div");
    head.className = "image-row-head";

    const checkboxLabel = document.createElement("label");
    checkboxLabel.className = "device-inline";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.imageSelection.has(image.url);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.imageSelection.add(image.url);
      } else {
        state.imageSelection.delete(image.url);
      }
    });

    const title = document.createElement("span");
    title.textContent = `${image.width}x${image.height} • ${image.ext} • ${image.sizeCategory}`;

    checkboxLabel.append(checkbox, title);

    const meta = document.createElement("div");
    meta.className = "field-meta";
    meta.textContent = image.alt ? `alt: ${image.alt}` : "alt: (none)";

    const link = document.createElement("a");
    link.href = image.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = image.url;
    link.className = "field-meta";

    head.append(checkboxLabel);
    row.append(head, meta, link);
    elements.imagePreview.append(row);
  }

  setImageStatus(
    `Images: ${filtered.length}/${state.imageScanResults.length} filtered • ${state.imageSelection.size} selected`
  );
}

function selectFilteredImages() {
  const filtered = getFilteredImages();
  for (const image of filtered) {
    state.imageSelection.add(image.url);
  }
  renderImagePreview();
}

function clearImageSelection() {
  state.imageSelection.clear();
  renderImagePreview();
}

function resolveImagesForDownload() {
  const mode = String(elements.imageDownloadMode.value || "filtered").trim();
  const filtered = getFilteredImages();
  if (mode !== "selected") {
    return filtered;
  }

  const selectedMap = new Set(state.imageSelection);
  return state.imageScanResults.filter((image) => selectedMap.has(image.url));
}

async function onScanImages() {
  setImageStatus("Scanning active page...");
  trackUiEvent("image_scan_started", {
    toolId: state.activeTool
  });
  try {
    const response = await sendMessage(MESSAGE_TYPES.IMAGE_SCAN_REQUEST);
    state.imageScanResults = Array.isArray(response.images) ? response.images : [];
    state.imageSelection.clear();
    renderImagePreview();
    setImageStatus(`Scan complete: ${state.imageScanResults.length} images`);
    appendLog("image scan complete", {
      count: state.imageScanResults.length,
      pageUrl: response.pageUrl
    });
  } catch (error) {
    setImageStatus(`Image scan failed: ${error.message}`, {
      error: true
    });
    appendLog("image scan failed", {
      message: error.message
    });
  }
}

async function onDownloadImages() {
  const images = resolveImagesForDownload();
  if (images.length === 0) {
    setImageStatus("No images to download", {
      error: true
    });
    return;
  }

  setImageStatus(`Downloading ${images.length} images...`);
  trackUiEvent("image_download_started", {
    count: images.length
  });
  try {
    const response = await sendMessage(MESSAGE_TYPES.IMAGE_DOWNLOAD_REQUEST, {
      images,
      namingPattern: String(elements.imageNamingPattern.value || "").trim()
    });
    setImageStatus(`Download complete: ${Number(response.completed || 0)} ok, ${Number(response.failed || 0)} failed`);
    trackUiEvent("image_download_completed", {
      completed: Number(response.completed || 0),
      failed: Number(response.failed || 0)
    });
    appendLog("image download complete", response);
  } catch (error) {
    setImageStatus(`Image download failed: ${error.message}`, {
      error: true
    });
    appendLog("image download failed", {
      message: error.message
    });
  }
}

function renderActivationSessionSummary(session) {
  const account = session?.account || null;
  const user = session?.user || null;
  const lines = [
    `api: ${session?.apiBaseUrl || "(not set)"}`,
    `device: ${session?.deviceName || "(not set)"} (${session?.deviceId || "n/a"})`,
    `session: access=${session?.hasAccessToken ? "yes" : "no"}, refresh=${session?.hasRefreshToken ? "yes" : "no"}`
  ];
  if (user) {
    lines.push(`user: ${user.email || user.id || "unknown"}`);
  }
  if (account) {
    lines.push(
      `account: tier=${account.tier || "unknown"}, licenseActive=${String(account.isLicenseActive ?? "n/a")}, maxDevices=${String(account.maxDevices ?? "n/a")}`
    );
  }
  elements.activationSessionSummary.textContent = lines.join(" | ");
}

function renderActivationDevices(devicesPayload) {
  const payload = devicesPayload || {};
  const devices = Array.isArray(payload.devices) ? payload.devices : [];
  state.activationDevices = devices;
  elements.activationDeviceList.innerHTML = "";

  if (devices.length === 0) {
    elements.activationDeviceList.textContent = "No devices loaded.";
    return;
  }

  for (const device of devices) {
    const row = document.createElement("div");
    row.className = "device-row";

    const head = document.createElement("div");
    head.className = "device-row-head";

    const title = document.createElement("div");
    title.className = "field-meta";
    title.textContent = `${device.deviceId} • last seen ${formatRelativeTimestamp(device.lastSeenAt)}`;

    const inline = document.createElement("div");
    inline.className = "device-inline";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = String(device.deviceName || "");
    nameInput.placeholder = "device name";

    const renameButton = document.createElement("button");
    renameButton.className = "btn btn-ghost";
    renameButton.type = "button";
    renameButton.textContent = "Rename";
    renameButton.addEventListener("click", () => {
      void onActivationRenameDevice(device.deviceId, nameInput.value);
    });

    const removeButton = document.createElement("button");
    removeButton.className = "btn btn-ghost";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      void onActivationRemoveDevice(device.deviceId);
    });

    inline.append(nameInput, renameButton, removeButton);
    head.append(title);
    row.append(head, inline);
    elements.activationDeviceList.append(row);
  }
}

function applyActivationSession(session) {
  const next = session || null;
  state.activationSession = next;
  if (!next) return;
  elements.activationApiBase.value = String(next.apiBaseUrl || "");
  elements.activationDeviceName.value = String(next.deviceName || "");
  elements.activationLicenseKey.value = String(next.licenseKey || "");
  renderActivationSessionSummary(next);
}

async function hydrateActivationSession() {
  const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_SESSION_GET_REQUEST);
  applyActivationSession(response.session || null);
}

async function onActivationSaveConfig() {
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_CONFIG_SET_REQUEST, {
      apiBaseUrl: String(elements.activationApiBase.value || "").trim(),
      deviceName: String(elements.activationDeviceName.value || "").trim(),
      licenseKey: String(elements.activationLicenseKey.value || "").trim()
    });
    applyActivationSession(response.session || null);
    setActivationStatus("Activation config saved.");
  } catch (error) {
    setActivationStatus(`Save config failed: ${error.message}`, {
      error: true
    });
  }
}

async function onActivationRegister() {
  setActivationStatus("Registering account...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_AUTH_REGISTER_REQUEST, {
      apiBaseUrl: String(elements.activationApiBase.value || "").trim(),
      email: String(elements.activationEmail.value || "").trim(),
      password: String(elements.activationPassword.value || ""),
      displayName: String(elements.activationDisplayName.value || "").trim()
    });
    applyActivationSession(response.session || null);
    setActivationStatus("Account registered. Login next.");
  } catch (error) {
    setActivationStatus(`Register failed: ${error.message}`, {
      error: true
    });
  }
}

async function onActivationLogin() {
  setActivationStatus("Logging in...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_AUTH_LOGIN_REQUEST, {
      apiBaseUrl: String(elements.activationApiBase.value || "").trim(),
      email: String(elements.activationEmail.value || "").trim(),
      password: String(elements.activationPassword.value || ""),
      deviceName: String(elements.activationDeviceName.value || "").trim()
    });
    applyActivationSession(response.session || null);
    setActivationStatus("Login successful.");
  } catch (error) {
    setActivationStatus(`Login failed: ${error.message}`, {
      error: true
    });
  }
}

async function onActivationLogout() {
  setActivationStatus("Logging out...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_AUTH_LOGOUT_REQUEST);
    applyActivationSession(response.session || null);
    renderActivationDevices({
      devices: []
    });
    setActivationStatus("Logged out.");
  } catch (error) {
    setActivationStatus(`Logout failed: ${error.message}`, {
      error: true
    });
  }
}

async function onActivationProfileSync() {
  setActivationStatus("Syncing profile...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_AUTH_REFRESH_PROFILE_REQUEST);
    applyActivationSession(response.session || null);
    setActivationStatus("Profile synced.");
  } catch (error) {
    setActivationStatus(`Profile sync failed: ${error.message}`, {
      error: true
    });
  }
}

async function onActivationLicenseRegister() {
  setActivationStatus("Registering license...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_LICENSE_REGISTER_REQUEST, {
      licenseKey: String(elements.activationLicenseKey.value || "").trim()
    });
    applyActivationSession(response.session || null);
    setActivationStatus("License registered.");
  } catch (error) {
    setActivationStatus(`License register failed: ${error.message}`, {
      error: true
    });
  }
}

async function onActivationLicenseStatus() {
  setActivationStatus("Fetching license status...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_LICENSE_STATUS_REQUEST);
    applyActivationSession(response.session || null);
    const summary = response.licenseStatus || {};
    setActivationStatus(
      `License: ${summary.licenseStatus || "unknown"} • active=${String(summary.isLicenseActive)} • maxDevices=${String(summary.maxDevices)}`
    );
  } catch (error) {
    setActivationStatus(`License status failed: ${error.message}`, {
      error: true
    });
  }
}

async function onActivationValidateDevice() {
  setActivationStatus("Validating this device...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_DEVICE_VALIDATE_REQUEST, {
      licenseKey: String(elements.activationLicenseKey.value || "").trim()
    });
    applyActivationSession(response.session || null);
    setActivationStatus(
      `Device validation: ${response.validation?.valid ? "valid" : "invalid"} • currentDevices=${String(response.validation?.currentDevices ?? "n/a")}`
    );
  } catch (error) {
    setActivationStatus(`Device validation failed: ${error.message}`, {
      error: true
    });
  }
}

async function onActivationListDevices() {
  setActivationStatus("Loading devices...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_DEVICES_LIST_REQUEST, {
      licenseKey: String(elements.activationLicenseKey.value || "").trim()
    });
    applyActivationSession(response.session || null);
    renderActivationDevices(response.devices || {});
    const currentDevices = Number(
      response.devices?.currentDevices || (Array.isArray(response.devices?.devices) ? response.devices.devices.length : 0)
    );
    const maxDevicesValue = response.devices?.maxDevices;
    const maxDevices = Number.isFinite(Number(maxDevicesValue)) ? String(Number(maxDevicesValue)) : "n/a";
    setActivationStatus(
      `Devices loaded: ${currentDevices}/${maxDevices}`
    );
  } catch (error) {
    setActivationStatus(`Load devices failed: ${error.message}`, {
      error: true
    });
  }
}

async function onActivationRemoveDevice(deviceId) {
  setActivationStatus(`Removing device ${deviceId}...`);
  try {
    await sendMessage(MESSAGE_TYPES.ACTIVATION_DEVICE_REMOVE_REQUEST, {
      licenseKey: String(elements.activationLicenseKey.value || "").trim(),
      deviceId
    });
    await onActivationListDevices();
  } catch (error) {
    setActivationStatus(`Remove device failed: ${error.message}`, {
      error: true
    });
  }
}

async function onActivationRenameDevice(deviceId, deviceName) {
  const nextName = String(deviceName || "").trim();
  if (!nextName) {
    setActivationStatus("Device name cannot be empty", {
      error: true
    });
    return;
  }

  setActivationStatus(`Renaming device ${deviceId}...`);
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_DEVICE_RENAME_REQUEST, {
      licenseKey: String(elements.activationLicenseKey.value || "").trim(),
      deviceId,
      deviceName: nextName
    });
    applyActivationSession(response.session || null);
    await onActivationListDevices();
  } catch (error) {
    setActivationStatus(`Rename device failed: ${error.message}`, {
      error: true
    });
  }
}

function resolveStatusFromEvent(eventPayload) {
  const eventType = eventPayload.eventType;
  if (eventType === AUTOMATION_EVENT_TYPES.STARTED) return AUTOMATION_STATES.RUNNING;
  if (eventType === AUTOMATION_EVENT_TYPES.STOP_REQUESTED) return AUTOMATION_STATES.STOPPING;
  if (eventType === AUTOMATION_EVENT_TYPES.STOPPED) return AUTOMATION_STATES.STOPPED;
  if (eventType === AUTOMATION_EVENT_TYPES.COMPLETED) return AUTOMATION_STATES.COMPLETED;
  if (eventType === AUTOMATION_EVENT_TYPES.FAILED) return AUTOMATION_STATES.ERROR;
  return state.currentStatus;
}

function resolveSimpleModeTerminalStatusLine(eventPayload, nextStatus) {
  if (nextStatus === AUTOMATION_STATES.STOPPED) {
    return {
      text: "Extraction stopped.",
      error: true
    };
  }

  if (nextStatus === AUTOMATION_STATES.ERROR) {
    const failedMessage = friendlyErrorText(
      eventPayload?.payload?.error?.message || eventPayload?.payload?.errorPacket?.message || "Extraction failed"
    );
    return {
      text: `Extraction failed: ${failedMessage}`,
      error: true
    };
  }

  if (nextStatus !== AUTOMATION_STATES.COMPLETED) {
    return null;
  }

  const result = eventPayload?.payload?.result || {};
  const successCount = Number(result?.successCount || result?.rowCount || 0);
  const rowCount = Number(result?.rowCount || 0);
  const failureCount = Number(result?.failureCount || 0);
  const urlCount = Number(result?.urlCount || successCount + failureCount || 0);
  const duplicateSkipped = Number(result?.mapsDeduplication?.skippedKnownEntities || 0);
  const firstFailure = String(result?.failures?.[0]?.error || "").trim();
  const terminationReason = String(result?.terminationReason || "").trim().toLowerCase();

  if (successCount <= 0 && failureCount > 0) {
    const friendly = friendlyErrorText(firstFailure || "All URLs failed");
    return {
      text: `No rows extracted: ${friendly}`,
      error: true
    };
  }

  if (rowCount <= 0 && duplicateSkipped > 0 && failureCount <= 0) {
    return {
      text: `No new companies found. Skipped ${duplicateSkipped} duplicates.`,
      error: false
    };
  }

  if (terminationReason === "hard_round_cap") {
    const hardCapChainsUsed = Number(result?.hardCapAutoContinueUsed || 0);
    const hardCapChainsMax = Number(result?.hardCapAutoContinueMaxChains || 0);
    const hardCapAutoResumeEnabled = Boolean(result?.hardCapAutoContinue);
    const chainSuffix =
      hardCapAutoResumeEnabled && hardCapChainsMax > 0
        ? ` (auto-resume chains ${hardCapChainsUsed}/${hardCapChainsMax})`
        : "";
    return {
      text: `Extraction paused at safety cap after ${rowCount} rows${chainSuffix}. Re-run to continue from current page.`,
      error: false
    };
  }

  if (terminationReason === "round_limit" && Boolean(result?.untilNoMore)) {
    return {
      text: `Extraction reached pagination safety window at ${rowCount} rows.`,
      error: false
    };
  }

  if (terminationReason === "next_link_cycle") {
    return {
      text: `Extraction stopped after detecting pagination loop at ${rowCount} rows.`,
      error: false
    };
  }

  return {
    text: `Extraction completed: ${rowCount} rows from ${urlCount} URL${urlCount === 1 ? "" : "s"}.`,
    error: false
  };
}

function handleRuntimeEvent(eventPayload) {
  const eventType = String(eventPayload?.eventType || "").trim();
  const automationId = eventPayload?.payload?.automationId || null;
  if (automationId) {
    state.currentAutomationId = automationId;
  }

  const nextStatus = resolveStatusFromEvent(eventPayload);
  setStatus(nextStatus);
  if (eventType === AUTOMATION_EVENT_TYPES.PROGRESS) {
    const progressPct = toProgressPercent(eventPayload?.payload?.progress, state.statusProgressPct);
    const phase = String(eventPayload?.payload?.phase || "").trim();
    setStatusProgress(progressPct, {
      phase
    });
  }

  if (
    nextStatus === AUTOMATION_STATES.COMPLETED ||
    nextStatus === AUTOMATION_STATES.STOPPED ||
    nextStatus === AUTOMATION_STATES.ERROR
  ) {
    if (nextStatus === AUTOMATION_STATES.STOPPED || nextStatus === AUTOMATION_STATES.ERROR) {
      state.intentAutoMapsDetailEnrichPending = false;
      state.intentAutoMapsDetailEnrichAutomationId = null;
      state.intentAutoListUrlEnrichPending = false;
      state.intentAutoListUrlEnrichAutomationId = null;
    }
    state.lastTerminalAutomationId = automationId || state.lastTerminalAutomationId;
    void (async () => {
      try {
        await hydrateDataSources();
      } catch {
        appendLog("datasource refresh failed after terminal event");
      }

      try {
        await hydrateTableHistory({
          preserveSelection: true
        });
      } catch {
        appendLog("table history refresh failed after terminal event");
      }

      if (state.simpleMode && nextStatus === AUTOMATION_STATES.COMPLETED) {
        setShellView(SHELL_VIEWS.DATA);
        try {
          await loadSelectedTableRows({
            silent: true
          });
        } catch {
          appendLog("table load failed after completion");
        }

        const mapsEnrichmentTransition = await maybeHandleIntentMapsDetailEnrichment(eventPayload);
        const urlEnrichmentTransition = mapsEnrichmentTransition.deferExport
          ? {
              started: false,
              deferExport: false
            }
          : await maybeHandleIntentListUrlEnrichment(eventPayload);
        if (state.intentAutoExport && !mapsEnrichmentTransition.deferExport && !urlEnrichmentTransition.deferExport) {
          const exportFormat = String(state.intentAutoExportFormat || "csv").trim().toLowerCase();
          state.intentAutoExport = false;
          state.intentAutoExportFormat = "csv";
          elements.exportFormat.value = exportFormat || "csv";
          await onExportFile();
        }
      }
    })();
  }

  if (state.simpleMode) {
    if (eventType === AUTOMATION_EVENT_TYPES.PROGRESS && nextStatus === AUTOMATION_STATES.RUNNING) {
      const progressPct = toProgressPercent(eventPayload?.payload?.progress, state.statusProgressPct);
      const phase = String(eventPayload?.payload?.phase || "").trim();
      setListAutoDetectStatus(
        phase ? `Working ${progressPct}%: ${phase}` : `Working ${progressPct}%: extracting...`
      );
    }
    const terminalLine = resolveSimpleModeTerminalStatusLine(eventPayload, nextStatus);
    if (terminalLine?.text) {
      setListAutoDetectStatus(terminalLine.text, {
        error: Boolean(terminalLine.error)
      });
    }
  }

  appendLog(`event: ${eventPayload.eventType}`, eventPayload.payload || {});
}

async function applyPickerSessionResult(session, purpose) {
  const selections = Array.isArray(session?.selections) ? session.selections : [];
  if (purpose === "list_container" && selections.length > 0) {
    const selected = selections[0];
    elements.containerSelector.value = selected.selector || "";
    appendLog("container selected", selected);
    return;
  }

  if (purpose === "list_fields" && selections.length > 0) {
    const fields = selections.map((selection, index) => createFieldFromSelection(selection, state.listFields.length, index));
    state.listFields = [...state.listFields, ...fields];
    renderListFields();
    appendLog("list fields selected", {
      added: fields.length
    });
    return;
  }

  if (purpose === "list_load_more_button" && selections.length > 0) {
    elements.loadMoreButtonSelector.value = selections[0].selector || "";
    appendLog("load more button selected", selections[0]);
    return;
  }

  if (purpose === "page_fields" && selections.length > 0) {
    const fields = selections.map((selection, index) => createFieldFromSelection(selection, state.pageFields.length, index));
    state.pageFields = [...state.pageFields, ...fields];
    renderPageFields();
    appendLog("page fields selected", {
      added: fields.length
    });
    return;
  }

  if (purpose === "guided_container" && selections.length > 0) {
    const selected = selections[0];
    const normalizedSelector = normalizePickedContainerSelector(selected.selector || "");
    elements.containerSelector.value = normalizedSelector || selected.selector || "";
    setListAutoDetectStatus("Point & Follow: now click one field inside a row to follow.");
    appendLog("guided container selected", {
      original: selected.selector || "",
      normalized: elements.containerSelector.value
    });
    const started = await startPicker({
      mode: PICKER_MODES.FIELD,
      multiSelect: false,
      anchorSelector: String(elements.containerSelector.value || "").trim(),
      prompt: "Click one value (name/title/price). Datascrap will follow this pattern across rows.",
      purpose: "guided_field",
      preferredUrl: String(elements.startUrl.value || "").trim()
    });
    if (!started?.ok) {
      state.pointFollowActive = false;
      state.pointFollowStartOptions = null;
      setListAutoDetectStatus(`Point & Follow failed: ${started?.error || "Unable to start picker."}`, {
        error: true
      });
    }
    return;
  }

  if (purpose === "guided_seed" && selections.length > 0) {
    const selected = selections[0];
    setListAutoDetectStatus("Point & Follow: learning from your click...");
    appendLog("guided seed selected", {
      selector: selected.selector || "",
      relativeSelector: selected.relativeSelector || "",
      textPreview: selected.textPreview || ""
    });
    const detected = await onListAutoDetect({
      anchorSelector: String(selected.selector || "").trim(),
      minItems: 2
    });
    if (detected) {
      setListAutoDetectStatus("Point & Follow learned pattern. Starting extraction...");
      const started = await onStart(state.pointFollowStartOptions || {});
      if (started) {
        setListAutoDetectStatus("Point & Follow running. Open DATA to see results.");
      }
      state.pointFollowActive = false;
      state.pointFollowStartOptions = null;
      return;
    }
    setListAutoDetectStatus("Need one extra hint. Click one full row/item.");
    const started = await startPicker({
      mode: PICKER_MODES.CONTAINER,
      multiSelect: false,
      prompt: "Click one full row/item so Datascrap can map repeating records.",
      purpose: "guided_container",
      preferredUrl: String(elements.startUrl.value || "").trim()
    });
    if (!started?.ok) {
      state.pointFollowActive = false;
      state.pointFollowStartOptions = null;
      setListAutoDetectStatus(`Point & Follow failed: ${started?.error || "Unable to start picker."}`, {
        error: true
      });
    }
    return;
  }

  if (purpose === "guided_field" && selections.length > 0) {
    const field = createFieldFromSelection(selections[0], 0, 0);
    state.listFields = [field];
    renderListFields();
    setListAutoDetectStatus("Point & Follow captured your pattern. Starting extraction...");
    appendLog("guided field selected", {
      selector: field.selector,
      relativeSelector: field.relativeSelector,
      extractMode: field.extractMode
    });
    const started = await onStart(state.pointFollowStartOptions || {});
    if (started) {
      setListAutoDetectStatus("Point & Follow running. Open DATA to see results.");
    }
    state.pointFollowActive = false;
    state.pointFollowStartOptions = null;
  }
}

function handlePickerEvent(payload) {
  const eventType = String(payload?.eventType || "").trim();
  const session = payload?.session || null;
  if (!session?.sessionId) return;

  const purpose = state.pickerSessionPurposeById.get(session.sessionId);
  if (eventType === "started") {
    setPickerStatus(`${session.mode} running`);
    appendLog("picker started", {
      sessionId: session.sessionId,
      mode: session.mode
    });
    return;
  }

  if (eventType === "progress") {
    setPickerStatus(`${session.mode} selecting (${session.selections.length})`);
    return;
  }

  if (eventType === "completed") {
    setPickerStatus("completed");
    appendLog("picker completed", {
      sessionId: session.sessionId,
      count: session.selections.length
    });
    if (purpose) {
      void applyPickerSessionResult(session, purpose);
    }
    state.pickerSessionPurposeById.delete(session.sessionId);
    return;
  }

  if (eventType === "canceled") {
    setPickerStatus("canceled");
    appendLog("picker canceled", {
      sessionId: session.sessionId
    });
    if (state.pointFollowActive && (purpose === "guided_seed" || purpose === "guided_container" || purpose === "guided_field")) {
      state.pointFollowActive = false;
      state.pointFollowStartOptions = null;
      setListAutoDetectStatus("Point & Follow canceled.", {
        error: true
      });
    }
    state.pickerSessionPurposeById.delete(session.sessionId);
    return;
  }

  if (eventType === "error") {
    setPickerStatus("error");
    appendLog("picker error", session);
    if (state.pointFollowActive) {
      state.pointFollowActive = false;
      state.pointFollowStartOptions = null;
      setListAutoDetectStatus("Point & Follow failed due to picker error.", {
        error: true
      });
    }
    state.pickerSessionPurposeById.delete(session.sessionId);
  }
}

async function hydrateRunnerCatalog() {
  const result = await sendMessage(MESSAGE_TYPES.LIST_RUNNERS_REQUEST);
  const runners = Array.isArray(result.runners) ? result.runners : [];
  state.runnerCatalog = runners;

  elements.runnerType.innerHTML = "";
  for (const runner of runners) {
    const option = document.createElement("option");
    option.value = runner.type;
    option.textContent = runner.label;
    elements.runnerType.append(option);
  }
  updateRunnerUi();
}

async function hydrateDataSources() {
  const response = await sendMessage(MESSAGE_TYPES.DATA_SOURCE_LIST_REQUEST, {
    limit: 100
  });
  const items = Array.isArray(response.items) ? response.items : [];
  state.dataSources = items;
  const currentValue = String(elements.pageDatasourceSelect.value || "").trim();

  elements.pageDatasourceSelect.innerHTML = "";
  if (items.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No table data yet";
    elements.pageDatasourceSelect.append(option);
    return;
  }

  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.tableDataId;
    const runner = item.runnerType || "unknown";
    const rows = Number(item.rowCount || 0);
    option.textContent = `${item.tableDataId.slice(0, 8)}... (${runner}, rows: ${rows})`;
    if (currentValue && currentValue === item.tableDataId) {
      option.selected = true;
    }
    elements.pageDatasourceSelect.append(option);
  }
}

function renderDatasourceColumns(columns, selectedColumn = "") {
  const list = Array.isArray(columns) ? columns : [];
  state.dataSourceColumns = list;
  elements.pageDatasourceColumn.innerHTML = "";

  if (list.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No URL columns detected";
    elements.pageDatasourceColumn.append(option);
    return;
  }

  for (const column of list) {
    const option = document.createElement("option");
    option.value = column.name;
    option.textContent = `${column.name} (url ${column.urlCount}/${column.count})`;
    if (selectedColumn && selectedColumn === column.name) {
      option.selected = true;
    }
    elements.pageDatasourceColumn.append(option);
  }
}

async function loadDataSourceUrls() {
  const tableDataId = String(elements.pageDatasourceSelect.value || "").trim();
  if (!tableDataId) {
    state.dataSourceUrls = [];
    renderDatasourceColumns([], "");
    elements.pageDatasourceCount.value = "0";
    setResolvedUrlsPreview([]);
    return;
  }

  const selectedColumn = String(elements.pageDatasourceColumn.value || "").trim();
  const response = await sendMessage(MESSAGE_TYPES.DATA_SOURCE_URLS_REQUEST, {
    tableDataId,
    selectedColumn,
    limit: 3000
  });

  state.dataSourceUrls = Array.isArray(response.urls) ? response.urls : [];
  renderDatasourceColumns(response.columns || [], response.selectedColumn || "");
  elements.pageDatasourceCount.value = String(state.dataSourceUrls.length);
  setResolvedUrlsPreview(state.dataSourceUrls);
  appendLog("datasource urls loaded", {
    tableDataId,
    selectedColumn: response.selectedColumn,
    urlCount: state.dataSourceUrls.length
  });
}

async function parseCsvFile(file) {
  const text = await file.text();
  const urlRegex = /https?:\/\/[^\s,;"')]+/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches.map((item) => item.trim()).filter(Boolean)));
}

function parseManualUrls(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCommaSeparated(text) {
  return String(text || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLineSeparated(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function applyManualUrls(urls, { append = false } = {}) {
  const incoming = dedupeUrls(urls);
  const existing = append ? parseManualUrls(elements.pageManualUrls.value) : [];
  const merged = dedupeUrls([...existing, ...incoming]);
  elements.pageUrlSourceMode.value = URL_SOURCE_MODES.MANUAL;
  updatePageSourceUi();
  elements.pageManualUrls.value = merged.join("\n");
  setResolvedUrlsPreview(merged);
  return merged;
}

function getTableHistoryEntryById(tableDataId) {
  const id = String(tableDataId || "").trim();
  if (!id) return null;
  return state.tableHistory.find((item) => String(item?.tableDataId || "").trim() === id) || null;
}

function getPageRecoverySourceRecord() {
  const selected = getSelectedTableDataId();
  const selectedEntry = getTableHistoryEntryById(selected);
  if (selectedEntry) {
    return selectedEntry;
  }

  return (
    state.tableHistory.find((item) => String(item?.runnerType || "").trim() === RUNNER_TYPES.PAGE_EXTRACTOR) || null
  );
}

function getRecoverySummary(record) {
  const summary = record?.summary && typeof record.summary === "object" ? record.summary : null;
  return summary || null;
}

function getRecoveryFailureEntries(record) {
  const summary = getRecoverySummary(record);
  if (!summary) return [];
  return buildFailureReportEntries(summary);
}

function updatePageRecoveryPreview() {
  const source = getPageRecoverySourceRecord();
  if (!source) {
    elements.pageRecoveryPreview.textContent = "Select a page extractor table run with failures to use recovery controls.";
    return;
  }

  const summary = getRecoverySummary(source);
  if (!summary) {
    elements.pageRecoveryPreview.textContent = "Selected run has no recovery summary.";
    return;
  }

  const failedUrls = resolveRetryFailedUrls(summary);
  const resumeUrls = resolveResumeUrls(summary);
  const checkpoint = summary.checkpoint && typeof summary.checkpoint === "object" ? summary.checkpoint : {};
  const lines = [
    `source=${String(source.tableDataId || "").slice(0, 8)}...`,
    `rowCount=${Number(summary.rowCount || source.rowCount || 0)}`,
    `urlCount=${Number(summary.urlCount || checkpoint.totalUrls || 0)}`,
    `failed=${failedUrls.length}`,
    `resume=${resumeUrls.length}`,
    `updated=${formatRelativeTimestamp(source.updatedAt || source.createdAt)}`
  ];
  elements.pageRecoveryPreview.textContent = lines.join(" | ");
}

function buildRecoveryFilename(record, suffix, extension) {
  const tableDataId = String(record?.tableDataId || "table").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) || "table";
  const safeSuffix = String(suffix || "report").replace(/[^a-zA-Z0-9_-]/g, "_");
  const ext = String(extension || "txt").replace(/[^a-zA-Z0-9]/g, "") || "txt";
  return `page_recovery_${tableDataId}_${safeSuffix}.${ext}`;
}

function parseUrlGeneratorInput() {
  return {
    template: String(elements.urlgenTemplate.value || "").trim(),
    start: parseNumber(elements.urlgenRangeStart.value, 1),
    end: parseNumber(elements.urlgenRangeEnd.value, 10),
    step: parseNumber(elements.urlgenRangeStep.value, 1),
    padding: parseNumber(elements.urlgenPadding.value, 0),
    seeds: parseSeedList(elements.urlgenSeeds.value),
    append: Boolean(elements.urlgenAppendMode.checked)
  };
}

function onGenerateRangeUrls() {
  try {
    const input = parseUrlGeneratorInput();
    const generated = generateRangeUrls({
      template: input.template,
      start: input.start,
      end: input.end,
      step: input.step,
      padding: input.padding,
      maxCount: 10_000
    });
    const merged = applyManualUrls(generated, {
      append: input.append
    });
    setUrlGeneratorStatus(`Generated ${generated.length} range URLs (${merged.length} in manual list)`);
  } catch (error) {
    setUrlGeneratorStatus(`Range generation failed: ${error.message}`, {
      error: true
    });
  }
}

function onGenerateSeedUrls() {
  try {
    const input = parseUrlGeneratorInput();
    const generated = generateSeedUrls({
      template: input.template,
      seeds: input.seeds,
      maxCount: 10_000
    });
    const merged = applyManualUrls(generated, {
      append: input.append
    });
    setUrlGeneratorStatus(`Generated ${generated.length} seed URLs (${merged.length} in manual list)`);
  } catch (error) {
    setUrlGeneratorStatus(`Seed generation failed: ${error.message}`, {
      error: true
    });
  }
}

function onGeneratePatternUrls() {
  try {
    const input = parseUrlGeneratorInput();
    const generated = generatePatternUrls({
      template: input.template,
      seeds: input.seeds,
      start: input.start,
      end: input.end,
      step: input.step,
      padding: input.padding,
      maxCount: 10_000
    });
    const merged = applyManualUrls(generated, {
      append: input.append
    });
    setUrlGeneratorStatus(`Generated ${generated.length} pattern URLs (${merged.length} in manual list)`);
  } catch (error) {
    setUrlGeneratorStatus(`Pattern generation failed: ${error.message}`, {
      error: true
    });
  }
}

function onClearManualUrls() {
  elements.pageUrlSourceMode.value = URL_SOURCE_MODES.MANUAL;
  updatePageSourceUi();
  elements.pageManualUrls.value = "";
  setResolvedUrlsPreview([]);
  setUrlGeneratorStatus("Manual URL list cleared");
}

function onRetryFailedOnly() {
  const source = getPageRecoverySourceRecord();
  if (!source) {
    setPageRecoveryStatus("No table run selected for recovery", {
      error: true
    });
    return;
  }

  const summary = getRecoverySummary(source);
  if (!summary) {
    setPageRecoveryStatus("Selected run has no recovery summary", {
      error: true
    });
    return;
  }

  const failedUrls = resolveRetryFailedUrls(summary);
  if (failedUrls.length === 0) {
    setPageRecoveryStatus("No failed URLs found in selected run");
    return;
  }

  applyManualUrls(failedUrls, {
    append: false
  });
  setPageRecoveryStatus(`Prepared ${failedUrls.length} failed URLs for retry`);
}

function onResumeCheckpoint() {
  const source = getPageRecoverySourceRecord();
  if (!source) {
    setPageRecoveryStatus("No table run selected for checkpoint resume", {
      error: true
    });
    return;
  }

  const summary = getRecoverySummary(source);
  if (!summary) {
    setPageRecoveryStatus("Selected run has no checkpoint summary", {
      error: true
    });
    return;
  }

  const resumeUrls = resolveResumeUrls(summary);
  if (resumeUrls.length === 0) {
    setPageRecoveryStatus("Checkpoint has no unresolved URLs to resume");
    return;
  }

  applyManualUrls(resumeUrls, {
    append: false
  });
  setPageRecoveryStatus(`Prepared ${resumeUrls.length} checkpoint URLs to resume`);
}

function onDownloadFailureReport(format = "csv") {
  const source = getPageRecoverySourceRecord();
  if (!source) {
    setPageRecoveryStatus("No table run selected for failure report", {
      error: true
    });
    return;
  }

  const entries = getRecoveryFailureEntries(source);
  if (entries.length === 0) {
    setPageRecoveryStatus("Selected run has no failures to export");
    return;
  }

  if (format === "json") {
    const filename = buildRecoveryFilename(source, "failure_report", "json");
    downloadTextFile(filename, JSON.stringify(entries, null, 2), "application/json");
    setPageRecoveryStatus(`Failure report exported: ${entries.length} rows (JSON)`);
    return;
  }

  const csv = buildFailureReportCsv(entries);
  const filename = buildRecoveryFilename(source, "failure_report", "csv");
  downloadTextFile(filename, csv, "text/csv");
  setPageRecoveryStatus(`Failure report exported: ${entries.length} rows (CSV)`);
}

function normalizeStringArray(values, { lowerCase = false } = {}) {
  let source = values;
  if (typeof source === "string") {
    source = source
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(source)) return [];
  const seen = new Set();
  const output = [];
  for (const raw of source) {
    const value = lowerCase ? String(raw || "").trim().toLowerCase() : String(raw || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    output.push(value);
  }
  return output;
}

function resolveExpectedColumnsForTemplateContext({
  runnerType,
  pageActionType,
  listFields,
  pageFields
} = {}) {
  const runner = String(runnerType || "").trim();
  if (runner === RUNNER_TYPES.LIST_EXTRACTOR) {
    return (Array.isArray(listFields) ? listFields : [])
      .map((field, index) => normalizeFieldName(field?.name, index))
      .filter(Boolean);
  }
  if (runner === RUNNER_TYPES.METADATA_EXTRACTOR) {
    return [...METADATA_SCHEMA_COLUMNS];
  }
  if (runner !== RUNNER_TYPES.PAGE_EXTRACTOR) {
    return [];
  }

  const action = String(pageActionType || PAGE_ACTION_TYPES.EXTRACT_PAGES).trim();
  if (action === PAGE_ACTION_TYPES.EXTRACT_PAGES) {
    return (Array.isArray(pageFields) ? pageFields : [])
      .map((field, index) => normalizeFieldName(field?.name, index))
      .filter(Boolean);
  }

  const mapped = PAGE_ACTION_SCHEMA_COLUMNS[action];
  return Array.isArray(mapped) ? [...mapped] : [];
}

function normalizeTemplateSchemaLock(rawSchemaLock, payload) {
  const defaultColumns = resolveExpectedColumnsForTemplateContext({
    runnerType: payload?.runnerType,
    pageActionType: payload?.pageActionType,
    listFields: payload?.listFields,
    pageFields: payload?.pageFields
  });
  const source = rawSchemaLock && typeof rawSchemaLock === "object" ? rawSchemaLock : {};
  const explicitColumns = normalizeStringArray(source.columns);
  return {
    enabled: Boolean(source.enabled),
    columns: explicitColumns.length > 0 ? explicitColumns : defaultColumns,
    runnerType: String(source.runnerType || payload?.runnerType || "").trim(),
    pageActionType: String(source.pageActionType || payload?.pageActionType || "").trim()
  };
}

function normalizeTemplateRecord(item) {
  const payload = item?.payload && typeof item.payload === "object" ? item.payload : {};
  return {
    id: String(item?.id || randomId("tpl")),
    name: String(item?.name || "Untitled Template").trim() || "Untitled Template",
    notes: String(item?.notes || "").trim(),
    sourceDomains: normalizeStringArray(item?.sourceDomains || item?.domains, {
      lowerCase: true
    }),
    createdAt: item?.createdAt || new Date().toISOString(),
    updatedAt: item?.updatedAt || item?.createdAt || new Date().toISOString(),
    payload,
    schemaLock: normalizeTemplateSchemaLock(item?.schemaLock, payload)
  };
}

function downloadTextFile(filename, text, mimeType = "application/json") {
  const blob = new Blob([String(text || "")], {
    type: mimeType
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = String(filename || "download.txt");
  anchor.rel = "noopener";
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

function buildEmailOptions() {
  return {
    deepScanEnabled: Boolean(elements.emailDeepScanEnabled.checked),
    maxDepth: clamp(parseNumber(elements.emailDeepMaxDepth.value, 1), 1, 3),
    maxLinksPerPage: clamp(parseNumber(elements.emailDeepMaxLinksPerPage.value, 20), 1, 60),
    sameDomainOnly: Boolean(elements.emailDeepSameDomainOnly.checked),
    linkSelector: String(elements.emailDeepLinkSelector.value || "").trim(),
    removeDuplicates: Boolean(elements.emailRemoveDuplicates.checked),
    toLowerCase: Boolean(elements.emailToLowercase.checked),
    basicValidation: Boolean(elements.emailBasicValidation.checked),
    includeMailtoLinks: Boolean(elements.emailIncludeMailto.checked),
    domainFilters: parseCommaSeparated(elements.emailDomainFilters.value)
  };
}

function buildPhoneOptions() {
  return {
    removeDuplicates: Boolean(elements.phoneRemoveDuplicates.checked),
    basicValidation: Boolean(elements.phoneBasicValidation.checked),
    phonePatterns: parseLineSeparated(elements.phonePatterns.value)
  };
}

function buildTextOptions() {
  return {
    includeMetadata: Boolean(elements.textIncludeMetadata.checked),
    maxContentChars: clamp(parseNumber(elements.textMaxContentChars.value, 12000), 1000, 100000)
  };
}

function buildMapsOptions(options = {}) {
  const source = options && typeof options === "object" ? options : {};
  const maxResults = clamp(parseNumber(source.maxResults, 0), 0, 5000);
  return {
    includeBasicInfo: Boolean(elements.mapsIncludeBasicInfo.checked),
    includeContactDetails: Boolean(elements.mapsIncludeContactDetails.checked),
    includeReviews: Boolean(elements.mapsIncludeReviews.checked),
    includeHours: Boolean(elements.mapsIncludeHours.checked),
    includeLocation: Boolean(elements.mapsIncludeLocation.checked),
    includeImages: Boolean(elements.mapsIncludeImages.checked),
    onlyNewResults: true,
    autoScrollResults: true,
    untilNoMore: true,
    maxResults,
    maxScrollSteps: 220,
    stabilityPasses: 8,
    scrollDelayMs: 650
  };
}

function buildMetadataOptions() {
  return {
    includeMetaTags: Boolean(elements.metadataIncludeMetaTags.checked),
    includeJsonLd: Boolean(elements.metadataIncludeJsonLd.checked),
    includeReviewSignals: Boolean(elements.metadataIncludeReviewSignals.checked),
    includeContactSignals: Boolean(elements.metadataIncludeContactSignals.checked),
    includeRawJsonLd: Boolean(elements.metadataIncludeRawJsonLd.checked)
  };
}

function parseJsonInput(raw, label) {
  const text = String(raw || "").trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("JSON must be an object");
    }
    return parsed;
  } catch (error) {
    throw new Error(`${label} JSON is invalid: ${error.message}`);
  }
}

function getObservabilityApiKey() {
  return String(elements.observabilityApiKey.value || "").trim();
}

function extractCommonTemplateControls() {
  return {
    runnerType: String(elements.runnerType.value || "").trim(),
    startUrl: String(elements.startUrl.value || "").trim(),
    activeTool: state.activeTool,
    pageActionType: String(elements.pageActionType.value || "").trim(),
    pageUrlSourceMode: String(elements.pageUrlSourceMode.value || "").trim(),
    pageManualUrls: String(elements.pageManualUrls.value || ""),
    listFields: state.listFields.map((item) => ({ ...item })),
    pageFields: state.pageFields.map((item) => ({ ...item })),
    controls: {
      containerSelector: String(elements.containerSelector.value || ""),
      loadMoreMethod: String(elements.loadMoreMethod.value || ""),
      speedProfile: String(elements.speedProfile.value || ""),
      loadMoreAttempts: String(elements.loadMoreAttempts.value || ""),
      loadMoreDelayMs: String(elements.loadMoreDelayMs.value || ""),
      loadMoreScrollPx: String(elements.loadMoreScrollPx.value || ""),
      loadMoreNoChangeThreshold: String(elements.loadMoreNoChangeThreshold.value || ""),
      loadMoreButtonSelector: String(elements.loadMoreButtonSelector.value || ""),
      loadMoreNextSelector: String(elements.loadMoreNextSelector.value || ""),
      queueConcurrency: String(elements.queueConcurrency.value || ""),
      queueDelayMs: String(elements.queueDelayMs.value || ""),
      queuePageTimeoutMs: String(elements.queuePageTimeoutMs.value || ""),
      queueRetries: String(elements.queueRetries.value || ""),
      queueRetryDelayMs: String(elements.queueRetryDelayMs.value || ""),
      queueJitterMs: String(elements.queueJitterMs.value || ""),
      queueReliabilityProfile: String(elements.queueReliabilityProfile.value || ""),
      queueBackoffStrategy: String(elements.queueBackoffStrategy.value || ""),
      queueJitterMode: String(elements.queueJitterMode.value || ""),
      queueRetryMinDelayMs: String(elements.queueRetryMinDelayMs.value || ""),
      queueRetryMaxDelayMs: String(elements.queueRetryMaxDelayMs.value || ""),
      queueSessionReuseMode: String(elements.queueSessionReuseMode.value || ""),
      queueWaitSelector: String(elements.queueWaitSelector.value || ""),
      queueWaitSelectorTimeoutMs: String(elements.queueWaitSelectorTimeoutMs.value || ""),
      queueWaitPageLoad: Boolean(elements.queueWaitPageLoad.checked),
      emailDeepScanEnabled: Boolean(elements.emailDeepScanEnabled.checked),
      emailDeepMaxDepth: String(elements.emailDeepMaxDepth.value || ""),
      emailDeepMaxLinksPerPage: String(elements.emailDeepMaxLinksPerPage.value || ""),
      emailDeepSameDomainOnly: Boolean(elements.emailDeepSameDomainOnly.checked),
      emailDeepLinkSelector: String(elements.emailDeepLinkSelector.value || ""),
      emailRemoveDuplicates: Boolean(elements.emailRemoveDuplicates.checked),
      emailToLowercase: Boolean(elements.emailToLowercase.checked),
      emailBasicValidation: Boolean(elements.emailBasicValidation.checked),
      emailIncludeMailto: Boolean(elements.emailIncludeMailto.checked),
      emailDomainFilters: String(elements.emailDomainFilters.value || ""),
      phoneRemoveDuplicates: Boolean(elements.phoneRemoveDuplicates.checked),
      phoneBasicValidation: Boolean(elements.phoneBasicValidation.checked),
      phonePatterns: String(elements.phonePatterns.value || ""),
      textIncludeMetadata: Boolean(elements.textIncludeMetadata.checked),
      textMaxContentChars: String(elements.textMaxContentChars.value || ""),
      mapsIncludeBasicInfo: Boolean(elements.mapsIncludeBasicInfo.checked),
      mapsIncludeContactDetails: Boolean(elements.mapsIncludeContactDetails.checked),
      mapsIncludeReviews: Boolean(elements.mapsIncludeReviews.checked),
      mapsIncludeHours: Boolean(elements.mapsIncludeHours.checked),
      mapsIncludeLocation: Boolean(elements.mapsIncludeLocation.checked),
      mapsIncludeImages: Boolean(elements.mapsIncludeImages.checked),
      metadataIncludeMetaTags: Boolean(elements.metadataIncludeMetaTags.checked),
      metadataIncludeJsonLd: Boolean(elements.metadataIncludeJsonLd.checked),
      metadataIncludeReviewSignals: Boolean(elements.metadataIncludeReviewSignals.checked),
      metadataIncludeContactSignals: Boolean(elements.metadataIncludeContactSignals.checked),
      metadataIncludeRawJsonLd: Boolean(elements.metadataIncludeRawJsonLd.checked),
      cloudFeaturesOptIn: Boolean(elements.cloudFeaturesOptIn.checked),
      cloudWebhookOptIn: Boolean(elements.cloudWebhookOptIn.checked),
      cloudConsentVersion: String(elements.cloudConsentVersion.value || ""),
      observabilityApiKey: String(elements.observabilityApiKey.value || "")
    }
  };
}

function applyTemplateControlValue(target, value) {
  if (!target) return;
  if (target.type === "checkbox") {
    target.checked = Boolean(value);
    return;
  }
  target.value = value === undefined || value === null ? "" : String(value);
}

function applyTemplatePayload(payload) {
  const data = payload && typeof payload === "object" ? payload : {};
  const controls = data.controls && typeof data.controls === "object" ? data.controls : {};

  const targetTool = String(data.activeTool || "").trim();
  if (targetTool && TOOL_PRESETS[targetTool]) {
    applyToolPreset(targetTool, {
      navigate: false,
      forceWelcome: false,
      track: false
    });
  }

  if (data.runnerType) {
    setRunnerTypeIfAvailable(String(data.runnerType));
  }
  applyTemplateControlValue(elements.startUrl, data.startUrl);
  applyTemplateControlValue(elements.pageActionType, data.pageActionType);
  applyTemplateControlValue(elements.pageUrlSourceMode, data.pageUrlSourceMode);
  applyTemplateControlValue(elements.pageManualUrls, data.pageManualUrls);

  const controlBindings = {
    containerSelector: elements.containerSelector,
    loadMoreMethod: elements.loadMoreMethod,
    speedProfile: elements.speedProfile,
    loadMoreAttempts: elements.loadMoreAttempts,
    loadMoreDelayMs: elements.loadMoreDelayMs,
    loadMoreScrollPx: elements.loadMoreScrollPx,
    loadMoreNoChangeThreshold: elements.loadMoreNoChangeThreshold,
    loadMoreButtonSelector: elements.loadMoreButtonSelector,
    loadMoreNextSelector: elements.loadMoreNextSelector,
    queueConcurrency: elements.queueConcurrency,
    queueDelayMs: elements.queueDelayMs,
    queuePageTimeoutMs: elements.queuePageTimeoutMs,
    queueRetries: elements.queueRetries,
    queueRetryDelayMs: elements.queueRetryDelayMs,
    queueJitterMs: elements.queueJitterMs,
    queueReliabilityProfile: elements.queueReliabilityProfile,
    queueBackoffStrategy: elements.queueBackoffStrategy,
    queueJitterMode: elements.queueJitterMode,
    queueRetryMinDelayMs: elements.queueRetryMinDelayMs,
    queueRetryMaxDelayMs: elements.queueRetryMaxDelayMs,
    queueSessionReuseMode: elements.queueSessionReuseMode,
    queueWaitSelector: elements.queueWaitSelector,
    queueWaitSelectorTimeoutMs: elements.queueWaitSelectorTimeoutMs,
    queueWaitPageLoad: elements.queueWaitPageLoad,
    emailDeepScanEnabled: elements.emailDeepScanEnabled,
    emailDeepMaxDepth: elements.emailDeepMaxDepth,
    emailDeepMaxLinksPerPage: elements.emailDeepMaxLinksPerPage,
    emailDeepSameDomainOnly: elements.emailDeepSameDomainOnly,
    emailDeepLinkSelector: elements.emailDeepLinkSelector,
    emailRemoveDuplicates: elements.emailRemoveDuplicates,
    emailToLowercase: elements.emailToLowercase,
    emailBasicValidation: elements.emailBasicValidation,
    emailIncludeMailto: elements.emailIncludeMailto,
    emailDomainFilters: elements.emailDomainFilters,
    phoneRemoveDuplicates: elements.phoneRemoveDuplicates,
    phoneBasicValidation: elements.phoneBasicValidation,
    phonePatterns: elements.phonePatterns,
    textIncludeMetadata: elements.textIncludeMetadata,
    textMaxContentChars: elements.textMaxContentChars,
    mapsIncludeBasicInfo: elements.mapsIncludeBasicInfo,
    mapsIncludeContactDetails: elements.mapsIncludeContactDetails,
    mapsIncludeReviews: elements.mapsIncludeReviews,
    mapsIncludeHours: elements.mapsIncludeHours,
    mapsIncludeLocation: elements.mapsIncludeLocation,
    mapsIncludeImages: elements.mapsIncludeImages,
    metadataIncludeMetaTags: elements.metadataIncludeMetaTags,
    metadataIncludeJsonLd: elements.metadataIncludeJsonLd,
    metadataIncludeReviewSignals: elements.metadataIncludeReviewSignals,
    metadataIncludeContactSignals: elements.metadataIncludeContactSignals,
    metadataIncludeRawJsonLd: elements.metadataIncludeRawJsonLd,
    cloudFeaturesOptIn: elements.cloudFeaturesOptIn,
    cloudWebhookOptIn: elements.cloudWebhookOptIn,
    cloudConsentVersion: elements.cloudConsentVersion,
    observabilityApiKey: elements.observabilityApiKey
  };

  for (const [key, control] of Object.entries(controlBindings)) {
    if (!Object.prototype.hasOwnProperty.call(controls, key)) continue;
    applyTemplateControlValue(control, controls[key]);
  }

  state.listFields = Array.isArray(data.listFields) ? data.listFields.map((item) => ({ ...item })) : [];
  state.pageFields = Array.isArray(data.pageFields) ? data.pageFields.map((item) => ({ ...item })) : [];
  renderListFields();
  renderPageFields();
  applySpeedProfileDefaults(elements.speedProfile.value, {
    preserveManualOverrides: true
  });
  syncReliabilitySettingsFromControls({
    persist: false
  });
  updatePageSourceUi();
  updatePageActionUi();
}

function findSelectedTemplate() {
  const templateId = String(elements.templateSelect.value || "").trim();
  if (!templateId) return null;
  return state.templates.find((item) => item.id === templateId) || null;
}

function buildScheduleInputFromForm() {
  const scheduleKind = String(elements.scheduleKind.value || "interval").trim();
  const payload = {
    name: String(elements.scheduleName.value || "").trim(),
    scheduleKind,
    intervalMinutes: Number(elements.scheduleIntervalMinutes.value || 0),
    cronExpr: String(elements.scheduleCronExpr.value || "").trim(),
    timezone: String(elements.scheduleTimezone.value || "").trim() || "UTC",
    targetJobType: String(elements.scheduleTargetJobType.value || "").trim(),
    targetPayload: parseJsonInput(elements.scheduleTargetPayload.value, "Schedule target payload"),
    isActive: true
  };
  if (scheduleKind !== "interval") {
    delete payload.intervalMinutes;
  }
  if (scheduleKind !== "cron") {
    delete payload.cronExpr;
  }
  return payload;
}

function buildWebhookJobPayloadTemplate(source = "manual-test") {
  return {
    targetUrl: "https://httpbin.org/status/204",
    eventType: "datascrap.test",
    metadata: {
      source
    }
  };
}

function buildExtractionSummaryJobPayloadTemplate(source = "manual-test") {
  return {
    targetUrl: "https://example.com",
    extract: {
      includeTitle: true,
      includeMetaDescription: true,
      includeWordCount: true,
      includeHeadings: true,
      includeLinks: true,
      includeCanonical: true
    },
    request: {
      timeoutMs: 15000
    },
    metadata: {
      source
    }
  };
}

function buildMonitorDiffJobPayloadTemplate(source = "manual-test") {
  return {
    targetUrl: "https://example.com",
    monitorKey: "example-homepage",
    compare: {
      includeTitle: true,
      includeMetaDescription: true,
      includeCanonical: true,
      includeWordCount: true,
      includeHeadings: true,
      includeLinks: true,
      includeLang: true,
      includeStatusCode: true,
      includeContentType: true
    },
    request: {
      timeoutMs: 15000
    },
    notify: {
      webhook: {
        targetUrl: "https://httpbin.org/status/204",
        eventType: "datascrap.monitor.page.changed"
      }
    },
    metadata: {
      source
    }
  };
}

function applyJobsPreset(presetKey) {
  if (presetKey === "monitor_diff") {
    elements.jobsJobType.value = "monitor.page.diff";
    elements.jobsPayload.value = JSON.stringify(buildMonitorDiffJobPayloadTemplate("jobs-manual"), null, 2);
    setCloudStatus("Jobs payload preset applied: monitor diff");
    return;
  }
  if (presetKey === "extract_summary") {
    elements.jobsJobType.value = "extraction.page.summary";
    elements.jobsPayload.value = JSON.stringify(buildExtractionSummaryJobPayloadTemplate("jobs-manual"), null, 2);
    setCloudStatus("Jobs payload preset applied: extraction summary");
    return;
  }
  elements.jobsJobType.value = "integration.webhook.deliver";
  elements.jobsPayload.value = JSON.stringify(buildWebhookJobPayloadTemplate("jobs-manual"), null, 2);
  setCloudStatus("Jobs payload preset applied: webhook");
}

function applySchedulePreset(presetKey) {
  if (presetKey === "monitor_diff") {
    elements.scheduleTargetJobType.value = "monitor.page.diff";
    elements.scheduleTargetPayload.value = JSON.stringify(buildMonitorDiffJobPayloadTemplate("schedule"), null, 2);
    setCloudStatus("Schedule payload preset applied: monitor diff");
    return;
  }
  if (presetKey === "extract_summary") {
    elements.scheduleTargetJobType.value = "extraction.page.summary";
    elements.scheduleTargetPayload.value = JSON.stringify(buildExtractionSummaryJobPayloadTemplate("schedule"), null, 2);
    setCloudStatus("Schedule payload preset applied: extraction summary");
    return;
  }
  elements.scheduleTargetJobType.value = "integration.webhook.deliver";
  elements.scheduleTargetPayload.value = JSON.stringify(buildWebhookJobPayloadTemplate("schedule"), null, 2);
  setCloudStatus("Schedule payload preset applied: webhook");
}

function applyIntegrationPreset(presetKey) {
  if (presetKey === "airtable") {
    elements.integrationProvider.value = "airtable";
    elements.integrationSecretName.value = "api_key";
    if (!String(elements.integrationSecretLabel.value || "").trim()) {
      elements.integrationSecretLabel.value = "Airtable API Key";
    }
    if (!String(elements.integrationTestTargetUrl.value || "").trim()) {
      elements.integrationTestTargetUrl.value = "https://httpbin.org/status/204";
    }
    setCloudStatus("Integration preset applied: airtable");
    return;
  }
  if (presetKey === "n8n") {
    elements.integrationProvider.value = "n8n";
    elements.integrationSecretName.value = "webhook_signing_key";
    if (!String(elements.integrationSecretLabel.value || "").trim()) {
      elements.integrationSecretLabel.value = "n8n Webhook Signing Key";
    }
    if (!String(elements.integrationTestTargetUrl.value || "").trim()) {
      elements.integrationTestTargetUrl.value = "https://httpbin.org/status/204";
    }
    setCloudStatus("Integration preset applied: n8n");
    return;
  }
  elements.integrationProvider.value = "webhook";
  elements.integrationSecretName.value = "webhook_signing_key";
  if (!String(elements.integrationSecretLabel.value || "").trim()) {
    elements.integrationSecretLabel.value = "Webhook Signing Key";
  }
  if (!String(elements.integrationTestTargetUrl.value || "").trim()) {
    elements.integrationTestTargetUrl.value = "https://httpbin.org/status/204";
  }
  setCloudStatus("Integration preset applied: webhook");
}

function updateIntegrationTestUi() {
  const placement = String(elements.integrationTestSecretPlacement.value || "authorization_bearer").trim().toLowerCase();
  const usesHeader = placement === "header";
  elements.integrationTestHeaderName.disabled = !usesHeader;
  if (!usesHeader) {
    elements.integrationTestHeaderName.value = String(elements.integrationTestHeaderName.value || "x-api-key").trim() || "x-api-key";
  }
}

async function onCloudPolicyLoad() {
  setCloudStatus("Loading cloud policy...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_CLOUD_POLICY_GET_REQUEST);
    const policy = response.policy || null;
    state.cloudPolicy = policy;
    elements.cloudFeaturesOptIn.checked = Boolean(policy?.cloudFeaturesOptIn);
    elements.cloudWebhookOptIn.checked = Boolean(policy?.webhookDeliveryOptIn);
    if (policy?.consentVersion) {
      elements.cloudConsentVersion.value = String(policy.consentVersion);
    }
    setCloudStatus("Cloud policy loaded");
    trackUiEvent("cloud_policy_loaded", {
      cloudFeaturesOptIn: Boolean(policy?.cloudFeaturesOptIn),
      webhookDeliveryOptIn: Boolean(policy?.webhookDeliveryOptIn)
    });
  } catch (error) {
    setCloudStatus(`Cloud policy load failed: ${error.message}`, {
      error: true
    });
  }
}

async function onCloudPolicySave() {
  setCloudStatus("Saving cloud policy...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_CLOUD_POLICY_SET_REQUEST, {
      cloudFeaturesOptIn: Boolean(elements.cloudFeaturesOptIn.checked),
      webhookDeliveryOptIn: Boolean(elements.cloudWebhookOptIn.checked),
      consentVersion: String(elements.cloudConsentVersion.value || "").trim()
    });
    state.cloudPolicy = response.policy || null;
    setCloudStatus("Cloud policy saved");
    trackUiEvent("cloud_policy_saved", {
      cloudFeaturesOptIn: Boolean(state.cloudPolicy?.cloudFeaturesOptIn),
      webhookDeliveryOptIn: Boolean(state.cloudPolicy?.webhookDeliveryOptIn)
    });
  } catch (error) {
    setCloudStatus(`Cloud policy save failed: ${error.message}`, {
      error: true
    });
  }
}

async function onIntegrationsList() {
  setCloudStatus("Loading integration secrets...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_INTEGRATIONS_LIST_REQUEST);
    state.integrationSecrets = Array.isArray(response.items) ? response.items : [];
    renderIntegrationSecrets();
    setCloudStatus(`Loaded integration secrets: ${state.integrationSecrets.length}`);
  } catch (error) {
    setCloudStatus(`Integrations list failed: ${error.message}`, {
      error: true
    });
  }
}

async function onIntegrationsUpsert() {
  setCloudStatus("Saving integration secret...");
  try {
    await sendMessage(MESSAGE_TYPES.ACTIVATION_INTEGRATIONS_UPSERT_REQUEST, {
      provider: String(elements.integrationProvider.value || "").trim(),
      secretName: String(elements.integrationSecretName.value || "").trim(),
      secretValue: String(elements.integrationSecretValue.value || ""),
      label: String(elements.integrationSecretLabel.value || "").trim()
    });
    elements.integrationSecretValue.value = "";
    await onIntegrationsList();
    setCloudStatus("Integration secret saved");
  } catch (error) {
    setCloudStatus(`Integration upsert failed: ${error.message}`, {
      error: true
    });
  }
}

async function onIntegrationsRemove() {
  const provider = String(elements.integrationProvider.value || "").trim();
  const secretName = String(elements.integrationSecretName.value || "").trim();
  if (!provider || !secretName) {
    setCloudStatus("Provider and secret name are required to remove a secret", {
      error: true
    });
    return;
  }
  setCloudStatus(`Removing secret ${provider}/${secretName}...`);
  try {
    await sendMessage(MESSAGE_TYPES.ACTIVATION_INTEGRATIONS_REMOVE_REQUEST, {
      provider,
      secretName
    });
    await onIntegrationsList();
    setCloudStatus("Integration secret removed");
  } catch (error) {
    setCloudStatus(`Integration remove failed: ${error.message}`, {
      error: true
    });
  }
}

async function onIntegrationsTest() {
  const provider = String(elements.integrationProvider.value || "").trim();
  const secretName = String(elements.integrationSecretName.value || "").trim();
  const targetUrl = String(elements.integrationTestTargetUrl.value || "").trim();
  if (!provider || !secretName || !targetUrl) {
    setCloudStatus("Provider, secret name, and test target URL are required", {
      error: true
    });
    return;
  }

  setCloudStatus(`Testing integration ${provider}/${secretName}...`);
  try {
    const body = parseJsonInput(elements.integrationTestBody.value, "Integration test body");
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_INTEGRATIONS_TEST_REQUEST, {
      provider,
      secretName,
      targetUrl,
      method: String(elements.integrationTestMethod.value || "POST").trim().toUpperCase(),
      timeoutMs: 8000,
      secretPlacement: String(elements.integrationTestSecretPlacement.value || "authorization_bearer").trim(),
      headerName: String(elements.integrationTestHeaderName.value || "x-api-key").trim(),
      headers: {},
      body
    });
    const result = response.result || null;
    setObservabilityOutput({
      integrationTest: result
    });
    setCloudStatus(
      result?.ok
        ? `Integration test passed (${result.statusCode})`
        : `Integration test response (${result?.statusCode || "unknown"})`,
      {
        error: !result?.ok
      }
    );
    appendLog("integration test result", result || {});
  } catch (error) {
    setCloudStatus(`Integration test failed: ${error.message}`, {
      error: true
    });
  }
}

async function onJobsPolicy() {
  setCloudStatus("Loading jobs policy...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_JOBS_POLICY_REQUEST);
    const summary = {
      policy: response.policy || null,
      queue: response.queue || null,
      supportedJobTypes: Array.isArray(response.supportedJobTypes) ? response.supportedJobTypes : []
    };
    setObservabilityOutput(summary);
    setCloudStatus("Jobs policy loaded");
  } catch (error) {
    setCloudStatus(`Jobs policy failed: ${error.message}`, {
      error: true
    });
  }
}

async function onJobsEnqueue() {
  setCloudStatus("Enqueuing job...");
  try {
    const payload = parseJsonInput(elements.jobsPayload.value, "Jobs payload");
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_JOBS_ENQUEUE_REQUEST, {
      jobType: String(elements.jobsJobType.value || "").trim(),
      payload
    });
    setCloudStatus(`Job enqueued: ${response.job?.id || "unknown"}`);
    await onJobsList();
  } catch (error) {
    setCloudStatus(`Job enqueue failed: ${error.message}`, {
      error: true
    });
  }
}

async function onJobsList() {
  setCloudStatus("Loading jobs...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_JOBS_LIST_REQUEST, {
      limit: 50
    });
    state.cloudJobs = Array.isArray(response.items) ? response.items : [];
    renderJobs(state.cloudJobs);
    setCloudStatus(`Jobs loaded: ${state.cloudJobs.length}`);
  } catch (error) {
    setCloudStatus(`Jobs list failed: ${error.message}`, {
      error: true
    });
  }
}

async function onJobsDeadList() {
  setCloudStatus("Loading dead-letter jobs...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_JOBS_DEAD_LIST_REQUEST, {
      limit: 50
    });
    state.cloudDeadJobs = Array.isArray(response.items) ? response.items : [];
    renderJobs(state.cloudDeadJobs, {
      deadLetter: true
    });
    setCloudStatus(`Dead-letter jobs loaded: ${state.cloudDeadJobs.length}`);
  } catch (error) {
    setCloudStatus(`Dead-letter list failed: ${error.message}`, {
      error: true
    });
  }
}

async function onJobsCancel() {
  const jobId = String(elements.jobsCancelId.value || "").trim();
  if (!jobId) {
    setCloudStatus("jobId is required for cancel", {
      error: true
    });
    return;
  }
  setCloudStatus(`Cancelling job ${jobId}...`);
  try {
    await sendMessage(MESSAGE_TYPES.ACTIVATION_JOBS_CANCEL_REQUEST, {
      jobId
    });
    await onJobsList();
    setCloudStatus(`Job cancel requested: ${jobId}`);
  } catch (error) {
    setCloudStatus(`Job cancel failed: ${error.message}`, {
      error: true
    });
  }
}

async function onSchedulesCreate() {
  setCloudStatus("Creating schedule...");
  try {
    const input = buildScheduleInputFromForm();
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_SCHEDULES_CREATE_REQUEST, {
      input
    });
    const createdId = response.schedule?.id || "unknown";
    setCloudStatus(`Schedule created: ${createdId}`);
    await onSchedulesList();
  } catch (error) {
    setCloudStatus(`Schedule create failed: ${error.message}`, {
      error: true
    });
  }
}

async function onSchedulesList(activeOnly = false) {
  setCloudStatus(`Loading schedules (${activeOnly ? "active" : "all"})...`);
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_SCHEDULES_LIST_REQUEST, {
      activeOnly,
      limit: 50
    });
    state.cloudSchedules = Array.isArray(response.items) ? response.items : [];
    renderSchedules();
    setCloudStatus(`Schedules loaded: ${state.cloudSchedules.length}`);
  } catch (error) {
    setCloudStatus(`Schedules list failed: ${error.message}`, {
      error: true
    });
  }
}

async function onScheduleToggle() {
  const scheduleId = String(elements.scheduleActionId.value || "").trim();
  if (!scheduleId) {
    setCloudStatus("scheduleId is required to toggle", {
      error: true
    });
    return;
  }
  setCloudStatus(`Toggling schedule ${scheduleId}...`);
  try {
    await sendMessage(MESSAGE_TYPES.ACTIVATION_SCHEDULES_TOGGLE_REQUEST, {
      scheduleId,
      isActive: Boolean(elements.scheduleToggleActive.checked)
    });
    await onSchedulesList();
    setCloudStatus(`Schedule toggled: ${scheduleId}`);
  } catch (error) {
    setCloudStatus(`Schedule toggle failed: ${error.message}`, {
      error: true
    });
  }
}

async function onScheduleRunNow() {
  const scheduleId = String(elements.scheduleActionId.value || "").trim();
  if (!scheduleId) {
    setCloudStatus("scheduleId is required to run now", {
      error: true
    });
    return;
  }
  setCloudStatus(`Running schedule ${scheduleId} now...`);
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_SCHEDULES_RUN_NOW_REQUEST, {
      scheduleId
    });
    setCloudStatus(`Run-now enqueued: ${response.job?.id || "unknown"}`);
    await onJobsList();
  } catch (error) {
    setCloudStatus(`Schedule run-now failed: ${error.message}`, {
      error: true
    });
  }
}

async function onScheduleRemove() {
  const scheduleId = String(elements.scheduleActionId.value || "").trim();
  if (!scheduleId) {
    setCloudStatus("scheduleId is required to remove", {
      error: true
    });
    return;
  }
  setCloudStatus(`Removing schedule ${scheduleId}...`);
  try {
    await sendMessage(MESSAGE_TYPES.ACTIVATION_SCHEDULES_REMOVE_REQUEST, {
      scheduleId
    });
    await onSchedulesList();
    setCloudStatus(`Schedule removed: ${scheduleId}`);
  } catch (error) {
    setCloudStatus(`Schedule remove failed: ${error.message}`, {
      error: true
    });
  }
}

async function onObservabilityDashboard() {
  setCloudStatus("Loading observability dashboard...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_OBSERVABILITY_DASHBOARD_REQUEST, {
      observabilityApiKey: getObservabilityApiKey()
    });
    setObservabilityOutput(response.dashboard || {});
    setCloudStatus("Observability dashboard loaded");
  } catch (error) {
    setCloudStatus(`Observability dashboard failed: ${error.message}`, {
      error: true
    });
  }
}

async function onObservabilitySlo() {
  setCloudStatus("Loading SLO snapshot...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_OBSERVABILITY_SLO_REQUEST, {
      observabilityApiKey: getObservabilityApiKey()
    });
    setObservabilityOutput(response.slo || {});
    setCloudStatus("SLO snapshot loaded");
  } catch (error) {
    setCloudStatus(`SLO request failed: ${error.message}`, {
      error: true
    });
  }
}

async function onObservabilityErrors() {
  setCloudStatus("Loading recent errors...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_OBSERVABILITY_ERRORS_REQUEST, {
      observabilityApiKey: getObservabilityApiKey(),
      limit: 50
    });
    setObservabilityOutput({
      summary: response.summary || null,
      items: response.items || []
    });
    setCloudStatus("Recent errors loaded");
  } catch (error) {
    setCloudStatus(`Error stream request failed: ${error.message}`, {
      error: true
    });
  }
}

async function onObservabilityJobs() {
  setCloudStatus("Loading observability jobs view...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.ACTIVATION_OBSERVABILITY_JOBS_REQUEST, {
      observabilityApiKey: getObservabilityApiKey()
    });
    setObservabilityOutput(response.jobs || {});
    setCloudStatus("Observability jobs loaded");
  } catch (error) {
    setCloudStatus(`Observability jobs request failed: ${error.message}`, {
      error: true
    });
  }
}

async function onCloudRefreshAll() {
  await onCloudPolicyLoad();
  await onIntegrationsList();
  await onJobsList();
  await onSchedulesList();
}

function buildTemplateSchemaLockFromCurrent(payload) {
  const columns = resolveExpectedColumnsForTemplateContext({
    runnerType: payload?.runnerType,
    pageActionType: payload?.pageActionType,
    listFields: payload?.listFields,
    pageFields: payload?.pageFields
  });
  const enabled = Boolean(elements.templateSchemaLockEnabled?.checked) && columns.length > 0;
  return {
    enabled,
    columns,
    runnerType: String(payload?.runnerType || "").trim(),
    pageActionType: String(payload?.pageActionType || "").trim()
  };
}

function applyTemplateMetaControls(template) {
  const sourceDomains = Array.isArray(template?.sourceDomains) ? template.sourceDomains : [];
  elements.templateSourceDomains.value = sourceDomains.join(", ");
  elements.templateSchemaLockEnabled.checked = Boolean(template?.schemaLock?.enabled);
}

function validateTemplateSchemaLock(template) {
  const lock = template?.schemaLock;
  if (!lock || !lock.enabled) return;

  const expected = normalizeStringArray(lock.columns);
  if (expected.length === 0) return;

  const actual = resolveExpectedColumnsForTemplateContext({
    runnerType: elements.runnerType.value,
    pageActionType: elements.pageActionType.value,
    listFields: state.listFields,
    pageFields: state.pageFields
  });
  const actualNormalized = normalizeStringArray(actual);
  const expectedSet = new Set(expected);
  const actualSet = new Set(actualNormalized);
  const missing = expected.filter((column) => !actualSet.has(column));
  const extra = actualNormalized.filter((column) => !expectedSet.has(column));
  if (missing.length === 0 && extra.length === 0) return;

  const parts = [];
  if (missing.length > 0) {
    parts.push(`missing: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    parts.push(`extra: ${extra.join(", ")}`);
  }
  throw new Error(`Template schema lock mismatch (${parts.join(" | ")})`);
}

function toSerializableTemplate(template) {
  const normalized = normalizeTemplateRecord(template);
  return {
    id: normalized.id,
    name: normalized.name,
    notes: normalized.notes,
    sourceDomains: normalized.sourceDomains,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    payload: normalized.payload,
    schemaLock: normalized.schemaLock
  };
}

function buildTemplateBundle(templates, scope = "selected") {
  const items = (Array.isArray(templates) ? templates : [])
    .filter(Boolean)
    .map((template) => toSerializableTemplate(template));
  return {
    type: TEMPLATE_BUNDLE_TYPE,
    version: TEMPLATE_BUNDLE_VERSION,
    scope,
    exportedAt: new Date().toISOString(),
    templateCount: items.length,
    templates: items
  };
}

function parseTemplateBundleInput(parsed) {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Template import JSON must be an object, array, or bundle");
  }
  if (Array.isArray(parsed.templates)) {
    return parsed.templates;
  }
  if (parsed.payload && typeof parsed.payload === "object") {
    return [parsed];
  }
  throw new Error("Template import JSON does not include templates");
}

function ensureUniqueTemplateId(templateId, usedIds) {
  let next = String(templateId || randomId("template")).trim();
  while (!next || usedIds.has(next)) {
    next = randomId("template");
  }
  usedIds.add(next);
  return next;
}

function onTemplateSave() {
  const name = String(elements.templateName.value || "").trim();
  if (!name) {
    setTemplatesStatus("Template name is required", {
      error: true
    });
    return;
  }

  const notes = String(elements.templateNotes.value || "").trim();
  const payload = extractCommonTemplateControls();
  const sourceDomains = normalizeStringArray(elements.templateSourceDomains.value, {
    lowerCase: true
  });
  const schemaLock = buildTemplateSchemaLockFromCurrent(payload);
  const templateId = randomId("template");
  const now = new Date().toISOString();

  state.templates.unshift(
    normalizeTemplateRecord({
    id: templateId,
    name,
    notes,
    sourceDomains,
    schemaLock,
    payload,
    createdAt: now,
    updatedAt: now
    })
  );
  state.templates = state.templates.slice(0, TEMPLATE_LIMIT);
  saveTemplatesToStorage();
  renderTemplates();
  elements.templateSelect.value = templateId;
  applyTemplateMetaControls(state.templates[0]);
  setTemplatesStatus(`Template saved: ${name} (${schemaLock.enabled ? "schema lock on" : "schema lock off"})`);
}

function onTemplateApply() {
  const template = findSelectedTemplate();
  if (!template) {
    setTemplatesStatus("Choose a template to apply", {
      error: true
    });
    return;
  }
  applyTemplatePayload(template.payload);
  applyTemplateMetaControls(template);
  setTemplatesStatus(`Template applied: ${template.name}`);
}

async function onTemplateRun() {
  const template = findSelectedTemplate();
  if (!template) {
    setTemplatesStatus("Choose a template to run", {
      error: true
    });
    return;
  }
  try {
    applyTemplatePayload(template.payload);
    applyTemplateMetaControls(template);
    validateTemplateSchemaLock(template);
    setTemplatesStatus(`Running template: ${template.name}`);
    await onStart();
  } catch (error) {
    setTemplatesStatus(`Template run blocked: ${error.message}`, {
      error: true
    });
  }
}

function onTemplateDelete() {
  const template = findSelectedTemplate();
  if (!template) {
    setTemplatesStatus("Choose a template to delete", {
      error: true
    });
    return;
  }
  state.templates = state.templates.filter((item) => item.id !== template.id);
  saveTemplatesToStorage();
  renderTemplates();
  setTemplatesStatus(`Template deleted: ${template.name}`);
}

function onTemplateExportSelected() {
  const template = findSelectedTemplate();
  if (!template) {
    setTemplatesStatus("Choose a template to export", {
      error: true
    });
    return;
  }
  const bundle = buildTemplateBundle([template], "selected");
  const safeName = String(template.name || "template")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "template";
  const filename = `datascrap-template-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
  downloadTextFile(filename, JSON.stringify(bundle, null, 2));
  setTemplatesStatus(`Template exported: ${template.name}`);
}

function onTemplateExportAll() {
  if (state.templates.length === 0) {
    setTemplatesStatus("No templates to export", {
      error: true
    });
    return;
  }
  const bundle = buildTemplateBundle(state.templates, "all");
  const filename = `datascrap-templates-all-${new Date().toISOString().slice(0, 10)}.json`;
  downloadTextFile(filename, JSON.stringify(bundle, null, 2));
  setTemplatesStatus(`Exported ${state.templates.length} templates`);
}

async function onTemplateImportFromFile(file) {
  if (!file) {
    setTemplatesStatus("Choose a JSON file to import", {
      error: true
    });
    return;
  }
  setTemplatesStatus("Importing templates...");
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const records = parseTemplateBundleInput(parsed);
    const imported = [];
    const usedIds = new Set(state.templates.map((item) => item.id));
    const now = new Date().toISOString();
    for (const raw of records) {
      if (!raw || typeof raw !== "object") continue;
      const normalized = normalizeTemplateRecord({
        ...raw,
        createdAt: raw.createdAt || now,
        updatedAt: now
      });
      normalized.id = ensureUniqueTemplateId(normalized.id, usedIds);
      imported.push(normalized);
    }
    if (imported.length === 0) {
      throw new Error("No valid templates found in import file");
    }
    state.templates = [...imported, ...state.templates].slice(0, TEMPLATE_LIMIT);
    saveTemplatesToStorage();
    renderTemplates();
    elements.templateSelect.value = imported[0].id;
    applyTemplateMetaControls(imported[0]);
    setTemplatesStatus(`Imported ${imported.length} templates`);
  } catch (error) {
    setTemplatesStatus(`Template import failed: ${error.message}`, {
      error: true
    });
  } finally {
    if (elements.templateImportFile) {
      elements.templateImportFile.value = "";
    }
  }
}

function buildDiagnosticsRunArtifactSummary(snapshot) {
  const runArtifacts = Array.isArray(snapshot?.runArtifacts) ? snapshot.runArtifacts : [];
  const failedArtifacts = Array.isArray(snapshot?.failedArtifacts) ? snapshot.failedArtifacts : [];
  const statusCounts = {
    running: 0,
    completed: 0,
    stopped: 0,
    error: 0,
    other: 0
  };

  for (const artifact of runArtifacts) {
    const status = String(artifact?.status || "").trim().toLowerCase();
    if (status === AUTOMATION_STATES.RUNNING) statusCounts.running += 1;
    else if (status === AUTOMATION_STATES.COMPLETED) statusCounts.completed += 1;
    else if (status === AUTOMATION_STATES.STOPPED) statusCounts.stopped += 1;
    else if (status === AUTOMATION_STATES.ERROR) statusCounts.error += 1;
    else statusCounts.other += 1;
  }

  const latestArtifact = runArtifacts[0] || null;
  const latestFailure = failedArtifacts[0] || runArtifacts.find((item) => item?.errorPacket) || null;
  return {
    total: runArtifacts.length,
    failedTotal: failedArtifacts.length,
    statusCounts,
    latestAutomationId: latestArtifact?.automationId || null,
    latestFailureAutomationId: latestFailure?.automationId || null,
    latestFailureError: latestFailure?.errorPacket || null,
    recentEventSummary: snapshot?.recentEventSummary || null
  };
}

function buildDiagnosticsContextPayload() {
  return {
    activeTool: state.activeTool,
    activeShellView: state.activeShellView,
    currentStatus: state.currentStatus,
    templateCount: state.templates.length,
    cloudPolicyLoaded: Boolean(state.cloudPolicy),
    cloudJobsLoaded: state.cloudJobs.length,
    cloudSchedulesLoaded: state.cloudSchedules.length
  };
}

async function onDiagnosticsSnapshot() {
  setTemplatesStatus("Loading runtime snapshot...");
  try {
    const snapshot = await sendMessage(MESSAGE_TYPES.SNAPSHOT_REQUEST);
    const runArtifactSummary = buildDiagnosticsRunArtifactSummary(snapshot);
    state.diagnosticsReport = {
      generatedAt: new Date().toISOString(),
      snapshot,
      activation: await sendMessage(MESSAGE_TYPES.ACTIVATION_SESSION_GET_REQUEST),
      runArtifactSummary,
      context: buildDiagnosticsContextPayload()
    };
    setDiagnosticsOutput(state.diagnosticsReport);
    setTemplatesStatus(
      `Runtime snapshot loaded (${runArtifactSummary.total} artifacts, ${runArtifactSummary.failedTotal} failures)`
    );
  } catch (error) {
    setTemplatesStatus(`Snapshot failed: ${error.message}`, {
      error: true
    });
  }
}

async function onDiagnosticsReport() {
  setTemplatesStatus("Generating diagnostics report...");
  try {
    const snapshot = await sendMessage(MESSAGE_TYPES.SNAPSHOT_REQUEST);
    const activation = await sendMessage(MESSAGE_TYPES.ACTIVATION_SESSION_GET_REQUEST);
    const runArtifactSummary = buildDiagnosticsRunArtifactSummary(snapshot);
    state.diagnosticsReport = {
      generatedAt: new Date().toISOString(),
      snapshot,
      runArtifactSummary,
      recentEventSummary: snapshot?.recentEventSummary || null,
      activation,
      context: buildDiagnosticsContextPayload(),
      templatePayloadPreview: extractCommonTemplateControls(),
      cloudSummary: {
        policy: state.cloudPolicy,
        integrationSecrets: state.integrationSecrets.length,
        jobs: state.cloudJobs.length,
        deadJobs: state.cloudDeadJobs.length,
        schedules: state.cloudSchedules.length
      },
      eventLogLines: String(elements.eventLog.textContent || "")
        .split("\n")
        .filter(Boolean)
        .slice(-200)
    };
    setDiagnosticsOutput(state.diagnosticsReport);
    setTemplatesStatus(
      `Diagnostics report generated (${runArtifactSummary.total} artifacts, ${runArtifactSummary.failedTotal} failures)`
    );
  } catch (error) {
    setTemplatesStatus(`Report generation failed: ${error.message}`, {
      error: true
    });
  }
}

async function onDiagnosticsCopy() {
  if (!state.diagnosticsReport) {
    setTemplatesStatus("Generate a diagnostics report first", {
      error: true
    });
    return;
  }
  try {
    await navigator.clipboard.writeText(JSON.stringify(state.diagnosticsReport, null, 2));
    setTemplatesStatus("Diagnostics report copied to clipboard");
  } catch (error) {
    setTemplatesStatus(`Clipboard copy failed: ${error.message}`, {
      error: true
    });
  }
}

async function hydrateSnapshot() {
  const snapshot = await sendMessage(MESSAGE_TYPES.SNAPSHOT_REQUEST);
  const events = Array.isArray(snapshot.recentEvents) ? snapshot.recentEvents : [];
  if (events.length > 0) {
    for (const event of events.slice(-20)) {
      appendLog(`snapshot: ${event.eventType}`, event.payload || {});
    }
    const lastEvent = events[events.length - 1];
    const automationId = lastEvent?.payload?.automationId || null;
    state.currentAutomationId = automationId;
    if (automationId) {
      state.lastTerminalAutomationId = automationId;
    }
    setStatus(resolveStatusFromEvent(lastEvent));
    return;
  }
  setStatus(AUTOMATION_STATES.IDLE);
}

async function startPicker({ mode, multiSelect, anchorSelector = "", prompt = "", purpose, preferredUrl = "" }) {
  try {
    const preferred = String(preferredUrl || elements.startUrl.value || "").trim();
    const response = await sendMessage(MESSAGE_TYPES.PICKER_START_REQUEST, {
      mode,
      multiSelect,
      anchorSelector,
      prompt,
      preferredUrl: preferred
    });
    const session = response?.session || null;
    if (!session?.sessionId) {
      throw new Error("Picker did not return session id");
    }
    state.pickerSessionPurposeById.set(session.sessionId, purpose);
    setPickerStatus(`${mode} requested`);
    appendLog("picker request accepted", {
      mode,
      sessionId: session.sessionId
    });
    return {
      ok: true,
      session
    };
  } catch (error) {
    setPickerStatus("error");
    const message = friendlyErrorText(error?.message || "Failed to start picker");
    appendLog(`picker start failed: ${message}`);
    return {
      ok: false,
      error: message
    };
  }
}

async function onListAutoDetect(options = {}) {
  setListAutoDetectStatus("Auto-detecting list setup...");
  try {
    const nextOptions = {
      maxFields: 8,
      maxPreviewRows: 5,
      minItems: 3,
      ...(options && typeof options === "object" ? options : {})
    };
    const response = await sendMessage(MESSAGE_TYPES.LIST_AUTODETECT_REQUEST, {
      ...nextOptions
    });

    const fields = Array.isArray(response.fields) ? response.fields : [];
    if (fields.length === 0) {
      throw new Error("No stable fields detected");
    }

    const containerSelector = String(response.containerSelector || "").trim();
    if (!containerSelector) {
      throw new Error("No container selector detected");
    }

    elements.containerSelector.value = containerSelector;
    state.listFields = fields.map((field, index) => createFieldFromAutoDetect(field, index));
    renderListFields();

    const loadMore = response.loadMore || {};
    const loadMoreMethod = String(loadMore.method || "").trim();
    if (loadMoreMethod === LOAD_MORE_METHODS.CLICK_BUTTON || loadMoreMethod === LOAD_MORE_METHODS.NAVIGATE) {
      elements.loadMoreMethod.value = loadMoreMethod;
      if (loadMoreMethod === LOAD_MORE_METHODS.CLICK_BUTTON) {
        elements.loadMoreButtonSelector.value = String(loadMore.buttonSelector || "").trim();
      }
      if (loadMoreMethod === LOAD_MORE_METHODS.NAVIGATE) {
        elements.loadMoreNextSelector.value = String(loadMore.nextLinkSelector || "").trim();
      }
    }

    if (!String(elements.startUrl.value || "").trim() && response.pageUrl) {
      elements.startUrl.value = String(response.pageUrl);
    }

    const confidencePct = Math.round(Number(response.confidence || 0) * 100);
    setListAutoDetectStatus(
      `Auto-detect applied: ${state.listFields.length} fields, ${Number(response.containerCount || 0)} rows, ${confidencePct}% confidence`
    );
    renderListAutoDetectPreview(response);
    trackUiEvent("list_autodetect_applied", {
      fieldCount: state.listFields.length,
      containerCount: Number(response.containerCount || 0),
      confidence: Number(response.confidence || 0)
    });
    appendLog("list auto-detect applied", {
      containerSelector: response.containerSelector,
      fieldCount: state.listFields.length,
      loadMore: response.loadMore || null,
      detectionMs: Number(response.detectionMs || 0)
    });
    return true;
  } catch (error) {
    const message = friendlyErrorText(error?.message || "");
    setListAutoDetectStatus(`Auto-detect failed: ${message}`, {
      error: true
    });
    appendLog(`list auto-detect failed: ${message}`);
    return false;
  }
}

function buildListAutomationConfig(options = {}) {
  const source = options && typeof options === "object" ? options : {};
  const loadMoreOverrides = source.loadMore && typeof source.loadMore === "object" ? source.loadMore : {};
  const startUrl = String(elements.startUrl.value || "").trim();
  const containerSelector = String(elements.containerSelector.value || "").trim();
  if (!containerSelector) {
    throw new Error("Container selector is required for list extraction");
  }
  if (state.listFields.length === 0) {
    throw new Error("Select at least one field before starting list extraction");
  }

  const fields = state.listFields.map((field, index) => ({
    name: normalizeFieldName(field.name, index),
    selector: String(field.selector || "").trim(),
    relativeSelector: String(field.relativeSelector || "").trim(),
    extractMode: field.extractMode || "text",
    attribute: String(field.attribute || "").trim()
  }));

  return {
    startUrl,
    speedProfile: String(elements.speedProfile.value || "normal"),
    speedProfiles: {
      slow: { ...getSpeedProfile("slow") },
      normal: { ...getSpeedProfile("normal") },
      fast: { ...getSpeedProfile("fast") }
    },
    actions: [
      {
        type: "EXTRACT_LIST",
        containerSelector,
        fields
      },
      {
        type: "LOAD_MORE",
        method: String(elements.loadMoreMethod.value || LOAD_MORE_METHODS.NONE).trim(),
        attempts: clamp(parseNumber(loadMoreOverrides.attempts, parseNumber(elements.loadMoreAttempts.value, 5)), 1, 30),
        delayMs: clamp(parseNumber(loadMoreOverrides.delayMs, parseNumber(elements.loadMoreDelayMs.value, 900)), 100, 10000),
        scrollPx: clamp(
          parseNumber(loadMoreOverrides.scrollPx, parseNumber(elements.loadMoreScrollPx.value, 1800)),
          100,
          20000
        ),
        noChangeThreshold: clamp(
          parseNumber(loadMoreOverrides.noChangeThreshold, parseNumber(elements.loadMoreNoChangeThreshold.value, 2)),
          1,
          10
        ),
        buttonSelector: String(elements.loadMoreButtonSelector.value || "").trim(),
        nextLinkSelector: String(elements.loadMoreNextSelector.value || "").trim(),
        maxRows: clamp(parseNumber(loadMoreOverrides.maxRows, 0), 0, 50000),
        untilNoMore: Boolean(loadMoreOverrides.untilNoMore),
        maxRoundsSafety: clamp(parseNumber(loadMoreOverrides.maxRoundsSafety, 0), 0, 500),
        autoContinueSegments: Boolean(loadMoreOverrides.autoContinueSegments),
        autoContinueMaxSegments: clamp(parseNumber(loadMoreOverrides.autoContinueMaxSegments, 1), 1, 50),
        hardRoundCap: clamp(parseNumber(loadMoreOverrides.hardRoundCap, 5000), 100, 10000),
        hardCapAutoContinue: Boolean(loadMoreOverrides.hardCapAutoContinue),
        hardCapAutoContinueMaxChains: clamp(parseNumber(loadMoreOverrides.hardCapAutoContinueMaxChains, 1), 1, 20),
        hardRoundAbsoluteLimit: clamp(parseNumber(loadMoreOverrides.hardRoundAbsoluteLimit, 5000), 100, 50000)
      }
    ]
  };
}

function normalizePageFields() {
  return state.pageFields.map((field, index) => ({
    name: normalizeFieldName(field.name, index),
    selector: String(field.selector || "").trim(),
    relativeSelector: String(field.relativeSelector || "").trim(),
    extractMode: field.extractMode || "text",
    attribute: String(field.attribute || "").trim()
  }));
}

async function resolvePageUrlsBySourceMode(mode) {
  if (mode === URL_SOURCE_MODES.CSV) {
    return state.csvUrls;
  }
  if (mode === URL_SOURCE_MODES.DATASOURCE) {
    if (state.dataSourceUrls.length === 0) {
      await loadDataSourceUrls();
    }
    return state.dataSourceUrls;
  }
  return parseManualUrls(elements.pageManualUrls.value);
}

async function buildPageAutomationConfig(options = {}) {
  const source = options && typeof options === "object" ? options : {};
  const mapsOptionsOverrides =
    source.mapsOptions && typeof source.mapsOptions === "object" ? source.mapsOptions : {};
  const startUrl = String(elements.startUrl.value || "").trim();
  const urlSourceMode = String(elements.pageUrlSourceMode.value || URL_SOURCE_MODES.MANUAL).trim();
  const actionType = String(elements.pageActionType.value || PAGE_ACTION_TYPES.EXTRACT_PAGES).trim();
  const urls = await resolvePageUrlsBySourceMode(urlSourceMode);
  const dedupedUrls = Array.from(new Set(urls.map((item) => String(item || "").trim()).filter(Boolean)));

  if (dedupedUrls.length === 0 && !startUrl) {
    throw new Error("No URLs available for page extraction");
  }

  if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES && state.pageFields.length === 0) {
    throw new Error("Select at least one custom field for EXTRACT_PAGES");
  }

  const queue = {
    maxConcurrentTabs: parseNumber(elements.queueConcurrency.value, 3),
    delayBetweenRequestsMs: parseNumber(elements.queueDelayMs.value, 400),
    pageTimeoutMs: parseNumber(elements.queuePageTimeoutMs.value, 25000),
    maxRetries: parseNumber(elements.queueRetries.value, 1),
    retryDelayMs: parseNumber(elements.queueRetryDelayMs.value, 1200),
    jitterMs: parseNumber(elements.queueJitterMs.value, 220),
    reliability: buildQueueReliabilityConfig(),
    waitForPageLoad: Boolean(elements.queueWaitPageLoad.checked),
    waitForSelector: String(elements.queueWaitSelector.value || "").trim(),
    waitForSelectorTimeoutMs: parseNumber(elements.queueWaitSelectorTimeoutMs.value, 4000)
  };

  const actions = [
    {
      type: actionType,
      fields: actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES ? normalizePageFields() : []
    }
  ];
  if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_EMAIL) {
    actions[0].emailOptions = buildEmailOptions();
  } else if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_PHONE) {
    actions[0].phoneOptions = buildPhoneOptions();
  } else if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_TEXT) {
    actions[0].textOptions = buildTextOptions();
  } else if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_GOOGLE_MAPS) {
    actions[0].mapsOptions = buildMapsOptions(mapsOptionsOverrides);
  }

  return {
    startUrl,
    urls: dedupedUrls.length > 0 ? dedupedUrls : [startUrl],
    urlSourceMode,
    pageActionType: actionType,
    actions,
    queue,
    dataSource: {
      tableDataId: String(elements.pageDatasourceSelect.value || "").trim(),
      selectedColumn: String(elements.pageDatasourceColumn.value || "").trim()
    }
  };
}

async function buildMetadataAutomationConfig() {
  const startUrl = String(elements.startUrl.value || "").trim();
  const urlSourceMode = String(elements.pageUrlSourceMode.value || URL_SOURCE_MODES.MANUAL).trim();
  const urls = await resolvePageUrlsBySourceMode(urlSourceMode);
  const dedupedUrls = Array.from(new Set(urls.map((item) => String(item || "").trim()).filter(Boolean)));
  if (dedupedUrls.length === 0 && !startUrl) {
    throw new Error("No URLs available for metadata extraction");
  }

  const queue = {
    maxConcurrentTabs: parseNumber(elements.queueConcurrency.value, 2),
    delayBetweenRequestsMs: parseNumber(elements.queueDelayMs.value, 300),
    pageTimeoutMs: parseNumber(elements.queuePageTimeoutMs.value, 25000),
    maxRetries: parseNumber(elements.queueRetries.value, 1),
    retryDelayMs: parseNumber(elements.queueRetryDelayMs.value, 1000),
    jitterMs: parseNumber(elements.queueJitterMs.value, 200),
    reliability: buildQueueReliabilityConfig(),
    waitForPageLoad: Boolean(elements.queueWaitPageLoad.checked),
    waitForSelector: String(elements.queueWaitSelector.value || "").trim(),
    waitForSelectorTimeoutMs: parseNumber(elements.queueWaitSelectorTimeoutMs.value, 4000)
  };

  return {
    startUrl,
    urls: dedupedUrls.length > 0 ? dedupedUrls : [startUrl],
    urlSourceMode,
    queue,
    metadata: buildMetadataOptions(),
    dataSource: {
      tableDataId: String(elements.pageDatasourceSelect.value || "").trim(),
      selectedColumn: String(elements.pageDatasourceColumn.value || "").trim()
    }
  };
}

function resolveToolStartEventName(runnerType, actionType) {
  if (runnerType === RUNNER_TYPES.LIST_EXTRACTOR) return "list_extraction_started";
  if (runnerType === RUNNER_TYPES.METADATA_EXTRACTOR) return "text_extraction_started";
  if (runnerType !== RUNNER_TYPES.PAGE_EXTRACTOR) return "extraction_started";
  if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_EMAIL) return "email_extraction_started";
  if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_TEXT) return "text_extraction_started";
  if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_GOOGLE_MAPS) return "maps_extraction_started";
  return "page_extraction_started";
}

function parseIntentCommand(commandText) {
  return parseAutonomousGoal(commandText);
}

function resolveIntentPageActionType(intent = {}) {
  if (intent.wantsEmail) return PAGE_ACTION_TYPES.EXTRACT_PAGES_EMAIL;
  if (intent.wantsPhone) return PAGE_ACTION_TYPES.EXTRACT_PAGES_PHONE;
  if (intent.wantsText) return PAGE_ACTION_TYPES.EXTRACT_PAGES_TEXT;
  return PAGE_ACTION_TYPES.EXTRACT_PAGES;
}

function resolveIntentResultTarget(intent = {}) {
  return clamp(parseNumber(intent?.resultTarget, 0), 0, 50000);
}

function isLikelySearchResultsUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    const host = String(parsed.hostname || "").toLowerCase();
    const path = String(parsed.pathname || "").toLowerCase();
    const hasQueryHint = parsed.searchParams.has("q") || parsed.searchParams.has("query") || parsed.searchParams.has("keyword");
    if (host.includes("google.") && path.startsWith("/search")) return true;
    if (host.includes("bing.com") && path.includes("/search")) return true;
    if (host.includes("duckduckgo.com")) return true;
    if (host.includes("yahoo.") && path.includes("/search")) return true;
    if (host.includes("yandex.")) return true;
    if (hasQueryHint && (path.includes("/search") || path === "/" || path.startsWith("/results"))) return true;
    return false;
  } catch (_error) {
    return false;
  }
}

function resolveSmartPaginationNextSelector(value = "") {
  return isLikelySearchResultsUrl(value) ? SMART_PAGINATION_NEXT_SELECTOR : "";
}

function resolveSmartPaginationAutoContinue(listAutopilotOverrides = {}, plan = null) {
  if (!Boolean(listAutopilotOverrides?.untilNoMore)) return null;

  const currentMethod = String(elements.loadMoreMethod.value || LOAD_MORE_METHODS.NONE).trim() || LOAD_MORE_METHODS.NONE;
  const currentSelector = String(elements.loadMoreNextSelector.value || "").trim();
  const targetUrl = String(
    elements.startUrl.value || plan?.targetUrl || plan?.discoveredUrl || ""
  ).trim();

  if (currentMethod === LOAD_MORE_METHODS.NAVIGATE && currentSelector) {
    return {
      enabled: true,
      applied: false,
      source: "existing_selector",
      method: currentMethod,
      nextLinkSelector: currentSelector,
      targetUrl
    };
  }

  if (currentMethod === LOAD_MORE_METHODS.SCROLL || currentMethod === LOAD_MORE_METHODS.CLICK_BUTTON) {
    return null;
  }

  const candidateSelector = currentSelector || resolveSmartPaginationNextSelector(targetUrl);
  if (!candidateSelector) {
    return null;
  }

  const methodBefore = currentMethod;
  elements.loadMoreMethod.value = LOAD_MORE_METHODS.NAVIGATE;
  elements.loadMoreNextSelector.value = candidateSelector;

  return {
    enabled: true,
    applied: true,
    source: currentSelector ? "existing_selector" : "smart_selector_bundle",
    methodBefore,
    method: LOAD_MORE_METHODS.NAVIGATE,
    nextLinkSelector: candidateSelector,
    targetUrl
  };
}

function buildListAutopilotOverridesFromIntent(intent = {}) {
  const baseAttempts = clamp(parseNumber(elements.loadMoreAttempts.value, 5), 1, 30);
  const baseNoChangeThreshold = clamp(parseNumber(elements.loadMoreNoChangeThreshold.value, 2), 1, 10);
  const resultTarget = resolveIntentResultTarget(intent);
  const smartExhaustiveDefault = Boolean(intent?.wantsExtract && resultTarget <= 0);
  const untilNoMore = Boolean(intent?.wantsExhaustive || resultTarget > 0 || smartExhaustiveDefault);

  let tunedAttempts = baseAttempts;
  let tunedNoChangeThreshold = baseNoChangeThreshold;
  let maxRoundsSafety = 0;
  let autoContinueSegments = false;
  let autoContinueMaxSegments = 1;
  let hardRoundCap = 0;
  let hardCapAutoContinue = false;
  let hardCapAutoContinueMaxChains = 1;
  let hardRoundAbsoluteLimit = 0;

  if (resultTarget > 0) {
    const expectedRowsPerRound = 8;
    const expectedRounds = Math.max(1, Math.ceil(resultTarget / expectedRowsPerRound));
    tunedAttempts = clamp(Math.max(tunedAttempts, expectedRounds + 1), 1, 30);
    tunedNoChangeThreshold = clamp(Math.max(tunedNoChangeThreshold, 3), 1, 10);
    maxRoundsSafety = clamp(Math.max(40, expectedRounds * 4), 1, 320);
  }

  if (intent?.wantsExhaustive) {
    tunedAttempts = clamp(Math.max(tunedAttempts, 24), 1, 30);
    tunedNoChangeThreshold = clamp(Math.max(tunedNoChangeThreshold, 4), 1, 10);
    maxRoundsSafety = clamp(Math.max(maxRoundsSafety, 220), 1, 320);
  } else if (smartExhaustiveDefault) {
    tunedAttempts = clamp(Math.max(tunedAttempts, 18), 1, 30);
    tunedNoChangeThreshold = clamp(Math.max(tunedNoChangeThreshold, 3), 1, 10);
    maxRoundsSafety = clamp(Math.max(maxRoundsSafety, 240), 1, 320);
  } else if (untilNoMore) {
    maxRoundsSafety = clamp(Math.max(maxRoundsSafety, 80), 1, 320);
  }

  if (untilNoMore) {
    const explicitExhaustive = Boolean(intent?.wantsExhaustive);
    autoContinueSegments = true;
    autoContinueMaxSegments = explicitExhaustive
      ? LIST_AUTOCONTINUE_SEGMENTS_EXHAUSTIVE
      : LIST_AUTOCONTINUE_SEGMENTS_DEFAULT;
    hardRoundCap = explicitExhaustive
      ? LIST_AUTOCONTINUE_HARD_ROUND_CAP_EXHAUSTIVE
      : LIST_AUTOCONTINUE_HARD_ROUND_CAP_DEFAULT;
    hardCapAutoContinue = true;
    hardCapAutoContinueMaxChains = explicitExhaustive
      ? LIST_HARDCAP_AUTOCONTINUE_CHAINS_EXHAUSTIVE
      : LIST_HARDCAP_AUTOCONTINUE_CHAINS_DEFAULT;
    hardRoundAbsoluteLimit = explicitExhaustive
      ? LIST_HARDCAP_ABSOLUTE_LIMIT_EXHAUSTIVE
      : LIST_HARDCAP_ABSOLUTE_LIMIT_DEFAULT;
  }

  return {
    maxRows: resultTarget,
    attempts: tunedAttempts,
    noChangeThreshold: tunedNoChangeThreshold,
    untilNoMore,
    maxRoundsSafety,
    autoContinueSegments,
    autoContinueMaxSegments,
    hardRoundCap,
    hardCapAutoContinue,
    hardCapAutoContinueMaxChains,
    hardRoundAbsoluteLimit,
    hasTarget: resultTarget > 0,
    exhaustive: Boolean(intent?.wantsExhaustive),
    smartExhaustiveDefault: smartExhaustiveDefault && !intent?.wantsExhaustive && resultTarget <= 0
  };
}

function resolveMapsPlaceUrlsFromSummary(summary = {}) {
  const preferred = Array.isArray(summary?.successfulUrls) ? summary.successfulUrls : [];
  const fallback = Array.isArray(summary?.inputUrls) ? summary.inputUrls : [];
  const source = preferred.length > 0 ? preferred : fallback;
  const seen = new Set();
  const urls = [];
  for (const item of source) {
    const next = String(item || "").trim();
    if (!next) continue;
    if (!/google\.[^/]+\/maps\/place\//i.test(next)) continue;
    if (seen.has(next)) continue;
    seen.add(next);
    urls.push(next);
    if (urls.length >= 2000) break;
  }
  return urls;
}

async function startIntentMapsDetailEnrichment(urls = [], sourceAutomationId = "") {
  const mapUrls = Array.isArray(urls) ? urls : [];
  if (mapUrls.length === 0) {
    state.intentAutoMapsDetailEnrichPending = false;
    state.intentAutoMapsDetailEnrichAutomationId = null;
    return false;
  }

  try {
    applyToolPreset("page_details", {
      navigate: false,
      forceWelcome: false,
      track: false
    });
    setRunnerTypeIfAvailable(RUNNER_TYPES.PAGE_EXTRACTOR);
    elements.pageUrlSourceMode.value = URL_SOURCE_MODES.MANUAL;
    elements.pageManualUrls.value = mapUrls.join("\n");
    elements.pageActionType.value = PAGE_ACTION_TYPES.EXTRACT_PAGES_GOOGLE_MAPS;
    elements.queueConcurrency.value = "2";
    elements.queueDelayMs.value = "900";
    elements.queueRetries.value = "1";
    elements.queueRetryDelayMs.value = "1200";
    elements.queueJitterMs.value = "250";
    elements.mapsIncludeBasicInfo.checked = true;
    elements.mapsIncludeContactDetails.checked = true;
    elements.mapsIncludeReviews.checked = true;
    elements.mapsIncludeHours.checked = true;
    elements.mapsIncludeLocation.checked = true;
    elements.mapsIncludeImages.checked = true;
    updatePageSourceUi();
    updatePageActionUi();
    updateRunnerUi();

    setListAutoDetectStatus("Quick extract: enriching map details (phone, website, hours)...");
    trackUiEvent("quick_extract_maps_enrichment_starting", {
      sourceAutomationId: String(sourceAutomationId || ""),
      urlCount: mapUrls.length
    });
    appendLog("quick extract maps enrichment starting", {
      sourceAutomationId: String(sourceAutomationId || ""),
      urlCount: mapUrls.length
    });

    const started = await onStart({
      page: {
        mapsOptions: {
          autoScrollResults: false,
          onlyNewResults: false,
          untilNoMore: false,
          maxResults: 0,
          maxScrollSteps: 1
        }
      }
    });

    if (!started) {
      state.intentAutoMapsDetailEnrichPending = false;
      state.intentAutoMapsDetailEnrichAutomationId = null;
      appendLog("quick extract maps enrichment start failed", {
        reason: state.lastStartError || "unknown"
      });
      return false;
    }

    state.intentAutoMapsDetailEnrichPending = false;
    state.intentAutoMapsDetailEnrichAutomationId = state.currentAutomationId || null;
    trackUiEvent("quick_extract_maps_enrichment_started", {
      sourceAutomationId: String(sourceAutomationId || ""),
      enrichmentAutomationId: String(state.intentAutoMapsDetailEnrichAutomationId || ""),
      urlCount: mapUrls.length
    });
    return true;
  } catch (error) {
    state.intentAutoMapsDetailEnrichPending = false;
    state.intentAutoMapsDetailEnrichAutomationId = null;
    appendLog(`quick extract maps enrichment failed: ${friendlyErrorText(error?.message || "")}`);
    return false;
  }
}

async function maybeHandleIntentMapsDetailEnrichment(eventPayload = {}) {
  const eventType = String(eventPayload?.eventType || "").trim();
  if (eventType !== AUTOMATION_EVENT_TYPES.COMPLETED) {
    return {
      started: false,
      deferExport: false
    };
  }

  const automationId = String(eventPayload?.payload?.automationId || "").trim();
  const summary = eventPayload?.payload?.result || {};
  const actionType = String(summary?.actionType || "").trim().toUpperCase();

  if (state.intentAutoMapsDetailEnrichAutomationId) {
    if (automationId && automationId === String(state.intentAutoMapsDetailEnrichAutomationId)) {
      state.intentAutoMapsDetailEnrichAutomationId = null;
      state.intentAutoMapsDetailEnrichPending = false;
      setListAutoDetectStatus("Quick extract completed: map details enriched and ready.");
      trackUiEvent("quick_extract_maps_enrichment_completed", {
        enrichmentAutomationId: automationId
      });
    }
    return {
      started: false,
      deferExport: false
    };
  }

  if (!state.intentAutoMapsDetailEnrichPending) {
    return {
      started: false,
      deferExport: false
    };
  }

  if (actionType !== PAGE_ACTION_TYPES.EXTRACT_PAGES_GOOGLE_MAPS) {
    state.intentAutoMapsDetailEnrichPending = false;
    return {
      started: false,
      deferExport: false
    };
  }

  const mapUrls = resolveMapsPlaceUrlsFromSummary(summary);
  if (mapUrls.length === 0) {
    state.intentAutoMapsDetailEnrichPending = false;
    return {
      started: false,
      deferExport: false
    };
  }

  const started = await startIntentMapsDetailEnrichment(mapUrls, automationId);
  return {
    started,
    deferExport: started
  };
}

function isSearchEngineHost(value = "") {
  const host = String(value || "").trim().toLowerCase();
  if (!host) return false;
  return (
    host.includes("google.") ||
    host.includes("bing.com") ||
    host.includes("duckduckgo.com") ||
    host.includes("yahoo.") ||
    host.includes("yandex.")
  );
}

function extractHttpUrlsFromText(value = "") {
  const source = String(value || "");
  if (!source) return [];
  const matches = source.match(/https?:\/\/[^\s)"'<>]+/gi) || [];
  return matches.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeHttpUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!/^https?:$/i.test(parsed.protocol)) return "";
    const hostname = String(parsed.hostname || "").toLowerCase();
    if (!hostname || isSearchEngineHost(hostname)) return "";
    return parsed.toString();
  } catch (_error) {
    return "";
  }
}

function resolveUrlsFromTableRows(rows = [], maxUrls = AUTO_URL_ENRICHMENT_MAX_URLS) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const limit = clamp(Number(maxUrls || AUTO_URL_ENRICHMENT_MAX_URLS), 1, 5000);
  const seen = new Set();
  const urls = [];
  for (const row of sourceRows) {
    const candidates = [];
    if (row?.sourceUrl) {
      candidates.push(String(row.sourceUrl || ""));
    }
    const rowData = row?.rowData && typeof row.rowData === "object" ? row.rowData : {};
    for (const value of Object.values(rowData)) {
      candidates.push(String(value || ""));
    }

    for (const candidate of candidates) {
      const extracted = extractHttpUrlsFromText(candidate);
      if (extracted.length === 0) {
        extracted.push(candidate);
      }
      for (const item of extracted) {
        const normalized = normalizeHttpUrl(item);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        urls.push(normalized);
        if (urls.length >= limit) {
          return urls;
        }
      }
    }
  }
  return urls;
}

async function startIntentListUrlEnrichment(urls = [], sourceAutomationId = "") {
  const targets = Array.isArray(urls) ? urls : [];
  if (targets.length === 0) {
    state.intentAutoListUrlEnrichPending = false;
    state.intentAutoListUrlEnrichAutomationId = null;
    return false;
  }

  try {
    setRunnerTypeIfAvailable(RUNNER_TYPES.METADATA_EXTRACTOR);
    elements.pageUrlSourceMode.value = URL_SOURCE_MODES.MANUAL;
    elements.pageManualUrls.value = targets.join("\n");
    elements.metadataIncludeMetaTags.checked = true;
    elements.metadataIncludeJsonLd.checked = true;
    elements.metadataIncludeReviewSignals.checked = true;
    elements.metadataIncludeContactSignals.checked = true;
    elements.metadataIncludeRawJsonLd.checked = false;
    elements.queueConcurrency.value = "3";
    elements.queueDelayMs.value = "350";
    elements.queueRetries.value = "1";
    elements.queueRetryDelayMs.value = "1000";
    elements.queueJitterMs.value = "220";
    updatePageSourceUi();
    updatePageActionUi();
    updateRunnerUi();

    setListAutoDetectStatus("Quick extract: enriching discovered URLs (metadata + contact signals)...");
    trackUiEvent("quick_extract_url_enrichment_starting", {
      sourceAutomationId: String(sourceAutomationId || ""),
      urlCount: targets.length
    });
    appendLog("quick extract url enrichment starting", {
      sourceAutomationId: String(sourceAutomationId || ""),
      urlCount: targets.length
    });

    const started = await onStart();
    if (!started) {
      state.intentAutoListUrlEnrichPending = false;
      state.intentAutoListUrlEnrichAutomationId = null;
      appendLog("quick extract url enrichment start failed", {
        reason: state.lastStartError || "unknown"
      });
      return false;
    }

    state.intentAutoListUrlEnrichPending = false;
    state.intentAutoListUrlEnrichAutomationId = state.currentAutomationId || null;
    trackUiEvent("quick_extract_url_enrichment_started", {
      sourceAutomationId: String(sourceAutomationId || ""),
      enrichmentAutomationId: String(state.intentAutoListUrlEnrichAutomationId || ""),
      urlCount: targets.length
    });
    return true;
  } catch (error) {
    state.intentAutoListUrlEnrichPending = false;
    state.intentAutoListUrlEnrichAutomationId = null;
    appendLog(`quick extract url enrichment failed: ${friendlyErrorText(error?.message || "")}`);
    return false;
  }
}

async function maybeHandleIntentListUrlEnrichment(eventPayload = {}) {
  const eventType = String(eventPayload?.eventType || "").trim();
  if (eventType !== AUTOMATION_EVENT_TYPES.COMPLETED) {
    return {
      started: false,
      deferExport: false
    };
  }

  const automationId = String(eventPayload?.payload?.automationId || "").trim();
  const summary = eventPayload?.payload?.result || {};
  const actionType = String(summary?.actionType || "").trim().toUpperCase();
  const rowCount = Number(summary?.rowCount || 0);

  if (state.intentAutoListUrlEnrichAutomationId) {
    if (automationId && automationId === String(state.intentAutoListUrlEnrichAutomationId)) {
      state.intentAutoListUrlEnrichAutomationId = null;
      state.intentAutoListUrlEnrichPending = false;
      setListAutoDetectStatus("Quick extract completed: URL enrichment ready.");
      trackUiEvent("quick_extract_url_enrichment_completed", {
        enrichmentAutomationId: automationId
      });
    }
    return {
      started: false,
      deferExport: false
    };
  }

  if (!state.intentAutoListUrlEnrichPending) {
    return {
      started: false,
      deferExport: false
    };
  }

  if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_GOOGLE_MAPS) {
    state.intentAutoListUrlEnrichPending = false;
    return {
      started: false,
      deferExport: false
    };
  }

  if (rowCount <= 0) {
    state.intentAutoListUrlEnrichPending = false;
    return {
      started: false,
      deferExport: false
    };
  }

  const urls = resolveUrlsFromTableRows(state.tableRows, AUTO_URL_ENRICHMENT_MAX_URLS);
  if (urls.length === 0) {
    state.intentAutoListUrlEnrichPending = false;
    return {
      started: false,
      deferExport: false
    };
  }

  const started = await startIntentListUrlEnrichment(urls, automationId);
  return {
    started,
    deferExport: started
  };
}

async function ensureOrchestrationTargetUrl(plan) {
  const currentStartUrl = String(elements.startUrl.value || "").trim();
  if (!currentStartUrl && plan?.targetUrl) {
    elements.startUrl.value = String(plan.targetUrl || "").trim();
  }

  if (plan?.shouldNavigateActiveTab && plan?.targetUrl) {
    setOrchestrationPhase(plan, "target_discovery", "Opening target page...");
    const navigation = await navigateActiveTabToUrl(plan.targetUrl);
    if (!navigation.ok) {
      throw new Error(`Could not open target page: ${navigation.reason || "unknown error"}`);
    }
    await waitForUi(1400);
    await maybeHydrateStartUrlFromActiveTab({
      force: true
    });
  }

  await maybeHydrateStartUrlFromActiveTab({
    force: false
  });
}

async function onIntentCommandRun() {
  const commandText = String(elements.intentCommandInput?.value || "").trim();
  const intent = parseIntentCommand(commandText);
  if (!intent.hasText) {
    setListAutoDetectStatus("Type a command first. Example: find home service businesses in Miami.", {
      error: true
    });
    elements.intentCommandInput?.focus();
    return;
  }

  state.intentLastCommand = commandText;
  if (elements.intentCommandHint) {
    const resultTarget = resolveIntentResultTarget(intent);
    const targetSuffix = resultTarget > 0 ? ` | target ${resultTarget}` : "";
    elements.intentCommandHint.textContent = `Command: ${commandText}${targetSuffix}`;
  }
  setStatus(AUTOMATION_STATES.RUNNING);

  const activeUrl = await getActiveTabUrl();
  let plan = createAutonomousExecutionPlan({
    goal: intent,
    startUrl: String(elements.startUrl.value || "").trim(),
    activeUrl,
    activeTool: state.activeTool,
    simpleMode: state.simpleMode
  });
  const domainHintResult = applyDomainAutonomyHintToPlan(plan, {
    startUrl: String(elements.startUrl.value || "").trim(),
    activeUrl
  });
  if (domainHintResult.applied && domainHintResult.plan) {
    plan = domainHintResult.plan;
    setListAutoDetectStatus("Domain memory: this site runs better with Point & Follow, applying guided strategy.");
  }
  cacheOrchestrationPlan(plan);
  setOrchestrationPhase(plan, "intent_parse", "Command understood. Building autonomous plan...");

  if (plan.strategy === ORCHESTRATION_STRATEGIES.ACCESS_ONLY) {
    setOrchestrationPhase(plan, "access_preflight", "Preparing browser access...");
    await onSetupAccess({
      includeApi: false,
      includeDownloads: false,
      includeClipboard: false,
      silent: false,
      preferFullHostAccess: true
    });
    setStatus(AUTOMATION_STATES.IDLE);
    return;
  }

  if (plan.strategy === ORCHESTRATION_STRATEGIES.EXPORT_ONLY) {
    setOrchestrationPhase(plan, "export_finalize", `Preparing ${intent.exportFormat.toUpperCase()} export...`);
    elements.exportFormat.value = intent.exportFormat;
    await onExportFile();
    setStatus(AUTOMATION_STATES.IDLE);
    return;
  }

  if (plan.strategy === ORCHESTRATION_STRATEGIES.POINT_FOLLOW_GUIDED) {
    await ensureOrchestrationTargetUrl(plan);
    const strategyLine = plan.domainHintApplied
      ? "Strategy selected: guided Point & Follow (domain memory)"
      : "Strategy selected: guided Point & Follow";
    setOrchestrationPhase(plan, "strategy_selection", strategyLine);
    const guidedReady = await onPointAndFollow();
    if (!guidedReady) {
      setStatus(AUTOMATION_STATES.ERROR);
      return;
    }
    setStatus(AUTOMATION_STATES.IDLE);
    return;
  }

  if (intent.wantsExtract) {
    if (intent.wantsExport) {
      state.intentAutoExport = true;
      state.intentAutoExportFormat = intent.exportFormat;
    } else {
      state.intentAutoExport = false;
      state.intentAutoExportFormat = "csv";
    }

    await ensureOrchestrationTargetUrl(plan);
    const strategyLabel =
      plan.strategy === ORCHESTRATION_STRATEGIES.MAPS_AUTOPILOT
        ? "Google Maps autopilot"
        : plan.strategy === ORCHESTRATION_STRATEGIES.PAGE_AUTOPILOT
          ? "page details autopilot"
          : "list autodetect autopilot";
    setOrchestrationPhase(plan, "strategy_selection", `Strategy selected: ${strategyLabel}`);

    await onQuickExtract({
      forceMapsExhaustive: intent.wantsMaps || intent.wantsExhaustive,
      autonomousPlan: plan,
      intent
    });
    return;
  }

  setListAutoDetectStatus("Command not recognized. Try: find home service businesses in Miami.", {
    error: true
  });
  setStatus(AUTOMATION_STATES.IDLE);
}

async function onQuickExtract(options = {}) {
  const plan = options?.autonomousPlan || null;
  const commandText = String(elements.intentCommandInput?.value || "").trim();
  const intent = options?.intent || (commandText ? parseIntentCommand(commandText) : {});
  state.intentAutoMapsDetailEnrichPending = false;
  state.intentAutoMapsDetailEnrichAutomationId = null;
  state.intentAutoListUrlEnrichPending = false;
  state.intentAutoListUrlEnrichAutomationId = null;
  const fallbackEventBase = {
    runnerType: String(elements.runnerType.value || "").trim(),
    toolId: state.activeTool
  };
  let domainHintCandidates = [
    String(plan?.targetUrl || "").trim(),
    String(plan?.discoveredUrl || "").trim(),
    String(elements.startUrl.value || "").trim()
  ];
  const rememberDomainHint = (strategy, reasonText = "") =>
    rememberDomainAutonomyHint(strategy, {
      reason: reasonText,
      urlCandidates: domainHintCandidates
    });

  const runPointFollowFallback = async ({ fromStrategy = "", reasonText = "", startOptions = null } = {}) => {
    if (plan) {
      setOrchestrationPhase(plan, "strategy_selection", "Fallback active: switching to Point & Follow guidance");
      setOrchestrationPhase(plan, "automation_start", "Waiting for your click to guide extraction...");
    }
    rememberDomainHint(
      ORCHESTRATION_STRATEGIES.POINT_FOLLOW_GUIDED,
      reasonText ? `point_follow_required:${reasonText}` : "point_follow_required"
    );
    const prefix = reasonText ? `${reasonText}. ` : "";
    setListAutoDetectStatus(`${prefix}Starting Point & Follow guidance...`);
    const guidedReady = await onPointAndFollow({
      startOptions
    });
    if (!guidedReady) {
      return false;
    }
    rememberDomainHint(
      ORCHESTRATION_STRATEGIES.POINT_FOLLOW_GUIDED,
      reasonText ? `point_follow_ready:${reasonText}` : "point_follow_ready"
    );
    trackUiEvent("quick_extract_fallback", {
      ...fallbackEventBase,
      fromStrategy: fromStrategy || "unknown",
      toStrategy: "point_follow",
      reason: String(reasonText || "").trim()
    });
    return true;
  };

  const runListAutodetectAutopilot = async ({ asFallback = false, fromStrategy = "", reasonText = "" } = {}) => {
    if (asFallback && plan) {
      setOrchestrationPhase(plan, "strategy_selection", "Fallback active: trying list autodetect autopilot");
    }
    const listAutopilotOverrides = buildListAutopilotOverridesFromIntent(intent);

    if (elements.runnerType.value !== RUNNER_TYPES.LIST_EXTRACTOR) {
      applyToolPreset("list", {
        navigate: false,
        forceWelcome: false,
        track: false
      });
      updateRunnerUi();
    }

    const hasManualListSetup = Boolean(String(elements.containerSelector.value || "").trim()) && state.listFields.length > 0;
    if (!hasManualListSetup) {
      if (asFallback) {
        const prefix = reasonText ? `Primary strategy failed (${reasonText}). ` : "";
        setListAutoDetectStatus(`${prefix}Trying list autodetect fallback...`);
      }
      const detected = await onListAutoDetect();
      if (!detected) {
        rememberDomainHint(
          ORCHESTRATION_STRATEGIES.POINT_FOLLOW_GUIDED,
          "autodetect_failed_requires_guidance"
        );
        return runPointFollowFallback({
          fromStrategy: asFallback ? "list_autodetect_fallback" : fromStrategy || "list_autodetect",
          reasonText: "Auto-detect needs guidance",
          startOptions: {
            list: {
              loadMore: {
                attempts: listAutopilotOverrides.attempts,
                noChangeThreshold: listAutopilotOverrides.noChangeThreshold,
                maxRows: listAutopilotOverrides.maxRows,
                untilNoMore: listAutopilotOverrides.untilNoMore,
                maxRoundsSafety: listAutopilotOverrides.maxRoundsSafety,
                autoContinueSegments: listAutopilotOverrides.autoContinueSegments,
                autoContinueMaxSegments: listAutopilotOverrides.autoContinueMaxSegments,
                hardRoundCap: listAutopilotOverrides.hardRoundCap,
                hardCapAutoContinue: listAutopilotOverrides.hardCapAutoContinue,
                hardCapAutoContinueMaxChains: listAutopilotOverrides.hardCapAutoContinueMaxChains,
                hardRoundAbsoluteLimit: listAutopilotOverrides.hardRoundAbsoluteLimit
              }
            }
          }
        });
      }
    }

    if (plan) {
      setOrchestrationPhase(
        plan,
        "automation_start",
        asFallback ? "Fallback active: starting list autodetect autopilot..." : "Starting list autodetect autopilot..."
      );
    }
    const paginationAutoContinue = resolveSmartPaginationAutoContinue(listAutopilotOverrides, plan);
    if (paginationAutoContinue?.enabled) {
      appendLog("quick extract pagination auto-continue", paginationAutoContinue);
      trackUiEvent("quick_extract_pagination_autocontinue_enabled", {
        strategy: asFallback ? "list_autodetect_fallback" : plan?.strategy || "list_autodetect",
        source: paginationAutoContinue.source,
        applied: Boolean(paginationAutoContinue.applied),
        nextLinkSelector: paginationAutoContinue.nextLinkSelector
      });
    }
    const targetStatusSuffix = listAutopilotOverrides.hasTarget
      ? ` Targeting first ${listAutopilotOverrides.maxRows} results.`
      : listAutopilotOverrides.exhaustive
        ? " Exhaustive mode enabled: running until no more results."
        : listAutopilotOverrides.smartExhaustiveDefault
          ? " Smart mode default: running until no more results."
        : "";
    const paginationStatusSuffix = paginationAutoContinue?.enabled ? " Auto-pagination enabled." : "";
    const segmentationStatusSuffix = listAutopilotOverrides.autoContinueSegments
      ? ` Segmented auto-continue enabled (${listAutopilotOverrides.autoContinueMaxSegments} segments safety).`
      : "";
    const hardCapChainStatusSuffix = listAutopilotOverrides.hardCapAutoContinue
      ? ` Hard-cap auto-resume enabled (${listAutopilotOverrides.hardCapAutoContinueMaxChains} chains).`
      : "";
    setListAutoDetectStatus(
      `${asFallback ? "Fallback: starting list extraction..." : "Quick extract starting..."}${targetStatusSuffix}${paginationStatusSuffix}${segmentationStatusSuffix}${hardCapChainStatusSuffix}`
    );
    const started = await onStart({
      list: {
        loadMore: {
          attempts: listAutopilotOverrides.attempts,
          noChangeThreshold: listAutopilotOverrides.noChangeThreshold,
          maxRows: listAutopilotOverrides.maxRows,
          untilNoMore: listAutopilotOverrides.untilNoMore,
          maxRoundsSafety: listAutopilotOverrides.maxRoundsSafety,
          autoContinueSegments: listAutopilotOverrides.autoContinueSegments,
          autoContinueMaxSegments: listAutopilotOverrides.autoContinueMaxSegments,
          hardRoundCap: listAutopilotOverrides.hardRoundCap,
          hardCapAutoContinue: listAutopilotOverrides.hardCapAutoContinue,
          hardCapAutoContinueMaxChains: listAutopilotOverrides.hardCapAutoContinueMaxChains,
          hardRoundAbsoluteLimit: listAutopilotOverrides.hardRoundAbsoluteLimit
        }
      }
    });
    if (!started) {
      const startError = state.lastStartError || "List extraction could not start.";
      rememberDomainHint(
        ORCHESTRATION_STRATEGIES.POINT_FOLLOW_GUIDED,
        startError ? `list_start_failed:${startError}` : "list_start_failed"
      );
      return runPointFollowFallback({
        fromStrategy: asFallback ? "list_autodetect_fallback" : fromStrategy || "list_autodetect",
        reasonText: startError,
        startOptions: {
          list: {
            loadMore: {
              attempts: listAutopilotOverrides.attempts,
              noChangeThreshold: listAutopilotOverrides.noChangeThreshold,
              maxRows: listAutopilotOverrides.maxRows,
              untilNoMore: listAutopilotOverrides.untilNoMore,
              maxRoundsSafety: listAutopilotOverrides.maxRoundsSafety,
              autoContinueSegments: listAutopilotOverrides.autoContinueSegments,
              autoContinueMaxSegments: listAutopilotOverrides.autoContinueMaxSegments,
              hardRoundCap: listAutopilotOverrides.hardRoundCap,
              hardCapAutoContinue: listAutopilotOverrides.hardCapAutoContinue,
              hardCapAutoContinueMaxChains: listAutopilotOverrides.hardCapAutoContinueMaxChains,
              hardRoundAbsoluteLimit: listAutopilotOverrides.hardRoundAbsoluteLimit
            }
          }
        }
      });
    }
    const listAutoEnrichEligible = !(intent?.wantsMaps || intent?.wantsLocalLeads || plan?.mapsMode);
    state.intentAutoListUrlEnrichPending = listAutoEnrichEligible;
    state.intentAutoListUrlEnrichAutomationId = null;
    rememberDomainHint(
      ORCHESTRATION_STRATEGIES.LIST_AUTODETECT_AUTOPILOT,
      asFallback ? "list_autodetect_fallback_started" : "list_autodetect_started"
    );

    if (asFallback) {
      trackUiEvent("quick_extract_fallback", {
        ...fallbackEventBase,
        fromStrategy: fromStrategy || "unknown",
        toStrategy: "list_autodetect",
        reason: String(reasonText || "").trim()
      });
    }
    if (plan) {
      setOrchestrationPhase(plan, "monitoring", "List autopilot running. Collecting fresh results...");
    }
    setListAutoDetectStatus("Quick extract running. Open DATA to view rows.");
    trackUiEvent("quick_extract_started", {
      strategy: asFallback ? "list_autodetect_fallback" : plan?.strategy || "list_autodetect",
      runnerType: elements.runnerType.value,
      toolId: state.activeTool,
      resultTarget: listAutopilotOverrides.maxRows,
      untilNoMore: listAutopilotOverrides.untilNoMore,
      smartExhaustiveDefault: listAutopilotOverrides.smartExhaustiveDefault,
      autoContinueSegments: listAutopilotOverrides.autoContinueSegments,
      autoContinueMaxSegments: listAutopilotOverrides.autoContinueMaxSegments,
      hardRoundCap: listAutopilotOverrides.hardRoundCap,
      hardCapAutoContinue: listAutopilotOverrides.hardCapAutoContinue,
      hardCapAutoContinueMaxChains: listAutopilotOverrides.hardCapAutoContinueMaxChains,
      hardRoundAbsoluteLimit: listAutopilotOverrides.hardRoundAbsoluteLimit,
      paginationAutoContinueEnabled: Boolean(paginationAutoContinue?.enabled),
      paginationAutoContinueApplied: Boolean(paginationAutoContinue?.applied),
      paginationNextLinkSelector: String(paginationAutoContinue?.nextLinkSelector || ""),
      autoUrlEnrichmentPlanned: state.intentAutoListUrlEnrichPending
    });
    return true;
  };

  try {
    await maybeHydrateStartUrlFromActiveTab({
      force: false
    });
    let startUrl = String(elements.startUrl.value || "").trim();
    const discoveredUrl = String(plan?.discoveredUrl || "").trim();
    const isDiscoveredMapsUrl =
      discoveredUrl.toLowerCase().includes("google.com/maps") || discoveredUrl.toLowerCase().includes("maps.google.");
    if (
      plan?.strategy === ORCHESTRATION_STRATEGIES.MAPS_AUTOPILOT &&
      isDiscoveredMapsUrl &&
      (!startUrl ||
        (!startUrl.toLowerCase().includes("google.com/maps") && !startUrl.toLowerCase().includes("maps.google.")))
    ) {
      startUrl = discoveredUrl;
      elements.startUrl.value = startUrl;
    }
    domainHintCandidates = [
      startUrl,
      String(plan?.targetUrl || "").trim(),
      String(plan?.discoveredUrl || "").trim(),
      String(elements.startUrl.value || "").trim()
    ];

    if (!startUrl) {
      throw new Error("Start URL is required");
    }

    if (plan) {
      setOrchestrationPhase(plan, "access_preflight", "Preparing browser access...");
    }
    const setup = await onSetupAccess({
      includeApi: false,
      includeDownloads: false,
      includeClipboard: false,
      silent: true,
      preferFullHostAccess: false
    });
    if (!setup.ok) {
      throw new Error("Access was denied for this site");
    }

    if (plan?.strategy === ORCHESTRATION_STRATEGIES.PAGE_AUTOPILOT) {
      applyToolPreset("page_details", {
        navigate: false,
        forceWelcome: false,
        track: false
      });
      elements.pageUrlSourceMode.value = URL_SOURCE_MODES.MANUAL;
      elements.pageManualUrls.value = startUrl;

      if (intent.wantsMetadata) {
        setRunnerTypeIfAvailable(RUNNER_TYPES.METADATA_EXTRACTOR);
      } else {
        setRunnerTypeIfAvailable(RUNNER_TYPES.PAGE_EXTRACTOR);
        elements.pageActionType.value = resolveIntentPageActionType(intent);
      }

      updatePageSourceUi();
      updatePageActionUi();
      updateRunnerUi();

      if (plan) {
        setOrchestrationPhase(plan, "automation_start", "Starting page autopilot...");
      }
      setListAutoDetectStatus("Quick extract: page autopilot starting...");
      const started = await onStart();
      if (!started) {
        const fallbackStarted = await runListAutodetectAutopilot({
          asFallback: true,
          fromStrategy: "page_autopilot",
          reasonText: state.lastStartError || "Page extraction could not start"
        });
        if (fallbackStarted) {
          return;
        }
        throw new Error(state.lastStartError || "Page extraction could not start.");
      }
      if (plan) {
        setOrchestrationPhase(plan, "monitoring", "Page autopilot running. Collecting fresh results...");
      }
      setListAutoDetectStatus("Page autopilot running. Open DATA to view rows.");
      trackUiEvent("quick_extract_started", {
        strategy: "page_autopilot",
        runnerType: elements.runnerType.value,
        toolId: state.activeTool
      });
      return;
    }

    const lowerUrl = startUrl.toLowerCase();
    const isGoogleMaps = lowerUrl.includes("google.com/maps") || lowerUrl.includes("maps.google.");
    if (plan?.strategy === ORCHESTRATION_STRATEGIES.MAPS_AUTOPILOT && !isGoogleMaps) {
      const fallbackStarted = await runListAutodetectAutopilot({
        asFallback: true,
        fromStrategy: "maps_autopilot",
        reasonText: "Google Maps URL not available"
      });
      if (fallbackStarted) {
        return;
      }
      throw new Error("Maps autopilot needs a Google Maps target URL. Add a location query in your command.");
    }
    if (isGoogleMaps) {
      applyToolPreset("page_details", {
        navigate: false,
        forceWelcome: false,
        track: false
      });
      setRunnerTypeIfAvailable(RUNNER_TYPES.PAGE_EXTRACTOR);
      elements.pageUrlSourceMode.value = URL_SOURCE_MODES.MANUAL;
      elements.pageManualUrls.value = startUrl;
      elements.pageActionType.value = PAGE_ACTION_TYPES.EXTRACT_PAGES_GOOGLE_MAPS;
      elements.queueConcurrency.value = "1";
      elements.queueDelayMs.value = "900";
      elements.queueRetries.value = "1";
      elements.queueRetryDelayMs.value = "1200";
      elements.queueJitterMs.value = "250";
      if (options?.forceMapsExhaustive) {
        elements.mapsIncludeBasicInfo.checked = true;
        elements.mapsIncludeContactDetails.checked = true;
        elements.mapsIncludeReviews.checked = true;
        elements.mapsIncludeHours.checked = true;
        elements.mapsIncludeLocation.checked = true;
        elements.mapsIncludeImages.checked = true;
      }
      updatePageSourceUi();
      updatePageActionUi();
      updateRunnerUi();

      if (plan) {
        setOrchestrationPhase(plan, "automation_start", "Starting Google Maps autopilot...");
      }
      const mapsTarget = resolveIntentResultTarget(intent);
      const mapsSmartExhaustiveDefault = mapsTarget <= 0;
      const mapsMaxScrollSteps = mapsSmartExhaustiveDefault ? 500 : 220;
      const mapsTargetSuffix = mapsTarget > 0 ? ` Targeting first ${mapsTarget} map results.` : " Smart mode default: running until no more map results.";
      setListAutoDetectStatus(`Quick extract: Google Maps detected. Starting maps extraction...${mapsTargetSuffix}`);
      state.intentAutoMapsDetailEnrichPending = true;
      state.intentAutoMapsDetailEnrichAutomationId = null;
      const started = await onStart({
        page: {
          mapsOptions: {
            maxResults: mapsTarget,
            untilNoMore: true,
            maxScrollSteps: mapsMaxScrollSteps
          }
        }
      });
      if (!started) {
        state.intentAutoMapsDetailEnrichPending = false;
        state.intentAutoMapsDetailEnrichAutomationId = null;
        const fallbackStarted = await runListAutodetectAutopilot({
          asFallback: true,
          fromStrategy: plan?.strategy === ORCHESTRATION_STRATEGIES.MAPS_AUTOPILOT ? "maps_autopilot" : "google_maps",
          reasonText: state.lastStartError || "Google Maps extraction could not start"
        });
        if (fallbackStarted) {
          return;
        }
        throw new Error(state.lastStartError || "Google Maps extraction could not start.");
      }
      if (plan) {
        setOrchestrationPhase(plan, "monitoring", "Google Maps autopilot running. Collecting fresh results...");
      }
      setListAutoDetectStatus("Google Maps extraction running. DATA will open when complete.");
      trackUiEvent("quick_extract_started", {
        strategy: plan?.strategy === ORCHESTRATION_STRATEGIES.MAPS_AUTOPILOT ? "maps_autopilot" : "google_maps",
        runnerType: elements.runnerType.value,
        toolId: state.activeTool,
        resultTarget: mapsTarget,
        untilNoMore: true,
        maxScrollSteps: mapsMaxScrollSteps,
        smartExhaustiveDefault: mapsSmartExhaustiveDefault,
        autoMapDetailsEnrichPlanned: state.intentAutoMapsDetailEnrichPending
      });
      return;
    }

    const listStarted = await runListAutodetectAutopilot({
      asFallback: false,
      fromStrategy: plan?.strategy || "list_autodetect"
    });
    if (!listStarted) {
      throw new Error(state.lastStartError || "Extraction could not start. Check access permissions and retry.");
    }
  } catch (error) {
    const message = friendlyErrorText(error?.message || "");
    setListAutoDetectStatus(`Quick extract failed: ${message}`, {
      error: true
    });
    appendLog(`quick extract failed: ${message}`);
    setStatus(AUTOMATION_STATES.ERROR);
  }
}

function normalizePickedContainerSelector(selector) {
  const raw = String(selector || "").trim();
  if (!raw) return "";
  return raw.replace(/:nth-of-type\(\d+\)/g, "").replace(/\s{2,}/g, " ").trim();
}

async function onPointAndFollow(options = {}) {
  try {
    await maybeHydrateStartUrlFromActiveTab({
      force: false
    });
    const startUrl = String(elements.startUrl.value || "").trim();
    if (!startUrl) {
      throw new Error("Start URL is required");
    }

    const setup = await onSetupAccess({
      includeApi: false,
      includeDownloads: false,
      includeClipboard: false,
      silent: true,
      preferFullHostAccess: false
    });
    if (!setup.ok) {
      throw new Error("Access was denied for this site");
    }

    state.pointFollowActive = true;
    const source = options && typeof options === "object" ? options : {};
    const startOptions = source.startOptions && typeof source.startOptions === "object" ? source.startOptions : null;
    state.pointFollowStartOptions = startOptions;
    applyToolPreset("list", {
      navigate: false,
      forceWelcome: false,
      track: false
    });
    setListAutoDetectStatus("Point & Follow: click one data item on the page...");
    const started = await startPicker({
      mode: PICKER_MODES.CONTAINER,
      multiSelect: false,
      prompt: "Click one value you want to extract. Datascrap will infer the repeating pattern.",
      purpose: "guided_seed",
      preferredUrl: startUrl
    });
    if (!started?.ok) {
      throw new Error(started?.error || "Unable to start picker");
    }
    rememberDomainAutonomyHint(ORCHESTRATION_STRATEGIES.POINT_FOLLOW_GUIDED, {
      reason: "point_follow_ready",
      urlCandidates: [startUrl, String(elements.startUrl.value || "").trim()]
    });
    setStatus(AUTOMATION_STATES.IDLE);
    return true;
  } catch (error) {
    state.pointFollowActive = false;
    state.pointFollowStartOptions = null;
    const message = friendlyErrorText(error?.message || "");
    setListAutoDetectStatus(`Point & Follow failed: ${message}`, {
      error: true
    });
    appendLog(`point and follow failed: ${message}`);
    setStatus(AUTOMATION_STATES.ERROR);
    return false;
  }
}

async function onStart(options = {}) {
  try {
    state.lastStartError = "";
    await maybeHydrateStartUrlFromActiveTab({
      force: false
    });
    const runnerType = elements.runnerType.value;
    const actionType = String(elements.pageActionType.value || PAGE_ACTION_TYPES.EXTRACT_PAGES).trim();
    const source = options && typeof options === "object" ? options : {};
    const listOptions = source.list && typeof source.list === "object" ? source.list : {};
    const pageOptions = source.page && typeof source.page === "object" ? source.page : {};
    const config =
      runnerType === RUNNER_TYPES.LIST_EXTRACTOR
        ? buildListAutomationConfig(listOptions)
        : runnerType === RUNNER_TYPES.METADATA_EXTRACTOR
          ? await buildMetadataAutomationConfig()
          : await buildPageAutomationConfig(pageOptions);

    const payload = await sendMessage(MESSAGE_TYPES.START_REQUEST, {
      runnerType,
      config
    });
    state.currentAutomationId = payload.automationId || null;
    trackUiEvent("extraction_started", {
      toolId: state.activeTool,
      runnerType,
      actionType
    });
    trackUiEvent(resolveToolStartEventName(runnerType, actionType), {
      toolId: state.activeTool,
      runnerType,
      actionType
    });
    appendLog("start accepted", payload);
    setStatus(AUTOMATION_STATES.RUNNING);
    setStatusProgress(5, {
      phase: "Start accepted"
    });
    return true;
  } catch (error) {
    const message = friendlyErrorText(error?.message || "");
    state.lastStartError = message;
    appendLog(`start failed: ${message}`);
    if (state.simpleMode || String(elements.runnerType.value || "") === RUNNER_TYPES.LIST_EXTRACTOR) {
      setListAutoDetectStatus(`Start failed: ${message}`, {
        error: true
      });
    }
    setStatus(AUTOMATION_STATES.ERROR);
    return false;
  }
}

async function onStop() {
  if (!state.currentAutomationId) {
    appendLog("stop ignored: no active automation id");
    return;
  }

  try {
    const payload = await sendMessage(MESSAGE_TYPES.STOP_REQUEST, {
      automationId: state.currentAutomationId
    });
    trackUiEvent("extraction_stopped", {
      automationId: state.currentAutomationId
    });
    appendLog("stop requested", payload);
  } catch (error) {
    appendLog(`stop failed: ${error.message}`);
    setStatus(AUTOMATION_STATES.ERROR);
  }
}

async function onRerun() {
  const automationId = state.lastTerminalAutomationId || state.currentAutomationId;
  if (!automationId) {
    appendLog("rerun ignored: no automation id");
    return;
  }

  try {
    const payload = await sendMessage(MESSAGE_TYPES.RERUN_REQUEST, {
      automationId
    });
    state.currentAutomationId = payload.automationId || null;
    trackUiEvent("extraction_rerun_requested", {
      previousAutomationId: automationId,
      nextAutomationId: state.currentAutomationId
    });
    appendLog("rerun accepted", payload);
  } catch (error) {
    appendLog(`rerun failed: ${error.message}`);
    setStatus(AUTOMATION_STATES.ERROR);
  }
}

for (const button of elements.shellNavButtons) {
  button.addEventListener("click", () => {
    const view = String(button.dataset.shellView || "").trim();
    setShellView(view);
  });
}

for (const card of elements.toolCards) {
  card.addEventListener("click", () => {
    const toolId = String(card.dataset.tool || "").trim();
    if (state.simpleMode && toolId === "list") {
      trackUiEvent("quick_start_opened", {
        toolId,
        action: "menu_card_quick_extract"
      });
      void onQuickExtract();
      return;
    }
    applyToolPreset(toolId, {
      navigate: true,
      forceWelcome: false,
      track: true
    });
  });
}

elements.openWelcomeBtn.addEventListener("click", () => {
  showWelcomeForActiveTool();
  trackUiEvent("tutorial_opened", {
    toolId: state.activeTool
  });
});

elements.toolWelcomeSkipBtn.addEventListener("click", () => {
  dismissWelcomeForActiveTool();
});

elements.toolWelcomeStartBtn.addEventListener("click", () => {
  const preset = getToolPreset(state.activeTool);
  dismissWelcomeForActiveTool();
  setShellView(preset.shellView || SHELL_VIEWS.TOOLS);
  trackUiEvent("quick_start_opened", {
    toolId: state.activeTool,
    action: "start_extracting"
  });

  if (state.activeTool === "image") {
    void onScanImages();
    return;
  }

  if (state.simpleMode && state.activeTool === "list") {
    elements.quickExtractBtn.focus();
    return;
  }

  elements.startBtn.focus();
});

elements.roadmapSchedulingNotifyBtn.addEventListener("click", () => {
  onRoadmapNotify("scheduling");
});
elements.roadmapIntegrationsNotifyBtn.addEventListener("click", () => {
  onRoadmapNotify("integrations");
});

elements.runnerType.addEventListener("change", updateRunnerUi);
elements.simpleModeToggle.addEventListener("change", () => {
  onSimpleModeToggle();
});
elements.intentRunBtn.addEventListener("click", () => {
  void onIntentCommandRun();
});
elements.intentCommandInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void onIntentCommandRun();
  }
});
elements.setupAccessBtn.addEventListener("click", () => {
  void onSetupAccess({
    includeApi: false,
    includeDownloads: false,
    includeClipboard: false,
    silent: false,
    preferFullHostAccess: true
  });
});
elements.pointFollowBtn.addEventListener("click", () => {
  void onPointAndFollow();
});
elements.speedProfile.addEventListener("change", () => {
  applySpeedProfileDefaults(elements.speedProfile.value);
});
elements.speedProfileSaveBtn.addEventListener("click", () => {
  onSpeedProfileSave();
});
elements.speedProfileResetBtn.addEventListener("click", () => {
  onSpeedProfileReset();
});
elements.queueReliabilityProfile.addEventListener("change", () => {
  onReliabilityProfileSelected();
});
elements.queueBackoffStrategy.addEventListener("change", () => {
  onReliabilityControlChanged();
});
elements.queueJitterMode.addEventListener("change", () => {
  onReliabilityControlChanged();
});
elements.queueRetryMinDelayMs.addEventListener("change", () => {
  onReliabilityControlChanged();
});
elements.queueRetryMaxDelayMs.addEventListener("change", () => {
  onReliabilityControlChanged();
});
elements.queueSessionReuseMode.addEventListener("change", () => {
  onReliabilityControlChanged();
});
elements.pageUrlSourceMode.addEventListener("change", updatePageSourceUi);
elements.pageActionType.addEventListener("change", updatePageActionUi);
elements.quickExtractBtn.addEventListener("click", () => {
  void onQuickExtract();
});
elements.startBtn.addEventListener("click", () => {
  void onStart();
});
elements.stopBtn.addEventListener("click", () => {
  void onStop();
});
elements.rerunBtn.addEventListener("click", () => {
  void onRerun();
});
elements.clearLogBtn.addEventListener("click", () => {
  elements.eventLog.textContent = "";
});

elements.clearFieldsBtn.addEventListener("click", () => {
  state.listFields = [];
  renderListFields();
});
elements.listAutoDetectBtn.addEventListener("click", () => {
  void onListAutoDetect();
});
elements.clearPageFieldsBtn.addEventListener("click", () => {
  state.pageFields = [];
  renderPageFields();
});

elements.pickContainerBtn.addEventListener("click", () => {
  void startPicker({
    mode: PICKER_MODES.CONTAINER,
    multiSelect: false,
    prompt: "Click one repeating row container element.",
    purpose: "list_container"
  });
});
elements.pickFieldsBtn.addEventListener("click", () => {
  const anchorSelector = String(elements.containerSelector.value || "").trim();
  void startPicker({
    mode: PICKER_MODES.FIELD,
    multiSelect: true,
    anchorSelector,
    prompt: "Click fields inside the container, then press Finish.",
    purpose: "list_fields"
  });
});
elements.pickLoadMoreBtn.addEventListener("click", () => {
  void startPicker({
    mode: PICKER_MODES.LOAD_MORE_BUTTON,
    multiSelect: false,
    prompt: "Click the Load More button.",
    purpose: "list_load_more_button"
  });
});
elements.pickPageFieldsBtn.addEventListener("click", () => {
  void startPicker({
    mode: PICKER_MODES.FIELD,
    multiSelect: true,
    prompt: "Click fields on this page, then press Finish.",
    purpose: "page_fields"
  });
});

elements.refreshDatasourcesBtn.addEventListener("click", () => {
  void (async () => {
    await hydrateDataSources();
    if (elements.pageDatasourceSelect.value) {
      await loadDataSourceUrls();
    }
    await hydrateTableHistory({
      preserveSelection: true
    });
  })();
});
elements.loadDatasourceUrlsBtn.addEventListener("click", () => {
  void loadDataSourceUrls();
});
elements.pageDatasourceColumn.addEventListener("change", () => {
  void loadDataSourceUrls();
});
elements.pageDatasourceSelect.addEventListener("change", () => {
  void loadDataSourceUrls();
});

elements.urlgenGenerateRangeBtn.addEventListener("click", () => {
  onGenerateRangeUrls();
});
elements.urlgenGenerateSeedsBtn.addEventListener("click", () => {
  onGenerateSeedUrls();
});
elements.urlgenGeneratePatternBtn.addEventListener("click", () => {
  onGeneratePatternUrls();
});
elements.urlgenClearBtn.addEventListener("click", () => {
  onClearManualUrls();
});
elements.pageRetryFailedBtn.addEventListener("click", () => {
  onRetryFailedOnly();
});
elements.pageResumeCheckpointBtn.addEventListener("click", () => {
  onResumeCheckpoint();
});
elements.pageFailureReportCsvBtn.addEventListener("click", () => {
  onDownloadFailureReport("csv");
});
elements.pageFailureReportJsonBtn.addEventListener("click", () => {
  onDownloadFailureReport("json");
});

elements.tableRefreshBtn.addEventListener("click", () => {
  void (async () => {
    await hydrateDataSources();
    await hydrateTableHistory({
      preserveSelection: true
    });
    if (getSelectedTableDataId()) {
      await loadSelectedTableRows({
        silent: true
      });
    }
  })();
});
elements.tableLoadBtn.addEventListener("click", () => {
  void loadSelectedTableRows();
});
elements.tableHistorySelect.addEventListener("change", () => {
  if (elements.tableHistorySelect.value) {
    elements.exportTableSelect.value = elements.tableHistorySelect.value;
  }
  updatePageRecoveryPreview();
  void loadSelectedTableRows({
    silent: true
  });
});
elements.tableClearFilterBtn.addEventListener("click", () => {
  clearTableFilters();
  void loadSelectedTableRows();
});
elements.tableRenameBtn.addEventListener("click", () => {
  void onRenameTableColumn();
});
elements.tableDedupeBtn.addEventListener("click", () => {
  void onDedupeTableRows();
});
elements.tableCleanupBtn.addEventListener("click", () => {
  void onCleanupTableRows();
});
elements.tableMergeBtn.addEventListener("click", () => {
  void onMergeTableColumns();
});
elements.tableFilterColumn.addEventListener("change", () => {
  void loadSelectedTableRows();
});
elements.tableSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void loadSelectedTableRows();
  }
});
elements.tableFilterValue.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void loadSelectedTableRows();
  }
});
elements.tableLimit.addEventListener("change", () => {
  elements.tableLimit.value = String(parseTableLimit());
});
elements.tableRenameTo.addEventListener("blur", () => {
  elements.tableRenameTo.value = normalizeColumnName(elements.tableRenameTo.value, "");
});
elements.tableMergeTarget.addEventListener("blur", () => {
  elements.tableMergeTarget.value = normalizeColumnName(elements.tableMergeTarget.value, "");
});
elements.tableCleanupMostlyEmptyThreshold.addEventListener("change", () => {
  elements.tableCleanupMostlyEmptyThreshold.value = String(
    clamp(parseNumber(elements.tableCleanupMostlyEmptyThreshold.value, 0.9), 0.5, 0.99)
  );
});

elements.exportFileBtn.addEventListener("click", () => {
  void onExportFile();
});
elements.exportClipboardBtn.addEventListener("click", () => {
  void onCopyClipboard();
});
elements.exportSheetsBtn.addEventListener("click", () => {
  void onCopyClipboard({
    openSheets: true
  });
});

elements.imageScanBtn.addEventListener("click", () => {
  void onScanImages();
});
elements.imageDownloadBtn.addEventListener("click", () => {
  void onDownloadImages();
});
elements.imageSelectAllBtn.addEventListener("click", () => {
  selectFilteredImages();
});
elements.imageClearSelectionBtn.addEventListener("click", () => {
  clearImageSelection();
});
for (const control of [
  elements.imageSearch,
  elements.imageMinWidth,
  elements.imageMinHeight,
  elements.imageExtFilter,
  elements.imageSizeFilter,
  elements.imageAltFilter,
  elements.imageDownloadMode
]) {
  control.addEventListener("input", () => {
    renderImagePreview();
  });
  control.addEventListener("change", () => {
    renderImagePreview();
  });
}

elements.activationSaveConfigBtn.addEventListener("click", () => {
  void onActivationSaveConfig();
});
elements.activationRefreshSessionBtn.addEventListener("click", () => {
  void hydrateActivationSession().catch((error) => {
    setActivationStatus(`Session refresh failed: ${error.message}`, {
      error: true
    });
  });
});
elements.activationProfileBtn.addEventListener("click", () => {
  void onActivationProfileSync();
});
elements.activationRegisterBtn.addEventListener("click", () => {
  void onActivationRegister();
});
elements.activationLoginBtn.addEventListener("click", () => {
  void onActivationLogin();
});
elements.activationLogoutBtn.addEventListener("click", () => {
  void onActivationLogout();
});
elements.activationLicenseRegisterBtn.addEventListener("click", () => {
  void onActivationLicenseRegister();
});
elements.activationLicenseStatusBtn.addEventListener("click", () => {
  void onActivationLicenseStatus();
});
elements.activationDeviceValidateBtn.addEventListener("click", () => {
  void onActivationValidateDevice();
});
elements.activationDevicesRefreshBtn.addEventListener("click", () => {
  void onActivationListDevices();
});

elements.cloudPolicyLoadBtn.addEventListener("click", () => {
  void onCloudPolicyLoad();
});
elements.cloudPolicySaveBtn.addEventListener("click", () => {
  void onCloudPolicySave();
});
elements.jobsPolicyBtn.addEventListener("click", () => {
  void onJobsPolicy();
});
elements.cloudRefreshAllBtn.addEventListener("click", () => {
  void onCloudRefreshAll();
});

elements.integrationsListBtn.addEventListener("click", () => {
  void onIntegrationsList();
});
elements.integrationsUpsertBtn.addEventListener("click", () => {
  void onIntegrationsUpsert();
});
elements.integrationsTestBtn.addEventListener("click", () => {
  void onIntegrationsTest();
});
elements.integrationsRemoveBtn.addEventListener("click", () => {
  void onIntegrationsRemove();
});
elements.integrationPresetWebhookBtn.addEventListener("click", () => {
  applyIntegrationPreset("webhook");
});
elements.integrationPresetAirtableBtn.addEventListener("click", () => {
  applyIntegrationPreset("airtable");
});
elements.integrationPresetN8nBtn.addEventListener("click", () => {
  applyIntegrationPreset("n8n");
});
elements.integrationTestSecretPlacement.addEventListener("change", () => {
  updateIntegrationTestUi();
});

elements.jobsEnqueueBtn.addEventListener("click", () => {
  void onJobsEnqueue();
});
elements.jobsListBtn.addEventListener("click", () => {
  void onJobsList();
});
elements.jobsDeadBtn.addEventListener("click", () => {
  void onJobsDeadList();
});
elements.jobsCancelBtn.addEventListener("click", () => {
  void onJobsCancel();
});
elements.jobsFillWebhookBtn.addEventListener("click", () => {
  applyJobsPreset("webhook");
});
elements.jobsFillExtractSummaryBtn.addEventListener("click", () => {
  applyJobsPreset("extract_summary");
});
elements.jobsFillMonitorDiffBtn.addEventListener("click", () => {
  applyJobsPreset("monitor_diff");
});

elements.scheduleCreateBtn.addEventListener("click", () => {
  void onSchedulesCreate();
});
elements.scheduleFillWebhookBtn.addEventListener("click", () => {
  applySchedulePreset("webhook");
});
elements.scheduleFillExtractSummaryBtn.addEventListener("click", () => {
  applySchedulePreset("extract_summary");
});
elements.scheduleFillMonitorDiffBtn.addEventListener("click", () => {
  applySchedulePreset("monitor_diff");
});
elements.scheduleListBtn.addEventListener("click", () => {
  void onSchedulesList(false);
});
elements.scheduleListActiveBtn.addEventListener("click", () => {
  void onSchedulesList(true);
});
elements.scheduleToggleBtn.addEventListener("click", () => {
  void onScheduleToggle();
});
elements.scheduleRunNowBtn.addEventListener("click", () => {
  void onScheduleRunNow();
});
elements.scheduleRemoveBtn.addEventListener("click", () => {
  void onScheduleRemove();
});

elements.obsDashboardBtn.addEventListener("click", () => {
  void onObservabilityDashboard();
});
elements.obsSloBtn.addEventListener("click", () => {
  void onObservabilitySlo();
});
elements.obsErrorsBtn.addEventListener("click", () => {
  void onObservabilityErrors();
});
elements.obsJobsBtn.addEventListener("click", () => {
  void onObservabilityJobs();
});

elements.templateSaveBtn.addEventListener("click", () => {
  onTemplateSave();
});
elements.templateSelect.addEventListener("change", () => {
  const template = findSelectedTemplate();
  if (template) {
    applyTemplateMetaControls(template);
  }
});
elements.templateApplyBtn.addEventListener("click", () => {
  onTemplateApply();
});
elements.templateRunBtn.addEventListener("click", () => {
  void onTemplateRun();
});
elements.templateDeleteBtn.addEventListener("click", () => {
  onTemplateDelete();
});
elements.templateExportSelectedBtn.addEventListener("click", () => {
  onTemplateExportSelected();
});
elements.templateExportAllBtn.addEventListener("click", () => {
  onTemplateExportAll();
});
elements.templateImportBtn.addEventListener("click", () => {
  elements.templateImportFile.click();
});
elements.templateImportFile.addEventListener("change", () => {
  const file = elements.templateImportFile.files?.[0] || null;
  void onTemplateImportFromFile(file);
});

elements.diagnosticsSnapshotBtn.addEventListener("click", () => {
  void onDiagnosticsSnapshot();
});
elements.diagnosticsReportBtn.addEventListener("click", () => {
  void onDiagnosticsReport();
});
elements.diagnosticsCopyBtn.addEventListener("click", () => {
  void onDiagnosticsCopy();
});

elements.pageCsvFile.addEventListener("change", () => {
  void (async () => {
    const file = elements.pageCsvFile.files?.[0] || null;
    if (!file) {
      state.csvUrls = [];
      elements.pageCsvCount.value = "0";
      setResolvedUrlsPreview([]);
      return;
    }

    try {
      state.csvUrls = await parseCsvFile(file);
      elements.pageCsvCount.value = String(state.csvUrls.length);
      setResolvedUrlsPreview(state.csvUrls);
      appendLog("csv parsed", {
        fileName: file.name,
        urlCount: state.csvUrls.length
      });
    } catch (error) {
      appendLog(`csv parse failed: ${error.message}`);
      state.csvUrls = [];
      elements.pageCsvCount.value = "0";
      setResolvedUrlsPreview([]);
    }
  })();
});

elements.pageManualUrls.addEventListener("input", () => {
  if (String(elements.pageUrlSourceMode.value || "") !== URL_SOURCE_MODES.MANUAL) return;
  const urls = parseManualUrls(elements.pageManualUrls.value);
  setResolvedUrlsPreview(urls);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === MESSAGE_TYPES.EVENT) {
    handleRuntimeEvent(message.payload || {});
    return;
  }
  if (message?.type === MESSAGE_TYPES.PICKER_EVENT) {
    handlePickerEvent(message.payload || {});
    return;
  }
  if (message?.type === MESSAGE_TYPES.IMAGE_DOWNLOAD_PROGRESS_EVENT) {
    const payload = message.payload || {};
    const status = String(payload.status || "").trim();
    const line =
      status === "failed"
        ? `Downloading images... ${Number(payload.index || 0)}/${Number(payload.total || 0)} • failed ${Number(payload.failed || 0)}`
        : `Downloading images... ${Number(payload.index || 0)}/${Number(payload.total || 0)} • ok ${Number(payload.completed || 0)}`;
    setImageStatus(line, {
      error: status === "failed"
    });
  }
});

renderListFields();
renderPageFields();
state.welcomeVisits = loadWelcomeVisits();
state.domainAutonomyHints = loadDomainAutonomyHintsFromStorage();
state.templates = loadTemplatesFromStorage();
state.speedProfiles = loadSpeedProfilesFromStorage();
state.reliabilitySettings = loadReliabilitySettingsFromStorage();
state.simpleMode = true;
renderTemplates();
renderIntegrationSecrets();
renderJobs([]);
renderSchedules();
setObservabilityOutput({});
setDiagnosticsOutput({});
setPickerStatus("idle");
setListAutoDetectStatus("Auto-detect ready");
renderListAutoDetectPreview(null);
setTableStatus("No table loaded");
setExportStatus("Export ready");
setImageStatus("Scan page to load images");
setActivationStatus("Not connected");
setRoadmapStatus("Roadmap notify actions ready");
setCloudStatus("Cloud control ready");
setTemplatesStatus("Templates & diagnostics ready");
setSpeedProfileStatus("Profile editor ready");
setReliabilityProfileStatus("Reliability profiles ready");
setUrlGeneratorStatus("URL generator ready");
setPageRecoveryStatus("Recovery controls ready");
setSetupAccessStatus("Access setup ready");
if (elements.quickFlowStatusLine) {
  elements.quickFlowStatusLine.textContent = "Quick flow ready";
}
renderStatusPill();
updatePageRecoveryPreview();
updateIntegrationTestUi();
renderImagePreview();
applySpeedProfileDefaults(elements.speedProfile.value || "normal");
applyReliabilitySettingsToControls(state.reliabilitySettings, {
  persist: false
});
setReliabilityProfileStatus(`Loaded profile "${state.reliabilitySettings?.profile || DEFAULT_RELIABILITY_PROFILE}"`);
applySimpleModeUi();
await maybeHydrateStartUrlFromActiveTab({
  force: false
});
updatePageSourceUi();
updatePageActionUi();
await hydrateRunnerCatalog();
applyToolPreset(state.activeTool, {
  navigate: false,
  forceWelcome: false,
  track: false
});
setShellView(SHELL_VIEWS.MENU);
await hydrateDataSources().catch(() => {
  appendLog("datasource list failed");
});
await hydrateTableHistory({
  preserveSelection: true
}).catch(() => {
  appendLog("table history list failed");
});
await loadSelectedTableRows({
  silent: true
}).catch(() => {
  setTableStatus("Unable to load table rows", {
    error: true
  });
});
await hydrateActivationSession().catch(() => {
  elements.activationSessionSummary.textContent = "No session loaded.";
});
await hydrateSnapshot();
