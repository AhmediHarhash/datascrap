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
  activeToolHeading: document.getElementById("active-tool-heading"),
  selectedToolName: document.getElementById("selected-tool-name"),
  runnerType: document.getElementById("runner-type"),
  startUrl: document.getElementById("start-url"),
  startBtn: document.getElementById("start-btn"),
  stopBtn: document.getElementById("stop-btn"),
  rerunBtn: document.getElementById("rerun-btn"),
  statusPill: document.getElementById("status-pill"),
  eventLog: document.getElementById("event-log"),
  clearLogBtn: document.getElementById("clear-log-btn"),
  pickerStatus: document.getElementById("picker-status"),

  listConfigPanel: document.getElementById("list-config-panel"),
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
  queueWaitSelector: document.getElementById("queue-wait-selector"),
  queueWaitSelectorTimeoutMs: document.getElementById("queue-wait-selector-timeout-ms"),
  queueWaitPageLoad: document.getElementById("queue-wait-page-load"),

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

  exportTableSelect: document.getElementById("export-table-select"),
  exportFormat: document.getElementById("export-format"),
  exportUseCurrentFilters: document.getElementById("export-use-current-filters"),
  exportFileBtn: document.getElementById("export-file-btn"),
  exportClipboardBtn: document.getElementById("export-clipboard-btn"),
  exportSheetsBtn: document.getElementById("export-sheets-btn"),
  exportStatusLine: document.getElementById("export-status-line"),

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
  integrationsListBtn: document.getElementById("integrations-list-btn"),
  integrationsUpsertBtn: document.getElementById("integrations-upsert-btn"),
  integrationsRemoveBtn: document.getElementById("integrations-remove-btn"),
  integrationsList: document.getElementById("integrations-list"),

  jobsJobType: document.getElementById("jobs-job-type"),
  jobsPayload: document.getElementById("jobs-payload"),
  jobsFillWebhookBtn: document.getElementById("jobs-fill-webhook-btn"),
  jobsFillExtractSummaryBtn: document.getElementById("jobs-fill-extract-summary-btn"),
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
  templateSelect: document.getElementById("template-select"),
  templateNotes: document.getElementById("template-notes"),
  templateSaveBtn: document.getElementById("template-save-btn"),
  templateApplyBtn: document.getElementById("template-apply-btn"),
  templateRunBtn: document.getElementById("template-run-btn"),
  templateDeleteBtn: document.getElementById("template-delete-btn"),
  templateList: document.getElementById("template-list"),
  templatesStatusLine: document.getElementById("templates-status-line"),

  diagnosticsSnapshotBtn: document.getElementById("diagnostics-snapshot-btn"),
  diagnosticsReportBtn: document.getElementById("diagnostics-report-btn"),
  diagnosticsCopyBtn: document.getElementById("diagnostics-copy-btn"),
  diagnosticsOutput: document.getElementById("diagnostics-output")
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
  speedProfiles: {}
};

const SHELL_VIEWS = Object.freeze({
  MENU: "menu",
  HISTORY: "history",
  DATA: "data",
  TOOLS: "tools",
  LATEST: "latest"
});

const WELCOME_VISIT_LIMIT = 3;
const WELCOME_VISITS_STORAGE_KEY = "datascrap.sidepanel.welcome-visits.v1";
const TEMPLATES_STORAGE_KEY = "datascrap.sidepanel.templates.v1";
const SPEED_PROFILES_STORAGE_KEY = "datascrap.sidepanel.speed-profiles.v1";
const TEMPLATE_LIMIT = 200;
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
const ROADMAP_NOTIFY_URLS = Object.freeze({
  scheduling: "https://datascrap.app/waitlist/scheduling",
  integrations: "https://datascrap.app/waitlist/integrations"
});

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

function setStatus(status) {
  state.currentStatus = String(status || AUTOMATION_STATES.IDLE);
  elements.statusPill.textContent = state.currentStatus;
  elements.statusPill.classList.toggle(
    "status-running",
    state.currentStatus === AUTOMATION_STATES.RUNNING || state.currentStatus === AUTOMATION_STATES.STOPPING
  );
  elements.statusPill.classList.toggle("status-error", state.currentStatus === AUTOMATION_STATES.ERROR);
}

function setPickerStatus(text) {
  elements.pickerStatus.textContent = `picker: ${text}`;
}

function setListAutoDetectStatus(text, { error = false } = {}) {
  if (!elements.listAutoDetectStatusLine) return;
  elements.listAutoDetectStatusLine.textContent = String(text || "");
  elements.listAutoDetectStatusLine.classList.toggle("status-error", Boolean(error));
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

function updateRunnerUi() {
  const runnerType = elements.runnerType.value;
  const isListRunner = runnerType === RUNNER_TYPES.LIST_EXTRACTOR;
  const isPageRunner = runnerType === RUNNER_TYPES.PAGE_EXTRACTOR;
  const isMetadataRunner = runnerType === RUNNER_TYPES.METADATA_EXTRACTOR;
  elements.listConfigPanel.style.display = isListRunner ? "grid" : "none";
  elements.speedProfileEditor.style.display = isListRunner ? "grid" : "none";
  elements.pageConfigPanel.style.display = isPageRunner || isMetadataRunner ? "grid" : "none";
  elements.pageActionTypeField.style.display = isMetadataRunner ? "none" : "grid";
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
  elements.activationStatusLine.textContent = String(text || "");
  elements.activationStatusLine.classList.toggle("status-error", Boolean(error));
}

function setRoadmapStatus(text, { error = false } = {}) {
  if (!elements.roadmapStatusLine) return;
  elements.roadmapStatusLine.textContent = String(text || "");
  elements.roadmapStatusLine.classList.toggle("status-error", Boolean(error));
}

function setCloudStatus(text, { error = false } = {}) {
  elements.cloudStatusLine.textContent = String(text || "");
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
      .map((item) => ({
        id: String(item.id || randomId("tpl")),
        name: String(item.name || "Untitled Template").trim() || "Untitled Template",
        notes: String(item.notes || "").trim(),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
        payload: item.payload && typeof item.payload === "object" ? item.payload : {}
      }))
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
  elements.templateSelect.innerHTML = "";
  if (state.templates.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No saved templates";
    elements.templateSelect.append(option);
    elements.templateList.textContent = "No templates saved.";
    return;
  }

  for (const template of state.templates) {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = `${template.name} (${formatRelativeTimestamp(template.updatedAt)})`;
    elements.templateSelect.append(option);
  }

  const lines = state.templates.map((template) => {
    const runnerType = String(template.payload?.runnerType || "unknown");
    return `${template.id} | ${template.name} | ${runnerType} | ${template.notes || "-"}`;
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

function normalizeShellView(value) {
  const next = String(value || "").trim();
  if (Object.values(SHELL_VIEWS).includes(next)) return next;
  return SHELL_VIEWS.MENU;
}

function setShellView(view) {
  const next = normalizeShellView(view);
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

function callChromePermissions(method, details) {
  return new Promise((resolve, reject) => {
    chrome.permissions[method](details, (result) => {
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
  }
  state.activeTableDataId = getSelectedTableDataId() || String(list[0]?.tableDataId || "").trim() || null;
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
}

async function loadSelectedTableRows({ silent = false } = {}) {
  const tableDataId = getSelectedTableDataId();
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

function handleRuntimeEvent(eventPayload) {
  const automationId = eventPayload?.payload?.automationId || null;
  if (automationId) {
    state.currentAutomationId = automationId;
  }

  const nextStatus = resolveStatusFromEvent(eventPayload);
  setStatus(nextStatus);

  if (
    nextStatus === AUTOMATION_STATES.COMPLETED ||
    nextStatus === AUTOMATION_STATES.STOPPED ||
    nextStatus === AUTOMATION_STATES.ERROR
  ) {
    state.lastTerminalAutomationId = automationId || state.lastTerminalAutomationId;
    void hydrateDataSources().catch(() => {
      appendLog("datasource refresh failed after terminal event");
    });
    void hydrateTableHistory({
      preserveSelection: true
    }).catch(() => {
      appendLog("table history refresh failed after terminal event");
    });
  }

  appendLog(`event: ${eventPayload.eventType}`, eventPayload.payload || {});
}

function applyPickerSessionResult(session, purpose) {
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
      applyPickerSessionResult(session, purpose);
    }
    state.pickerSessionPurposeById.delete(session.sessionId);
    return;
  }

  if (eventType === "canceled") {
    setPickerStatus("canceled");
    appendLog("picker canceled", {
      sessionId: session.sessionId
    });
    state.pickerSessionPurposeById.delete(session.sessionId);
    return;
  }

  if (eventType === "error") {
    setPickerStatus("error");
    appendLog("picker error", session);
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

function buildMapsOptions() {
  return {
    includeBasicInfo: Boolean(elements.mapsIncludeBasicInfo.checked),
    includeContactDetails: Boolean(elements.mapsIncludeContactDetails.checked),
    includeReviews: Boolean(elements.mapsIncludeReviews.checked),
    includeHours: Boolean(elements.mapsIncludeHours.checked),
    includeLocation: Boolean(elements.mapsIncludeLocation.checked),
    includeImages: Boolean(elements.mapsIncludeImages.checked)
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

function applyJobsPreset(presetKey) {
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
  const templateId = randomId("template");
  const now = new Date().toISOString();

  state.templates.unshift({
    id: templateId,
    name,
    notes,
    payload,
    createdAt: now,
    updatedAt: now
  });
  state.templates = state.templates.slice(0, TEMPLATE_LIMIT);
  saveTemplatesToStorage();
  renderTemplates();
  elements.templateSelect.value = templateId;
  setTemplatesStatus(`Template saved: ${name}`);
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
  applyTemplatePayload(template.payload);
  setTemplatesStatus(`Running template: ${template.name}`);
  await onStart();
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

async function onDiagnosticsSnapshot() {
  setTemplatesStatus("Loading runtime snapshot...");
  try {
    const snapshot = await sendMessage(MESSAGE_TYPES.SNAPSHOT_REQUEST);
    state.diagnosticsReport = {
      generatedAt: new Date().toISOString(),
      snapshot,
      activation: await sendMessage(MESSAGE_TYPES.ACTIVATION_SESSION_GET_REQUEST),
      context: {
        activeTool: state.activeTool,
        activeShellView: state.activeShellView,
        currentStatus: state.currentStatus,
        templateCount: state.templates.length
      }
    };
    setDiagnosticsOutput(state.diagnosticsReport);
    setTemplatesStatus("Runtime snapshot loaded");
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
    state.diagnosticsReport = {
      generatedAt: new Date().toISOString(),
      snapshot,
      activation,
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
    setTemplatesStatus("Diagnostics report generated");
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

async function startPicker({ mode, multiSelect, anchorSelector = "", prompt = "", purpose }) {
  try {
    const response = await sendMessage(MESSAGE_TYPES.PICKER_START_REQUEST, {
      mode,
      multiSelect,
      anchorSelector,
      prompt
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
  } catch (error) {
    setPickerStatus("error");
    appendLog(`picker start failed: ${error.message}`);
  }
}

async function onListAutoDetect() {
  setListAutoDetectStatus("Auto-detecting list setup...");
  try {
    const response = await sendMessage(MESSAGE_TYPES.LIST_AUTODETECT_REQUEST, {
      maxFields: 8,
      maxPreviewRows: 5,
      minItems: 3
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
  } catch (error) {
    setListAutoDetectStatus(`Auto-detect failed: ${error.message}`, {
      error: true
    });
    appendLog(`list auto-detect failed: ${error.message}`);
  }
}

function buildListAutomationConfig() {
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
        attempts: parseNumber(elements.loadMoreAttempts.value, 5),
        delayMs: parseNumber(elements.loadMoreDelayMs.value, 900),
        scrollPx: parseNumber(elements.loadMoreScrollPx.value, 1800),
        noChangeThreshold: parseNumber(elements.loadMoreNoChangeThreshold.value, 2),
        buttonSelector: String(elements.loadMoreButtonSelector.value || "").trim(),
        nextLinkSelector: String(elements.loadMoreNextSelector.value || "").trim()
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

async function buildPageAutomationConfig() {
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
    actions[0].mapsOptions = buildMapsOptions();
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

async function onStart() {
  try {
    const runnerType = elements.runnerType.value;
    const actionType = String(elements.pageActionType.value || PAGE_ACTION_TYPES.EXTRACT_PAGES).trim();
    const config =
      runnerType === RUNNER_TYPES.LIST_EXTRACTOR
        ? buildListAutomationConfig()
        : runnerType === RUNNER_TYPES.METADATA_EXTRACTOR
          ? await buildMetadataAutomationConfig()
          : await buildPageAutomationConfig();

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
  } catch (error) {
    appendLog(`start failed: ${error.message}`);
    setStatus(AUTOMATION_STATES.ERROR);
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

  elements.startBtn.focus();
});

elements.roadmapSchedulingNotifyBtn.addEventListener("click", () => {
  onRoadmapNotify("scheduling");
});
elements.roadmapIntegrationsNotifyBtn.addEventListener("click", () => {
  onRoadmapNotify("integrations");
});

elements.runnerType.addEventListener("change", updateRunnerUi);
elements.speedProfile.addEventListener("change", () => {
  applySpeedProfileDefaults(elements.speedProfile.value);
});
elements.speedProfileSaveBtn.addEventListener("click", () => {
  onSpeedProfileSave();
});
elements.speedProfileResetBtn.addEventListener("click", () => {
  onSpeedProfileReset();
});
elements.pageUrlSourceMode.addEventListener("change", updatePageSourceUi);
elements.pageActionType.addEventListener("change", updatePageActionUi);
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
elements.integrationsRemoveBtn.addEventListener("click", () => {
  void onIntegrationsRemove();
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

elements.scheduleCreateBtn.addEventListener("click", () => {
  void onSchedulesCreate();
});
elements.scheduleFillWebhookBtn.addEventListener("click", () => {
  applySchedulePreset("webhook");
});
elements.scheduleFillExtractSummaryBtn.addEventListener("click", () => {
  applySchedulePreset("extract_summary");
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
elements.templateApplyBtn.addEventListener("click", () => {
  onTemplateApply();
});
elements.templateRunBtn.addEventListener("click", () => {
  void onTemplateRun();
});
elements.templateDeleteBtn.addEventListener("click", () => {
  onTemplateDelete();
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
state.templates = loadTemplatesFromStorage();
state.speedProfiles = loadSpeedProfilesFromStorage();
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
renderImagePreview();
applySpeedProfileDefaults(elements.speedProfile.value || "normal");
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
