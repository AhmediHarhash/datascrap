"use strict";

const { randomUUID, createHash } = require("node:crypto");
const { access, mkdir, readFile, rename, rm, stat, writeFile } = require("node:fs/promises");
const { dirname, format, parse, resolve } = require("node:path");

function toText(value) {
  return String(value || "").trim();
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const raw = toText(value).toLowerCase();
  if (!raw) return fallback;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return fallback;
}

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function normalizeBaseUrl(value) {
  const raw = toText(value);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    const protocol = toText(parsed.protocol).toLowerCase();
    const hostname = toText(parsed.hostname).toLowerCase();
    const pathname = toText(parsed.pathname).replace(/\/+$/, "");
    const explicitPort = toText(parsed.port);
    const isDefaultHttp = protocol === "http:" && explicitPort === "80";
    const isDefaultHttps = protocol === "https:" && explicitPort === "443";
    const portSegment = explicitPort && !isDefaultHttp && !isDefaultHttps ? `:${explicitPort}` : "";
    return `${protocol}//${hostname}${portSegment}${pathname}`;
  } catch (_error) {
    return raw.replace(/\/+$/, "").toLowerCase();
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(toText(value));
}

function normalizeCursorPair(createdAtInput, idInput, contextLabel = "scan cursor") {
  const createdAtRaw = toText(createdAtInput);
  const idRaw = toText(idInput).toLowerCase();
  const hasCreatedAt = Boolean(createdAtRaw);
  const hasId = Boolean(idRaw);
  if (!hasCreatedAt && !hasId) return null;
  if (!hasCreatedAt || !hasId) {
    throw new Error(`${contextLabel} requires both createdAt and id values.`);
  }
  const createdAtMs = Date.parse(createdAtRaw);
  if (!Number.isFinite(createdAtMs)) {
    throw new Error(`${contextLabel} createdAt must be a valid ISO timestamp.`);
  }
  if (!isUuid(idRaw)) {
    throw new Error(`${contextLabel} id must be a valid UUID.`);
  }
  return {
    createdAt: new Date(createdAtMs).toISOString(),
    id: idRaw
  };
}

function normalizeResumeFilterField(key, value) {
  if (typeof value === "undefined") return undefined;
  switch (key) {
    case "action": {
      const action = toText(value).toLowerCase();
      return action || null;
    }
    case "duplicatesOnly": {
      return toBool(value, false);
    }
    case "signatureMode": {
      return toText(value).toLowerCase() === "target" ? "target" : "strict";
    }
    case "dedupeKeep": {
      return toText(value).toLowerCase() === "newest" ? "newest" : "oldest";
    }
    case "minAgeMinutes":
    case "intervalLte": {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) return null;
      return Math.floor(parsed);
    }
    case "limit": {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return null;
      return Math.max(1, Math.min(100, Math.floor(parsed)));
    }
    case "jobType":
    case "nameContains": {
      const normalized = toText(value).toLowerCase();
      return normalized || null;
    }
    default:
      return value;
  }
}

function buildExpectedResumeFilterSnapshot(options) {
  return {
    action: normalizeResumeFilterField("action", options.action),
    duplicatesOnly: normalizeResumeFilterField("duplicatesOnly", options.duplicatesOnly),
    signatureMode: normalizeResumeFilterField("signatureMode", options.signatureMode),
    dedupeKeep: normalizeResumeFilterField("dedupeKeep", options.dedupeKeep),
    minAgeMinutes: normalizeResumeFilterField("minAgeMinutes", options.minAgeMinutes),
    jobType: normalizeResumeFilterField("jobType", options.jobType),
    nameContains: normalizeResumeFilterField("nameContains", options.nameContains),
    intervalLte: normalizeResumeFilterField("intervalLte", options.intervalLte),
    limit: normalizeResumeFilterField("limit", options.limit)
  };
}

function buildResumeArtifactFilterSnapshot(payload) {
  const parsed = payload && typeof payload === "object" ? payload : {};
  const filters = parsed.filters && typeof parsed.filters === "object" ? parsed.filters : {};
  const actionSource = typeof filters.action === "undefined" ? parsed.action : filters.action;
  return {
    action: normalizeResumeFilterField("action", actionSource),
    duplicatesOnly: normalizeResumeFilterField("duplicatesOnly", filters.duplicatesOnly),
    signatureMode: normalizeResumeFilterField("signatureMode", filters.signatureMode),
    dedupeKeep: normalizeResumeFilterField("dedupeKeep", filters.dedupeKeep),
    minAgeMinutes: normalizeResumeFilterField("minAgeMinutes", filters.minAgeMinutes),
    jobType: normalizeResumeFilterField("jobType", filters.jobType),
    nameContains: normalizeResumeFilterField("nameContains", filters.nameContains),
    intervalLte: normalizeResumeFilterField("intervalLte", filters.intervalLte),
    limit: normalizeResumeFilterField("limit", filters.limit)
  };
}

function computeResumeFilterMismatchFields(expected, actual) {
  const expectedSnapshot = expected && typeof expected === "object" ? expected : {};
  const actualSnapshot = actual && typeof actual === "object" ? actual : {};
  const fields = [];
  for (const key of Object.keys(expectedSnapshot)) {
    const expectedValue = typeof expectedSnapshot[key] === "undefined" ? null : expectedSnapshot[key];
    const actualValue = typeof actualSnapshot[key] === "undefined" ? null : actualSnapshot[key];
    if (expectedValue !== actualValue) {
      fields.push(key);
    }
  }
  return fields;
}

const EXPECTED_SCAN_RESUME_KIND = "queue_hygiene_scan_checkpoint";
const SCAN_RESUME_SCHEMA_VERSION = 1;

function normalizeResumeArtifactKind(value) {
  return toText(value).toLowerCase();
}

function normalizeResumeGeneratedAtSource(value) {
  const normalized = toText(value).toLowerCase().replace(/_/g, "-");
  if (normalized === "payload" || normalized === "file-mtime" || normalized === "payload-or-file-mtime") {
    return normalized;
  }
  return "payload-or-file-mtime";
}

function normalizeResolvedResumeGeneratedAtSource(value) {
  const normalized = toText(value).toLowerCase().replace(/-/g, "_");
  if (normalized === "payload" || normalized === "file_mtime" || normalized === "none") {
    return normalized;
  }
  return "none";
}

function normalizeSha256(value) {
  const normalized = toText(value).toLowerCase();
  return /^[0-9a-f]{64}$/.test(normalized) ? normalized : "";
}

function parseArgs(argv = []) {
  const options = {
    action: "list",
    activeOnly: true,
    apply: false,
    maxPause: Math.max(0, Math.min(1000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_MAX_PAUSE || "25", 25))),
    forcePauseOverLimit: toBool(process.env.CONTROL_API_SCHEDULE_HYGIENE_FORCE_PAUSE_OVER_LIMIT || "false", false),
    pauseBatchSize: Math.max(1, Math.min(100, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_PAUSE_BATCH_SIZE || "20", 20))),
    pauseBatchDelayMs: Math.max(0, Math.min(60_000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_PAUSE_BATCH_DELAY_MS || "0", 0))),
    continueOnPauseError: toBool(process.env.CONTROL_API_SCHEDULE_HYGIENE_CONTINUE_ON_PAUSE_ERROR || "true", true),
    pauseRetryCount: Math.max(0, Math.min(10, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_COUNT || "1", 1))),
    pauseRetryDelayMs: Math.max(
      0,
      Math.min(60_000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_DELAY_MS || "250", 250))
    ),
    pauseRetryBackoffFactor: Math.max(
      1,
      Math.min(5, Number(process.env.CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_BACKOFF_FACTOR || "1.5") || 1.5)
    ),
    pauseRetryJitterMs: Math.max(
      0,
      Math.min(5_000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_JITTER_MS || "100", 100))
    ),
    pauseRequestTimeoutMs: Math.max(
      1_000,
      Math.min(120_000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_PAUSE_REQUEST_TIMEOUT_MS || "15000", 15000))
    ),
    listRetryCount: Math.max(0, Math.min(10, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_COUNT || "1", 1))),
    listRetryDelayMs: Math.max(
      0,
      Math.min(60_000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_DELAY_MS || "250", 250))
    ),
    listRetryBackoffFactor: Math.max(
      1,
      Math.min(5, Number(process.env.CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_BACKOFF_FACTOR || "1.5") || 1.5)
    ),
    listRetryJitterMs: Math.max(
      0,
      Math.min(5_000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_JITTER_MS || "100", 100))
    ),
    listRequestTimeoutMs: Math.max(
      1_000,
      Math.min(120_000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_LIST_REQUEST_TIMEOUT_MS || "15000", 15000))
    ),
    outputFile: toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_FILE || ""),
    outputCompact: toBool(process.env.CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_COMPACT || "false", false),
    outputTimestamp: toBool(process.env.CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_TIMESTAMP || "false", false),
    outputOverwrite: toBool(process.env.CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_OVERWRITE || "true", true),
    redactSignatures: toBool(process.env.CONTROL_API_SCHEDULE_HYGIENE_REDACT_SIGNATURES || "false", false),
    minAgeMinutes: Math.max(0, Math.min(525600, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_MIN_AGE_MINUTES || "0", 0))),
    scanAll: toBool(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_ALL || "false", false),
    scanMaxPages: Math.max(0, Math.min(100000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_MAX_PAGES || "100", 100))),
    scanHardMaxPages: Math.max(
      1,
      Math.min(100000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_HARD_MAX_PAGES || "5000", 5000))
    ),
    scanAutoContinue: toBool(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_AUTO_CONTINUE || "false", false),
    scanAutoContinueMaxSegments: Math.max(
      1,
      Math.min(1000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_AUTO_CONTINUE_MAX_SEGMENTS || "20", 20))
    ),
    scanCheckpointFile: toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_CHECKPOINT_FILE || ""),
    scanCheckpointEveryPages: Math.max(
      1,
      Math.min(1000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_CHECKPOINT_EVERY_PAGES || "1", 1))
    ),
    scanStartCursorCreatedAt: toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_START_CURSOR_CREATED_AT || ""),
    scanStartCursorId: toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_START_CURSOR_ID || "").toLowerCase(),
    scanResumeFile: toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FILE || ""),
    scanResumeFromCheckpoint: toBool(
      process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FROM_CHECKPOINT || "true",
      true
    ),
    scanResumeValidateApiBase: toBool(
      process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_API_BASE || "true",
      true
    ),
    scanResumeRequireApiBase: toBool(
      process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_REQUIRE_API_BASE || "false",
      false
    ),
    scanResumeValidateKind: toBool(
      process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_KIND || "true",
      true
    ),
    scanResumeValidateSchemaVersion: toBool(
      process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_SCHEMA_VERSION || "true",
      true
    ),
    scanResumeGeneratedAtSource: normalizeResumeGeneratedAtSource(
      process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_GENERATED_AT_SOURCE || "payload-or-file-mtime"
    ),
    scanResumeSha256: normalizeSha256(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SHA256 || ""),
    scanResumeValidateFilters: toBool(
      process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_FILTERS || "true",
      true
    ),
    scanResumeApiBaseMismatchBehavior:
      toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_API_BASE_MISMATCH_BEHAVIOR || "error").toLowerCase() ===
      "restart"
        ? "restart"
        : "error",
    scanResumeApiBaseMissingBehavior:
      toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_API_BASE_MISSING_BEHAVIOR || "restart").toLowerCase() ===
      "error"
        ? "error"
        : "restart",
    scanResumeKindMismatchBehavior:
      toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_KIND_MISMATCH_BEHAVIOR || "error").toLowerCase() ===
      "restart"
        ? "restart"
        : "error",
    scanResumeSchemaVersionMismatchBehavior:
      toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SCHEMA_VERSION_MISMATCH_BEHAVIOR || "restart").toLowerCase() ===
      "error"
        ? "error"
        : "restart",
    scanResumeFilterMismatchBehavior:
      toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FILTER_MISMATCH_BEHAVIOR || "restart").toLowerCase() ===
      "error"
        ? "error"
        : "restart",
    scanResumeMaxAgeMinutes: Math.max(
      0,
      Math.min(525600, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_AGE_MINUTES || "0", 0))
    ),
    scanResumeMaxBytes: Math.max(
      0,
      Math.min(50_000_000, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_BYTES || "0", 0))
    ),
    scanResumeMaxFutureMinutes: Math.max(
      0,
      Math.min(525600, toInt(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_FUTURE_MINUTES || "0", 0))
    ),
    scanResumeStaleBehavior:
      toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_STALE_BEHAVIOR || "restart").toLowerCase() ===
      "error"
        ? "error"
        : "restart",
    scanResumeFutureBehavior:
      toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FUTURE_BEHAVIOR || "restart").toLowerCase() ===
      "error"
        ? "error"
        : "restart",
    scanResumeSizeBehavior:
      toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SIZE_BEHAVIOR || "restart").toLowerCase() ===
      "error"
        ? "error"
        : "restart",
    scanResumeHashBehavior:
      toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_HASH_BEHAVIOR || "restart").toLowerCase() ===
      "error"
        ? "error"
        : "restart",
    scanResumeAllowExhausted: toBool(
      process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_ALLOW_EXHAUSTED || "true",
      true
    ),
    scanResumeExhaustedBehavior:
      toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_EXHAUSTED_BEHAVIOR || "noop").toLowerCase() ===
      "restart"
        ? "restart"
        : "noop",
    limit: 100,
    jobType: "",
    nameContains: "",
    intervalLte: 0,
    duplicatesOnly: toBool(process.env.CONTROL_API_SCHEDULE_HYGIENE_DUPLICATES_ONLY || "false", false),
    dedupeKeep:
      toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_DEDUPE_KEEP || "oldest").toLowerCase() === "newest"
        ? "newest"
        : "oldest",
    signatureMode:
      toText(process.env.CONTROL_API_SCHEDULE_HYGIENE_SIGNATURE_MODE || "strict").toLowerCase() === "target"
        ? "target"
        : "strict",
    apiBaseUrl: toText(process.env.API_BASE_URL || "http://127.0.0.1:3000"),
    bearerToken: toText(process.env.CONTROL_API_BEARER_TOKEN || process.env.ACCESS_TOKEN || ""),
    authEmail: toText(
      process.env.CONTROL_API_EMAIL ||
        process.env.CONTROL_API_LOGIN_EMAIL ||
        process.env.CHAOS_EMAIL ||
        process.env.SCHEDULE_SMOKE_EMAIL ||
        process.env.SMOKE_EMAIL ||
        ""
    ).toLowerCase(),
    authPassword: toText(
      process.env.CONTROL_API_PASSWORD ||
        process.env.CONTROL_API_LOGIN_PASSWORD ||
        process.env.CHAOS_PASSWORD ||
        process.env.SCHEDULE_SMOKE_PASSWORD ||
        process.env.SMOKE_PASSWORD ||
        ""
    ),
    authDeviceId: toText(
      process.env.CONTROL_API_DEVICE_ID ||
        process.env.CONTROL_API_LOGIN_DEVICE_ID ||
        process.env.CHAOS_DEVICE_ID ||
        process.env.SCHEDULE_SMOKE_DEVICE_ID ||
        process.env.SMOKE_DEVICE_ID ||
        "queue-hygiene-device"
    ),
    authDeviceName: toText(
      process.env.CONTROL_API_DEVICE_NAME ||
        process.env.CONTROL_API_LOGIN_DEVICE_NAME ||
        process.env.CHAOS_DEVICE_NAME ||
        "Queue Hygiene Device"
    ),
    registerIfMissing: toBool(
      process.env.CONTROL_API_REGISTER_IF_MISSING || process.env.CONTROL_API_LOGIN_REGISTER_IF_MISSING || "false",
      false
    )
  };

  for (const arg of argv) {
    const token = toText(arg);
    if (!token) continue;

    if (token.startsWith("--action=")) {
      const action = toText(token.slice("--action=".length)).toLowerCase();
      if (action === "list" || action === "pause") {
        options.action = action;
      }
      continue;
    }
    if (token.startsWith("--active-only=")) {
      options.activeOnly = toBool(token.slice("--active-only=".length), true);
      continue;
    }
    if (token === "--apply") {
      options.apply = true;
      continue;
    }
    if (token.startsWith("--max-pause=")) {
      const parsed = toInt(token.slice("--max-pause=".length), options.maxPause);
      options.maxPause = Math.max(0, Math.min(1000, parsed));
      continue;
    }
    if (token.startsWith("--force-pause-over-limit=")) {
      options.forcePauseOverLimit = toBool(
        token.slice("--force-pause-over-limit=".length),
        options.forcePauseOverLimit
      );
      continue;
    }
    if (token.startsWith("--pause-batch-size=")) {
      const parsed = toInt(token.slice("--pause-batch-size=".length), options.pauseBatchSize);
      options.pauseBatchSize = Math.max(1, Math.min(100, parsed));
      continue;
    }
    if (token.startsWith("--pause-batch-delay-ms=")) {
      const parsed = toInt(token.slice("--pause-batch-delay-ms=".length), options.pauseBatchDelayMs);
      options.pauseBatchDelayMs = Math.max(0, Math.min(60_000, parsed));
      continue;
    }
    if (token.startsWith("--continue-on-pause-error=")) {
      options.continueOnPauseError = toBool(token.slice("--continue-on-pause-error=".length), options.continueOnPauseError);
      continue;
    }
    if (token.startsWith("--pause-retry-count=")) {
      const parsed = toInt(token.slice("--pause-retry-count=".length), options.pauseRetryCount);
      options.pauseRetryCount = Math.max(0, Math.min(10, parsed));
      continue;
    }
    if (token.startsWith("--pause-retry-delay-ms=")) {
      const parsed = toInt(token.slice("--pause-retry-delay-ms=".length), options.pauseRetryDelayMs);
      options.pauseRetryDelayMs = Math.max(0, Math.min(60_000, parsed));
      continue;
    }
    if (token.startsWith("--pause-retry-backoff-factor=")) {
      const parsed = Number(token.slice("--pause-retry-backoff-factor=".length));
      if (Number.isFinite(parsed)) {
        options.pauseRetryBackoffFactor = Math.max(1, Math.min(5, parsed));
      }
      continue;
    }
    if (token.startsWith("--pause-retry-jitter-ms=")) {
      const parsed = toInt(token.slice("--pause-retry-jitter-ms=".length), options.pauseRetryJitterMs);
      options.pauseRetryJitterMs = Math.max(0, Math.min(5_000, parsed));
      continue;
    }
    if (token.startsWith("--pause-request-timeout-ms=")) {
      const parsed = toInt(token.slice("--pause-request-timeout-ms=".length), options.pauseRequestTimeoutMs);
      options.pauseRequestTimeoutMs = Math.max(1_000, Math.min(120_000, parsed));
      continue;
    }
    if (token.startsWith("--list-retry-count=")) {
      const parsed = toInt(token.slice("--list-retry-count=".length), options.listRetryCount);
      options.listRetryCount = Math.max(0, Math.min(10, parsed));
      continue;
    }
    if (token.startsWith("--list-retry-delay-ms=")) {
      const parsed = toInt(token.slice("--list-retry-delay-ms=".length), options.listRetryDelayMs);
      options.listRetryDelayMs = Math.max(0, Math.min(60_000, parsed));
      continue;
    }
    if (token.startsWith("--list-retry-backoff-factor=")) {
      const parsed = Number(token.slice("--list-retry-backoff-factor=".length));
      if (Number.isFinite(parsed)) {
        options.listRetryBackoffFactor = Math.max(1, Math.min(5, parsed));
      }
      continue;
    }
    if (token.startsWith("--list-retry-jitter-ms=")) {
      const parsed = toInt(token.slice("--list-retry-jitter-ms=".length), options.listRetryJitterMs);
      options.listRetryJitterMs = Math.max(0, Math.min(5_000, parsed));
      continue;
    }
    if (token.startsWith("--list-request-timeout-ms=")) {
      const parsed = toInt(token.slice("--list-request-timeout-ms=".length), options.listRequestTimeoutMs);
      options.listRequestTimeoutMs = Math.max(1_000, Math.min(120_000, parsed));
      continue;
    }
    if (token.startsWith("--output-file=")) {
      options.outputFile = toText(token.slice("--output-file=".length));
      continue;
    }
    if (token.startsWith("--output-compact=")) {
      options.outputCompact = toBool(token.slice("--output-compact=".length), options.outputCompact);
      continue;
    }
    if (token.startsWith("--output-timestamp=")) {
      options.outputTimestamp = toBool(token.slice("--output-timestamp=".length), options.outputTimestamp);
      continue;
    }
    if (token.startsWith("--output-overwrite=")) {
      options.outputOverwrite = toBool(token.slice("--output-overwrite=".length), options.outputOverwrite);
      continue;
    }
    if (token.startsWith("--redact-signatures=")) {
      options.redactSignatures = toBool(token.slice("--redact-signatures=".length), options.redactSignatures);
      continue;
    }
    if (token.startsWith("--min-age-minutes=")) {
      const parsed = toInt(token.slice("--min-age-minutes=".length), options.minAgeMinutes);
      options.minAgeMinutes = Math.max(0, Math.min(525600, parsed));
      continue;
    }
    if (token.startsWith("--limit=")) {
      const parsed = toInt(token.slice("--limit=".length), options.limit);
      options.limit = Math.max(1, Math.min(100, parsed));
      continue;
    }
    if (token.startsWith("--scan-all=")) {
      options.scanAll = toBool(token.slice("--scan-all=".length), options.scanAll);
      continue;
    }
    if (token.startsWith("--scan-max-pages=")) {
      const parsed = toInt(token.slice("--scan-max-pages=".length), options.scanMaxPages);
      options.scanMaxPages = Math.max(0, Math.min(100000, parsed));
      continue;
    }
    if (token.startsWith("--scan-hard-max-pages=")) {
      const parsed = toInt(token.slice("--scan-hard-max-pages=".length), options.scanHardMaxPages);
      options.scanHardMaxPages = Math.max(1, Math.min(100000, parsed));
      continue;
    }
    if (token.startsWith("--scan-auto-continue=")) {
      options.scanAutoContinue = toBool(token.slice("--scan-auto-continue=".length), options.scanAutoContinue);
      continue;
    }
    if (token.startsWith("--scan-auto-continue-max-segments=")) {
      const parsed = toInt(token.slice("--scan-auto-continue-max-segments=".length), options.scanAutoContinueMaxSegments);
      options.scanAutoContinueMaxSegments = Math.max(1, Math.min(1000, parsed));
      continue;
    }
    if (token.startsWith("--scan-checkpoint-file=")) {
      options.scanCheckpointFile = toText(token.slice("--scan-checkpoint-file=".length));
      continue;
    }
    if (token.startsWith("--scan-checkpoint-every-pages=")) {
      const parsed = toInt(token.slice("--scan-checkpoint-every-pages=".length), options.scanCheckpointEveryPages);
      options.scanCheckpointEveryPages = Math.max(1, Math.min(1000, parsed));
      continue;
    }
    if (token.startsWith("--scan-start-cursor-created-at=")) {
      options.scanStartCursorCreatedAt = toText(token.slice("--scan-start-cursor-created-at=".length));
      continue;
    }
    if (token.startsWith("--scan-start-cursor-id=")) {
      options.scanStartCursorId = toText(token.slice("--scan-start-cursor-id=".length)).toLowerCase();
      continue;
    }
    if (token.startsWith("--scan-resume-file=")) {
      options.scanResumeFile = toText(token.slice("--scan-resume-file=".length));
      continue;
    }
    if (token.startsWith("--scan-resume-from-checkpoint=")) {
      options.scanResumeFromCheckpoint = toBool(
        token.slice("--scan-resume-from-checkpoint=".length),
        options.scanResumeFromCheckpoint
      );
      continue;
    }
    if (token.startsWith("--scan-resume-validate-api-base=")) {
      options.scanResumeValidateApiBase = toBool(
        token.slice("--scan-resume-validate-api-base=".length),
        options.scanResumeValidateApiBase
      );
      continue;
    }
    if (token.startsWith("--scan-resume-require-api-base=")) {
      options.scanResumeRequireApiBase = toBool(
        token.slice("--scan-resume-require-api-base=".length),
        options.scanResumeRequireApiBase
      );
      continue;
    }
    if (token.startsWith("--scan-resume-validate-kind=")) {
      options.scanResumeValidateKind = toBool(
        token.slice("--scan-resume-validate-kind=".length),
        options.scanResumeValidateKind
      );
      continue;
    }
    if (token.startsWith("--scan-resume-validate-schema-version=")) {
      options.scanResumeValidateSchemaVersion = toBool(
        token.slice("--scan-resume-validate-schema-version=".length),
        options.scanResumeValidateSchemaVersion
      );
      continue;
    }
    if (token.startsWith("--scan-resume-generated-at-source=")) {
      options.scanResumeGeneratedAtSource = normalizeResumeGeneratedAtSource(
        token.slice("--scan-resume-generated-at-source=".length)
      );
      continue;
    }
    if (token.startsWith("--scan-resume-sha256=")) {
      options.scanResumeSha256 = normalizeSha256(token.slice("--scan-resume-sha256=".length));
      continue;
    }
    if (token.startsWith("--scan-resume-validate-filters=")) {
      options.scanResumeValidateFilters = toBool(
        token.slice("--scan-resume-validate-filters=".length),
        options.scanResumeValidateFilters
      );
      continue;
    }
    if (token.startsWith("--scan-resume-api-base-mismatch-behavior=")) {
      const behavior = toText(token.slice("--scan-resume-api-base-mismatch-behavior=".length)).toLowerCase();
      options.scanResumeApiBaseMismatchBehavior = behavior === "restart" ? "restart" : "error";
      continue;
    }
    if (token.startsWith("--scan-resume-api-base-missing-behavior=")) {
      const behavior = toText(token.slice("--scan-resume-api-base-missing-behavior=".length)).toLowerCase();
      options.scanResumeApiBaseMissingBehavior = behavior === "error" ? "error" : "restart";
      continue;
    }
    if (token.startsWith("--scan-resume-kind-mismatch-behavior=")) {
      const behavior = toText(token.slice("--scan-resume-kind-mismatch-behavior=".length)).toLowerCase();
      options.scanResumeKindMismatchBehavior = behavior === "restart" ? "restart" : "error";
      continue;
    }
    if (token.startsWith("--scan-resume-schema-version-mismatch-behavior=")) {
      const behavior = toText(token.slice("--scan-resume-schema-version-mismatch-behavior=".length)).toLowerCase();
      options.scanResumeSchemaVersionMismatchBehavior = behavior === "error" ? "error" : "restart";
      continue;
    }
    if (token.startsWith("--scan-resume-filter-mismatch-behavior=")) {
      const behavior = toText(token.slice("--scan-resume-filter-mismatch-behavior=".length)).toLowerCase();
      options.scanResumeFilterMismatchBehavior = behavior === "error" ? "error" : "restart";
      continue;
    }
    if (token.startsWith("--scan-resume-max-age-minutes=")) {
      const parsed = toInt(token.slice("--scan-resume-max-age-minutes=".length), options.scanResumeMaxAgeMinutes);
      options.scanResumeMaxAgeMinutes = Math.max(0, Math.min(525600, parsed));
      continue;
    }
    if (token.startsWith("--scan-resume-max-bytes=")) {
      const parsed = toInt(token.slice("--scan-resume-max-bytes=".length), options.scanResumeMaxBytes);
      options.scanResumeMaxBytes = Math.max(0, Math.min(50_000_000, parsed));
      continue;
    }
    if (token.startsWith("--scan-resume-max-future-minutes=")) {
      const parsed = toInt(token.slice("--scan-resume-max-future-minutes=".length), options.scanResumeMaxFutureMinutes);
      options.scanResumeMaxFutureMinutes = Math.max(0, Math.min(525600, parsed));
      continue;
    }
    if (token.startsWith("--scan-resume-stale-behavior=")) {
      const behavior = toText(token.slice("--scan-resume-stale-behavior=".length)).toLowerCase();
      options.scanResumeStaleBehavior = behavior === "error" ? "error" : "restart";
      continue;
    }
    if (token.startsWith("--scan-resume-future-behavior=")) {
      const behavior = toText(token.slice("--scan-resume-future-behavior=".length)).toLowerCase();
      options.scanResumeFutureBehavior = behavior === "error" ? "error" : "restart";
      continue;
    }
    if (token.startsWith("--scan-resume-size-behavior=")) {
      const behavior = toText(token.slice("--scan-resume-size-behavior=".length)).toLowerCase();
      options.scanResumeSizeBehavior = behavior === "error" ? "error" : "restart";
      continue;
    }
    if (token.startsWith("--scan-resume-hash-behavior=")) {
      const behavior = toText(token.slice("--scan-resume-hash-behavior=".length)).toLowerCase();
      options.scanResumeHashBehavior = behavior === "error" ? "error" : "restart";
      continue;
    }
    if (token.startsWith("--scan-resume-allow-exhausted=")) {
      options.scanResumeAllowExhausted = toBool(
        token.slice("--scan-resume-allow-exhausted=".length),
        options.scanResumeAllowExhausted
      );
      continue;
    }
    if (token.startsWith("--scan-resume-exhausted-behavior=")) {
      const behavior = toText(token.slice("--scan-resume-exhausted-behavior=".length)).toLowerCase();
      options.scanResumeExhaustedBehavior = behavior === "restart" ? "restart" : "noop";
      continue;
    }
    if (token.startsWith("--job-type=")) {
      options.jobType = toText(token.slice("--job-type=".length)).toLowerCase();
      continue;
    }
    if (token.startsWith("--name-contains=")) {
      options.nameContains = toText(token.slice("--name-contains=".length)).toLowerCase();
      continue;
    }
    if (token.startsWith("--interval-lte=")) {
      const parsed = toInt(token.slice("--interval-lte=".length), 0);
      options.intervalLte = Math.max(0, Math.min(10080, parsed));
      continue;
    }
    if (token.startsWith("--duplicates-only=")) {
      options.duplicatesOnly = toBool(token.slice("--duplicates-only=".length), false);
      continue;
    }
    if (token.startsWith("--dedupe-keep=")) {
      const mode = toText(token.slice("--dedupe-keep=".length)).toLowerCase();
      if (mode === "oldest" || mode === "newest") {
        options.dedupeKeep = mode;
      }
      continue;
    }
    if (token.startsWith("--signature-mode=")) {
      const mode = toText(token.slice("--signature-mode=".length)).toLowerCase();
      if (mode === "strict" || mode === "target") {
        options.signatureMode = mode;
      }
      continue;
    }
    if (token.startsWith("--api-base-url=")) {
      options.apiBaseUrl = toText(token.slice("--api-base-url=".length)) || options.apiBaseUrl;
      continue;
    }
    if (token.startsWith("--token=")) {
      options.bearerToken = toText(token.slice("--token=".length));
      continue;
    }
    if (token.startsWith("--email=")) {
      options.authEmail = toText(token.slice("--email=".length)).toLowerCase();
      continue;
    }
    if (token.startsWith("--password=")) {
      options.authPassword = toText(token.slice("--password=".length));
      continue;
    }
    if (token.startsWith("--device-id=")) {
      options.authDeviceId = toText(token.slice("--device-id=".length)) || options.authDeviceId;
      continue;
    }
    if (token.startsWith("--device-name=")) {
      options.authDeviceName = toText(token.slice("--device-name=".length)) || options.authDeviceName;
      continue;
    }
    if (token.startsWith("--register-if-missing=")) {
      options.registerIfMissing = toBool(token.slice("--register-if-missing=".length), options.registerIfMissing);
    }
  }

  return options;
}

async function requestJson({ baseUrl, path, token, method = "GET", body = null, timeoutMs = 0 }) {
  const url = `${toText(baseUrl).replace(/\/+$/, "")}${path}`;
  const headers = {};
  if (toText(token)) {
    headers.authorization = `Bearer ${token}`;
  }
  if (body) {
    headers["content-type"] = "application/json";
  }

  const controller = timeoutMs > 0 ? new AbortController() : null;
  let timeoutHandle = null;
  if (controller) {
    timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller ? controller.signal : undefined
    });
  } catch (error) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    throw error;
  }
  if (timeoutHandle) clearTimeout(timeoutHandle);
  const raw = await response.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch (_error) {
    parsed = raw;
  }

  return {
    ok: response.ok,
    status: response.status,
    body: parsed
  };
}

function normalizeList(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: toText(item.id),
      name: toText(item.name),
      isActive: Boolean(item.isActive),
      scheduleKind: toText(item.scheduleKind),
      intervalMinutes: item.intervalMinutes === null || item.intervalMinutes === undefined ? null : Number(item.intervalMinutes),
      cronExpr: item.cronExpr === null || item.cronExpr === undefined ? null : toText(item.cronExpr),
      timezone: toText(item.timezone || "UTC") || "UTC",
      targetJobType: toText(item.targetJobType).toLowerCase(),
      targetPayload:
        item.targetPayload && typeof item.targetPayload === "object" && !Array.isArray(item.targetPayload)
          ? item.targetPayload
          : {},
      maxAttempts: item.maxAttempts === null || item.maxAttempts === undefined ? null : Number(item.maxAttempts),
      nextRunAt: toText(item.nextRunAt),
      createdAt: toText(item.createdAt),
      updatedAt: toText(item.updatedAt)
    }));
}

function applyFilters(items, { jobType = "", nameContains = "", intervalLte = 0, minAgeMinutes = 0 }) {
  const targetJobType = toText(jobType).toLowerCase();
  const nameFilter = toText(nameContains).toLowerCase();
  const intervalLimit = Number(intervalLte || 0);
  const minAge = Number(minAgeMinutes || 0);
  const nowMs = Date.now();
  return items.filter((item) => {
    if (targetJobType && item.targetJobType !== targetJobType) return false;
    if (nameFilter && !item.name.toLowerCase().includes(nameFilter)) return false;
    if (intervalLimit > 0) {
      if (item.scheduleKind !== "interval") return false;
      const interval = Number(item.intervalMinutes || 0);
      if (!Number.isFinite(interval) || interval <= 0 || interval > intervalLimit) return false;
    }
    if (minAge > 0) {
      const createdMs = Date.parse(toText(item.createdAt) || toText(item.updatedAt));
      if (!Number.isFinite(createdMs)) return false;
      const ageMinutes = Math.floor((nowMs - createdMs) / 60000);
      if (!Number.isFinite(ageMinutes) || ageMinutes < minAge) return false;
    }
    return true;
  });
}

function stableSerialize(value) {
  if (value === null || value === undefined) {
    return "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`);
    return `{${pairs.join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeTargetUrl(value) {
  const raw = toText(value);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    const protocol = toText(parsed.protocol).toLowerCase();
    const host = toText(parsed.hostname).toLowerCase();
    const port = toText(parsed.port);
    const pathname = toText(parsed.pathname) || "/";
    const search = toText(parsed.search);
    const portSegment = port ? `:${port}` : "";
    return `${protocol}//${host}${portSegment}${pathname}${search}`;
  } catch (_error) {
    return raw.toLowerCase();
  }
}

function extractTargetSignatures(payload) {
  if (!payload || typeof payload !== "object") return [];
  const urls = [];
  const single = normalizeTargetUrl(payload.targetUrl);
  if (single) {
    urls.push(single);
  }
  if (Array.isArray(payload.targetUrls)) {
    for (const candidate of payload.targetUrls) {
      const normalized = normalizeTargetUrl(candidate);
      if (normalized) {
        urls.push(normalized);
      }
    }
  }
  return [...new Set(urls)].sort();
}

function buildPayloadSignature(schedule, { mode = "strict" } = {}) {
  const payload = schedule && schedule.targetPayload && typeof schedule.targetPayload === "object" ? schedule.targetPayload : {};
  if (mode !== "target") {
    return stableSerialize(payload);
  }

  const targets = extractTargetSignatures(payload);
  if (!targets.length) {
    return stableSerialize(payload);
  }

  const compactPayload = {
    targets
  };
  const maxUrls = Number(payload.maxUrls);
  if (Number.isFinite(maxUrls) && maxUrls > 0) {
    compactPayload.maxUrls = Math.floor(maxUrls);
  }
  return stableSerialize(compactPayload);
}

function buildScheduleSignature(schedule, { mode = "strict" } = {}) {
  const jobType = toText(schedule.targetJobType).toLowerCase();
  const kind = toText(schedule.scheduleKind).toLowerCase();
  const attempts = Number(schedule.maxAttempts || 0);
  const cadence =
    kind === "interval"
      ? `interval:${Number(schedule.intervalMinutes || 0)}`
      : `cron:${toText(schedule.cronExpr)}|tz:${toText(schedule.timezone || "UTC") || "UTC"}`;
  const payload = buildPayloadSignature(schedule, { mode });
  return `${jobType}|${kind}|${cadence}|attempts:${attempts}|signatureMode:${mode}|payload:${payload}`;
}

function compareByCreatedAtAsc(left, right) {
  const leftMs = Date.parse(toText(left.createdAt));
  const rightMs = Date.parse(toText(right.createdAt));
  const hasLeft = Number.isFinite(leftMs);
  const hasRight = Number.isFinite(rightMs);
  if (hasLeft && hasRight && leftMs !== rightMs) {
    return leftMs - rightMs;
  }
  if (hasLeft && !hasRight) return -1;
  if (!hasLeft && hasRight) return 1;
  return toText(left.id).localeCompare(toText(right.id));
}

function buildDuplicatePlan(items, { keep = "oldest", signatureMode = "strict" } = {}) {
  const signatureMap = new Map();
  const groups = new Map();
  for (const item of items) {
    const signature = buildScheduleSignature(item, { mode: signatureMode });
    signatureMap.set(item.id, signature);
    const existing = groups.get(signature);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(signature, [item]);
    }
  }

  const duplicateItems = [];
  const pauseCandidates = [];
  const duplicateGroups = [];
  for (const [signature, groupItems] of groups.entries()) {
    if (!Array.isArray(groupItems) || groupItems.length < 2) continue;

    const sorted = [...groupItems].sort(compareByCreatedAtAsc);
    const keepItem = keep === "newest" ? sorted[sorted.length - 1] : sorted[0];
    const keepId = keepItem.id;
    const groupPause = sorted.filter((item) => item.id !== keepId);

    duplicateItems.push(...sorted);
    pauseCandidates.push(...groupPause);
    duplicateGroups.push({
      signature,
      total: sorted.length,
      keepScheduleId: keepId,
      keepScheduleName: keepItem.name,
      scheduleIds: sorted.map((item) => item.id)
    });
  }

  return {
    signatureMap,
    duplicateItems,
    pauseCandidates,
    duplicateGroups
  };
}

function hashSignature(value) {
  return createHash("sha256").update(toText(value)).digest("hex");
}

function maybeRedactSignature(value, options) {
  const raw = toText(value);
  if (!raw) return null;
  if (!options?.redactSignatures) return raw;
  return `sha256:${hashSignature(raw).slice(0, 24)}`;
}

function mapDuplicateGroupsForSummary(groups, options) {
  return (Array.isArray(groups) ? groups : []).map((group) => ({
    ...group,
    signature: maybeRedactSignature(group?.signature, options)
  }));
}

function requireToken(token) {
  const value = toText(token);
  if (!value) {
    throw new Error(
      "Missing bearer token. Set CONTROL_API_BEARER_TOKEN/--token, or provide --email/--password for auto-login."
    );
  }
  return value;
}

async function registerIfRequested(options) {
  if (!options.registerIfMissing) return;
  const response = await requestJson({
    baseUrl: options.apiBaseUrl,
    path: "/api/auth/register",
    method: "POST",
    token: "",
    body: {
      email: options.authEmail,
      password: options.authPassword,
      displayName: "Queue Hygiene Operator"
    }
  });
  if (response.status !== 201 && response.status !== 409) {
    throw new Error(`Auto-register failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
}

async function loginForToken(options) {
  const email = toText(options.authEmail).toLowerCase();
  const password = toText(options.authPassword);
  if (!email || !password) {
    return {
      token: "",
      authMode: "missing"
    };
  }

  await registerIfRequested(options);

  const response = await requestJson({
    baseUrl: options.apiBaseUrl,
    path: "/api/auth/login",
    method: "POST",
    token: "",
    body: {
      email,
      password,
      deviceId: options.authDeviceId,
      deviceName: options.authDeviceName
    }
  });
  if (!response.ok) {
    throw new Error(`Auto-login failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  const accessToken = toText(response.body?.accessToken);
  if (!accessToken) {
    throw new Error("Auto-login succeeded but response did not include accessToken");
  }
  return {
    token: accessToken,
    authMode: "auto_login"
  };
}

async function resolveToken(options) {
  const explicit = toText(options.bearerToken);
  if (explicit) {
    return {
      token: explicit,
      authMode: "token"
    };
  }
  return loginForToken(options);
}

async function resolveScanStartCursor(options) {
  const scanResumeValidateApiBase = Boolean(options.scanResumeValidateApiBase);
  const scanResumeRequireApiBase = Boolean(options.scanResumeRequireApiBase);
  const scanResumeApiBaseMismatchBehavior =
    toText(options.scanResumeApiBaseMismatchBehavior).toLowerCase() === "restart" ? "restart" : "error";
  const scanResumeApiBaseMissingBehavior =
    toText(options.scanResumeApiBaseMissingBehavior).toLowerCase() === "error" ? "error" : "restart";
  const scanResumeValidateKind = Boolean(options.scanResumeValidateKind);
  const scanResumeKindMismatchBehavior =
    toText(options.scanResumeKindMismatchBehavior).toLowerCase() === "restart" ? "restart" : "error";
  const scanResumeValidateSchemaVersion = Boolean(options.scanResumeValidateSchemaVersion);
  const scanResumeSchemaVersionMismatchBehavior =
    toText(options.scanResumeSchemaVersionMismatchBehavior).toLowerCase() === "error" ? "error" : "restart";
  const scanResumeGeneratedAtSourcePolicy = normalizeResumeGeneratedAtSource(options.scanResumeGeneratedAtSource);
  const scanResumeValidateFilters = Boolean(options.scanResumeValidateFilters);
  const scanResumeFilterMismatchBehavior =
    toText(options.scanResumeFilterMismatchBehavior).toLowerCase() === "error" ? "error" : "restart";
  const scanResumeMaxFutureMinutes = Math.max(0, Math.min(525600, Number(options.scanResumeMaxFutureMinutes || 0)));
  const scanResumeFutureBehavior =
    toText(options.scanResumeFutureBehavior).toLowerCase() === "error" ? "error" : "restart";
  const scanResumeMaxBytes = Math.max(0, Math.min(50_000_000, Number(options.scanResumeMaxBytes || 0)));
  const scanResumeSizeBehavior =
    toText(options.scanResumeSizeBehavior).toLowerCase() === "error" ? "error" : "restart";
  const scanResumeHashBehavior =
    toText(options.scanResumeHashBehavior).toLowerCase() === "error" ? "error" : "restart";
  const scanResumeSha256Expected = normalizeSha256(options.scanResumeSha256 || options.scanResumeHashExpected);
  const resumeSizeLimitBytes = scanResumeMaxBytes > 0 ? scanResumeMaxBytes : null;
  let resumeSizeBytes = null;
  let resumeSha256Actual = "";
  const attachResumeSizeTelemetry = (payload, oversized = false) => ({
    ...payload,
    resumeApiBaseRequired: scanResumeRequireApiBase,
    resumeApiBaseMissing: Boolean(payload.resumeApiBaseMissing),
    resumeApiBaseMissingBehavior: scanResumeApiBaseMissingBehavior,
    resumeOversized: Boolean(oversized),
    resumeSizeBytes: Number.isFinite(Number(resumeSizeBytes)) ? Number(resumeSizeBytes) : null,
    resumeSizeLimitBytes,
    resumeSizeBehavior: scanResumeSizeBehavior,
    resumeHashExpected: scanResumeSha256Expected || null,
    resumeHashActual: normalizeSha256(resumeSha256Actual) || null,
    resumeHashMismatch: Boolean(
      scanResumeSha256Expected &&
        normalizeSha256(resumeSha256Actual) &&
        normalizeSha256(resumeSha256Actual) !== scanResumeSha256Expected
    ),
    resumeHashBehavior: scanResumeHashBehavior
  });
  const explicitCursor = normalizeCursorPair(
    options.scanStartCursorCreatedAt,
    options.scanStartCursorId,
    "scan start cursor"
  );
  if (explicitCursor) {
    return attachResumeSizeTelemetry({
      startCursor: explicitCursor,
      source: "explicit",
      resumeFile: null,
      exhausted: false,
      stale: false,
      resumeAgeMinutes: null,
      resumeGeneratedAt: null,
      resumeStaleReason: null,
      resumeApiBaseUrl: null,
      resumeApiBaseValidated: scanResumeValidateApiBase,
      resumeApiBaseMismatch: false,
      resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
      resumeKind: null,
      resumeKindValidated: scanResumeValidateKind,
      resumeKindMismatch: false,
      resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
      resumeSchemaVersionExpected: SCAN_RESUME_SCHEMA_VERSION,
      resumeSchemaVersion: null,
      resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
      resumeSchemaVersionMismatch: false,
      resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
      resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
      resumeGeneratedAtSource: "none",
      resumeFuture: false,
      resumeFutureMinutes: null,
      resumeFutureBehavior: scanResumeFutureBehavior,
      resumeFilterValidated: scanResumeValidateFilters,
      resumeFilterMismatch: false,
      resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
      resumeFilterMismatchFields: []
    });
  }

  const explicitResumeFile = toText(options.scanResumeFile);
  const checkpointResumeFile = toText(options.scanCheckpointResolvedFile || options.scanCheckpointFile);
  const useCheckpointResume = !explicitResumeFile && options.scanResumeFromCheckpoint && Boolean(checkpointResumeFile);
  const resumeFile = explicitResumeFile || (useCheckpointResume ? checkpointResumeFile : "");
  if (!resumeFile) {
    return attachResumeSizeTelemetry({
      startCursor: null,
      source: "none",
      resumeFile: null,
      exhausted: false,
      stale: false,
      resumeAgeMinutes: null,
      resumeGeneratedAt: null,
      resumeStaleReason: null,
      resumeApiBaseUrl: null,
      resumeApiBaseValidated: scanResumeValidateApiBase,
      resumeApiBaseMismatch: false,
      resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
      resumeKind: null,
      resumeKindValidated: scanResumeValidateKind,
      resumeKindMismatch: false,
      resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
      resumeSchemaVersionExpected: SCAN_RESUME_SCHEMA_VERSION,
      resumeSchemaVersion: null,
      resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
      resumeSchemaVersionMismatch: false,
      resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
      resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
      resumeGeneratedAtSource: "none",
      resumeFuture: false,
      resumeFutureMinutes: null,
      resumeFutureBehavior: scanResumeFutureBehavior,
      resumeFilterValidated: scanResumeValidateFilters,
      resumeFilterMismatch: false,
      resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
      resumeFilterMismatchFields: []
    });
  }

  const resolvedResumePath = useCheckpointResume ? resumeFile : resolve(process.cwd(), resumeFile);
  const baseSource = useCheckpointResume ? "checkpoint_file_auto" : "resume_file";
  try {
    const resumeStats = await stat(resolvedResumePath);
    if (resumeStats && Number.isFinite(Number(resumeStats.size))) {
      resumeSizeBytes = Math.max(0, Math.floor(Number(resumeStats.size)));
    }
  } catch (error) {
    if (useCheckpointResume && error && error.code === "ENOENT") {
      return attachResumeSizeTelemetry({
        startCursor: null,
        source: "checkpoint_file_missing",
        resumeFile: resolvedResumePath,
        exhausted: false,
        stale: false,
        resumeAgeMinutes: null,
        resumeGeneratedAt: null,
        resumeStaleReason: null,
        resumeApiBaseUrl: null,
        resumeApiBaseValidated: scanResumeValidateApiBase,
        resumeApiBaseMismatch: false,
        resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
        resumeKind: null,
        resumeKindValidated: scanResumeValidateKind,
        resumeKindMismatch: false,
        resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
        resumeSchemaVersionExpected: SCAN_RESUME_SCHEMA_VERSION,
        resumeSchemaVersion: null,
        resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
        resumeSchemaVersionMismatch: false,
        resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
        resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
        resumeGeneratedAtSource: "none",
        resumeFuture: false,
        resumeFutureMinutes: null,
        resumeFutureBehavior: scanResumeFutureBehavior,
        resumeFilterValidated: scanResumeValidateFilters,
        resumeFilterMismatch: false,
        resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
        resumeFilterMismatchFields: []
      });
    }
    throw new Error(`Failed to stat scan resume file (${resolvedResumePath}): ${error.message}`);
  }
  if (scanResumeMaxBytes > 0 && Number(resumeSizeBytes) > scanResumeMaxBytes) {
    if (scanResumeSizeBehavior === "error") {
      throw new Error(
        `Scan resume file (${resolvedResumePath}) is oversized: ${resumeSizeBytes} bytes exceeds max ${scanResumeMaxBytes} bytes.`
      );
    }
    return attachResumeSizeTelemetry(
      {
        startCursor: null,
        source: `${baseSource}_oversized`,
        resumeFile: resolvedResumePath,
        exhausted: false,
        stale: false,
        resumeAgeMinutes: null,
        resumeGeneratedAt: null,
        resumeStaleReason: null,
        resumeApiBaseUrl: null,
        resumeApiBaseValidated: scanResumeValidateApiBase,
        resumeApiBaseMismatch: false,
        resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
        resumeKind: null,
        resumeKindValidated: scanResumeValidateKind,
        resumeKindMismatch: false,
        resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
        resumeSchemaVersionExpected: SCAN_RESUME_SCHEMA_VERSION,
        resumeSchemaVersion: null,
        resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
        resumeSchemaVersionMismatch: false,
        resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
        resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
        resumeGeneratedAtSource: "none",
        resumeFuture: false,
        resumeFutureMinutes: null,
        resumeFutureBehavior: scanResumeFutureBehavior,
        resumeFilterValidated: scanResumeValidateFilters,
        resumeFilterMismatch: false,
        resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
        resumeFilterMismatchFields: []
      },
      true
    );
  }
  let parsed = null;
  let raw = "";
  try {
    raw = await readFile(resolvedResumePath, "utf8");
  } catch (error) {
    if (useCheckpointResume && error && error.code === "ENOENT") {
      return attachResumeSizeTelemetry({
        startCursor: null,
        source: "checkpoint_file_missing",
        resumeFile: resolvedResumePath,
        exhausted: false,
        stale: false,
        resumeAgeMinutes: null,
        resumeGeneratedAt: null,
        resumeStaleReason: null,
        resumeApiBaseUrl: null,
        resumeApiBaseValidated: scanResumeValidateApiBase,
        resumeApiBaseMismatch: false,
        resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
        resumeKind: null,
        resumeKindValidated: scanResumeValidateKind,
        resumeKindMismatch: false,
        resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
        resumeSchemaVersionExpected: SCAN_RESUME_SCHEMA_VERSION,
        resumeSchemaVersion: null,
        resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
        resumeSchemaVersionMismatch: false,
        resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
        resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
        resumeGeneratedAtSource: "none",
        resumeFuture: false,
        resumeFutureMinutes: null,
        resumeFutureBehavior: scanResumeFutureBehavior,
        resumeFilterValidated: scanResumeValidateFilters,
        resumeFilterMismatch: false,
        resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
        resumeFilterMismatchFields: []
      });
    }
    throw new Error(`Failed to read scan resume file (${resolvedResumePath}): ${error.message}`);
  }
  resumeSha256Actual = createHash("sha256").update(raw, "utf8").digest("hex");
  const resumeHashMismatch = Boolean(scanResumeSha256Expected && resumeSha256Actual !== scanResumeSha256Expected);
  if (resumeHashMismatch) {
    if (scanResumeHashBehavior === "error") {
      throw new Error(
        `Scan resume file (${resolvedResumePath}) hash mismatch: resume=${resumeSha256Actual}, expected=${scanResumeSha256Expected}.`
      );
    }
    return attachResumeSizeTelemetry({
      startCursor: null,
      source: `${baseSource}_hash_mismatch`,
      resumeFile: resolvedResumePath,
      exhausted: false,
      stale: false,
      resumeAgeMinutes: null,
      resumeGeneratedAt: null,
      resumeStaleReason: null,
      resumeApiBaseUrl: null,
      resumeApiBaseValidated: scanResumeValidateApiBase,
      resumeApiBaseMismatch: false,
      resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
      resumeKind: null,
      resumeKindValidated: scanResumeValidateKind,
      resumeKindMismatch: false,
      resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
      resumeSchemaVersionExpected: SCAN_RESUME_SCHEMA_VERSION,
      resumeSchemaVersion: null,
      resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
      resumeSchemaVersionMismatch: false,
      resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
      resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
      resumeGeneratedAtSource: "none",
      resumeFuture: false,
      resumeFutureMinutes: null,
      resumeFutureBehavior: scanResumeFutureBehavior,
      resumeFilterValidated: scanResumeValidateFilters,
      resumeFilterMismatch: false,
      resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
      resumeFilterMismatchFields: []
    });
  }
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch (error) {
    throw new Error(`Failed to parse scan resume file (${resolvedResumePath}): ${error.message}`);
  }

  const cursor = normalizeCursorPair(
    parsed?.paging?.nextCursor?.createdAt,
    parsed?.paging?.nextCursor?.id,
    "scan resume file paging.nextCursor"
  );
  const parsedSchemaVersionRaw = Number(parsed?.schemaVersion);
  const resumeSchemaVersion = Number.isFinite(parsedSchemaVersionRaw) ? Math.floor(parsedSchemaVersionRaw) : null;
  const expectedResumeSchemaVersion = SCAN_RESUME_SCHEMA_VERSION;
  const resumeSchemaVersionMismatch = Boolean(
    scanResumeValidateSchemaVersion && resumeSchemaVersion !== expectedResumeSchemaVersion
  );
  if (resumeSchemaVersionMismatch) {
    if (scanResumeSchemaVersionMismatchBehavior === "error") {
      throw new Error(
        `Scan resume file (${resolvedResumePath}) schemaVersion mismatch: resume=${
          Number.isFinite(parsedSchemaVersionRaw) ? Math.floor(parsedSchemaVersionRaw) : "<missing>"
        }, expected=${expectedResumeSchemaVersion}.`
      );
    }
    return attachResumeSizeTelemetry({
      startCursor: null,
      source: `${baseSource}_schema_version_mismatch`,
      resumeFile: resolvedResumePath,
      exhausted: false,
      stale: false,
      resumeAgeMinutes: null,
      resumeGeneratedAt: null,
      resumeStaleReason: null,
      resumeApiBaseUrl: null,
      resumeApiBaseValidated: scanResumeValidateApiBase,
      resumeApiBaseMismatch: false,
      resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
      resumeKind: null,
      resumeKindValidated: scanResumeValidateKind,
      resumeKindMismatch: false,
      resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
      resumeSchemaVersionExpected: expectedResumeSchemaVersion,
      resumeSchemaVersion,
      resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
      resumeSchemaVersionMismatch: true,
      resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
      resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
      resumeGeneratedAtSource: "none",
      resumeFuture: false,
      resumeFutureMinutes: null,
      resumeFutureBehavior: scanResumeFutureBehavior,
      resumeFilterValidated: scanResumeValidateFilters,
      resumeFilterMismatch: false,
      resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
      resumeFilterMismatchFields: []
    });
  }
  const resumeKindRaw = toText(parsed?.kind);
  const resumeKindNormalized = normalizeResumeArtifactKind(resumeKindRaw);
  const expectedResumeKind = normalizeResumeArtifactKind(EXPECTED_SCAN_RESUME_KIND);
  const resumeKindMismatch = Boolean(scanResumeValidateKind && resumeKindNormalized !== expectedResumeKind);
  if (resumeKindMismatch) {
    if (scanResumeKindMismatchBehavior === "error") {
      throw new Error(
        `Scan resume file (${resolvedResumePath}) kind mismatch: resume=${resumeKindRaw || "<missing>"}, expected=${expectedResumeKind}.`
      );
    }
    return attachResumeSizeTelemetry({
      startCursor: null,
      source: `${baseSource}_kind_mismatch`,
      resumeFile: resolvedResumePath,
      exhausted: false,
      stale: false,
      resumeAgeMinutes: null,
      resumeGeneratedAt: null,
      resumeStaleReason: null,
      resumeApiBaseUrl: null,
      resumeApiBaseValidated: scanResumeValidateApiBase,
      resumeApiBaseMismatch: false,
      resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
      resumeKind: resumeKindRaw || null,
      resumeKindValidated: scanResumeValidateKind,
      resumeKindMismatch: true,
      resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
      resumeSchemaVersionExpected: expectedResumeSchemaVersion,
      resumeSchemaVersion,
      resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
      resumeSchemaVersionMismatch: false,
      resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
      resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
      resumeGeneratedAtSource: "none",
      resumeFuture: false,
      resumeFutureMinutes: null,
      resumeFutureBehavior: scanResumeFutureBehavior,
      resumeFilterValidated: scanResumeValidateFilters,
      resumeFilterMismatch: false,
      resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
      resumeFilterMismatchFields: []
    });
  }
  const resumeApiBaseUrl = toText(parsed?.apiBaseUrl);
  const resumeApiBaseMissing = Boolean(scanResumeValidateApiBase && scanResumeRequireApiBase && !resumeApiBaseUrl);
  if (resumeApiBaseMissing) {
    if (scanResumeApiBaseMissingBehavior === "error") {
      throw new Error(`Scan resume file (${resolvedResumePath}) apiBaseUrl is missing while required.`);
    }
    return attachResumeSizeTelemetry({
      startCursor: null,
      source: `${baseSource}_api_base_missing`,
      resumeFile: resolvedResumePath,
      exhausted: false,
      stale: false,
      resumeAgeMinutes: null,
      resumeGeneratedAt: null,
      resumeStaleReason: null,
      resumeApiBaseUrl: null,
      resumeApiBaseValidated: scanResumeValidateApiBase,
      resumeApiBaseMismatch: false,
      resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
      resumeApiBaseMissing: true,
      resumeKind: resumeKindRaw || null,
      resumeKindValidated: scanResumeValidateKind,
      resumeKindMismatch: false,
      resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
      resumeSchemaVersionExpected: expectedResumeSchemaVersion,
      resumeSchemaVersion,
      resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
      resumeSchemaVersionMismatch: false,
      resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
      resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
      resumeGeneratedAtSource: "none",
      resumeFuture: false,
      resumeFutureMinutes: null,
      resumeFutureBehavior: scanResumeFutureBehavior,
      resumeFilterValidated: scanResumeValidateFilters,
      resumeFilterMismatch: false,
      resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
      resumeFilterMismatchFields: []
    });
  }
  const currentApiBaseNormalized = normalizeBaseUrl(options.apiBaseUrl);
  const resumeApiBaseNormalized = normalizeBaseUrl(resumeApiBaseUrl);
  const resumeApiBaseMismatch = Boolean(
    scanResumeValidateApiBase &&
      resumeApiBaseUrl &&
      currentApiBaseNormalized &&
      resumeApiBaseNormalized &&
      resumeApiBaseNormalized !== currentApiBaseNormalized
  );
  if (resumeApiBaseMismatch) {
    if (scanResumeApiBaseMismatchBehavior === "error") {
      throw new Error(
        `Scan resume file (${resolvedResumePath}) apiBaseUrl mismatch: resume=${resumeApiBaseUrl}, current=${options.apiBaseUrl}.`
      );
    }
    return attachResumeSizeTelemetry({
      startCursor: null,
      source: `${baseSource}_api_base_mismatch`,
      resumeFile: resolvedResumePath,
      exhausted: false,
      stale: false,
      resumeAgeMinutes: null,
      resumeGeneratedAt: null,
      resumeStaleReason: null,
      resumeApiBaseUrl: resumeApiBaseUrl || null,
      resumeApiBaseValidated: scanResumeValidateApiBase,
      resumeApiBaseMismatch: true,
      resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
      resumeKind: resumeKindRaw || null,
      resumeKindValidated: scanResumeValidateKind,
      resumeKindMismatch: false,
      resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
      resumeSchemaVersionExpected: expectedResumeSchemaVersion,
      resumeSchemaVersion,
      resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
      resumeSchemaVersionMismatch: false,
      resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
      resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
      resumeGeneratedAtSource: "none",
      resumeFuture: false,
      resumeFutureMinutes: null,
      resumeFutureBehavior: scanResumeFutureBehavior,
      resumeFilterValidated: scanResumeValidateFilters,
      resumeFilterMismatch: false,
      resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
      resumeFilterMismatchFields: []
    });
  }

  const expectedResumeFilters = buildExpectedResumeFilterSnapshot(options);
  const resumeArtifactFilters = buildResumeArtifactFilterSnapshot(parsed);
  const resumeFilterMismatchFields = scanResumeValidateFilters
    ? computeResumeFilterMismatchFields(expectedResumeFilters, resumeArtifactFilters)
    : [];
  const resumeFilterMismatch = scanResumeValidateFilters && resumeFilterMismatchFields.length > 0;
  if (resumeFilterMismatch) {
    if (scanResumeFilterMismatchBehavior === "error") {
      throw new Error(
        `Scan resume file (${resolvedResumePath}) filter mismatch (${resumeFilterMismatchFields.join(", ")}): resume=${JSON.stringify(
          resumeArtifactFilters
        )}, current=${JSON.stringify(expectedResumeFilters)}.`
      );
    }
    return attachResumeSizeTelemetry({
      startCursor: null,
      source: `${baseSource}_filter_mismatch`,
      resumeFile: resolvedResumePath,
      exhausted: false,
      stale: false,
      resumeAgeMinutes: null,
      resumeGeneratedAt: null,
      resumeStaleReason: null,
      resumeApiBaseUrl: resumeApiBaseUrl || null,
      resumeApiBaseValidated: scanResumeValidateApiBase,
      resumeApiBaseMismatch: false,
      resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
      resumeKind: resumeKindRaw || null,
      resumeKindValidated: scanResumeValidateKind,
      resumeKindMismatch: false,
      resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
      resumeSchemaVersionExpected: expectedResumeSchemaVersion,
      resumeSchemaVersion,
      resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
      resumeSchemaVersionMismatch: false,
      resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
      resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
      resumeGeneratedAtSource: "none",
      resumeFuture: false,
      resumeFutureMinutes: null,
      resumeFutureBehavior: scanResumeFutureBehavior,
      resumeFilterValidated: scanResumeValidateFilters,
      resumeFilterMismatch: true,
      resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
      resumeFilterMismatchFields
    });
  }

  const payloadGeneratedAtRaw = toText(parsed?.generatedAt);
  const payloadGeneratedAtMs = Date.parse(payloadGeneratedAtRaw);
  const hasPayloadGeneratedAt = Number.isFinite(payloadGeneratedAtMs);
  let fileMtimeMs = Number.NaN;
  if (
    scanResumeGeneratedAtSourcePolicy === "file-mtime" ||
    scanResumeGeneratedAtSourcePolicy === "payload-or-file-mtime"
  ) {
    try {
      const fileStats = await stat(resolvedResumePath);
      if (fileStats && Number.isFinite(Number(fileStats.mtimeMs))) {
        fileMtimeMs = Number(fileStats.mtimeMs);
      }
    } catch (_error) {
      fileMtimeMs = Number.NaN;
    }
  }

  let selectedGeneratedAtMs = Number.NaN;
  let resumeGeneratedAtSource = "none";
  if (scanResumeGeneratedAtSourcePolicy === "payload") {
    if (hasPayloadGeneratedAt) {
      selectedGeneratedAtMs = payloadGeneratedAtMs;
      resumeGeneratedAtSource = "payload";
    }
  } else if (scanResumeGeneratedAtSourcePolicy === "file-mtime") {
    if (Number.isFinite(fileMtimeMs)) {
      selectedGeneratedAtMs = fileMtimeMs;
      resumeGeneratedAtSource = "file_mtime";
    }
  } else {
    if (hasPayloadGeneratedAt) {
      selectedGeneratedAtMs = payloadGeneratedAtMs;
      resumeGeneratedAtSource = "payload";
    } else if (Number.isFinite(fileMtimeMs)) {
      selectedGeneratedAtMs = fileMtimeMs;
      resumeGeneratedAtSource = "file_mtime";
    }
  }

  const hasResumeGeneratedAt = Number.isFinite(selectedGeneratedAtMs);
  const resumeGeneratedAt = hasResumeGeneratedAt ? new Date(selectedGeneratedAtMs).toISOString() : null;
  const resumeAgeMinutes = hasResumeGeneratedAt ? Math.max(0, Math.floor((Date.now() - selectedGeneratedAtMs) / 60000)) : null;
  const resumeFutureMinutes = hasResumeGeneratedAt
    ? Math.max(0, Math.floor((selectedGeneratedAtMs - Date.now()) / 60000))
    : null;
  const resumeFuture = scanResumeMaxFutureMinutes > 0 && hasResumeGeneratedAt && Number(resumeFutureMinutes) > scanResumeMaxFutureMinutes;
  if (resumeFuture) {
    if (scanResumeFutureBehavior === "error") {
      throw new Error(
        `Scan resume file (${resolvedResumePath}) is from the future: generatedAt +${resumeFutureMinutes}m exceeds max ${scanResumeMaxFutureMinutes}m.`
      );
    }
    return attachResumeSizeTelemetry({
      startCursor: null,
      source: `${baseSource}_future`,
      resumeFile: resolvedResumePath,
      exhausted: false,
      stale: false,
      resumeAgeMinutes,
      resumeGeneratedAt,
      resumeStaleReason: null,
      resumeApiBaseUrl: resumeApiBaseUrl || null,
      resumeApiBaseValidated: scanResumeValidateApiBase,
      resumeApiBaseMismatch: false,
      resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
      resumeKind: resumeKindRaw || null,
      resumeKindValidated: scanResumeValidateKind,
      resumeKindMismatch: false,
      resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
      resumeSchemaVersionExpected: expectedResumeSchemaVersion,
      resumeSchemaVersion,
      resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
      resumeSchemaVersionMismatch: false,
      resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
      resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
      resumeGeneratedAtSource,
      resumeFuture: true,
      resumeFutureMinutes,
      resumeFutureBehavior: scanResumeFutureBehavior,
      resumeFilterValidated: scanResumeValidateFilters,
      resumeFilterMismatch: false,
      resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
      resumeFilterMismatchFields: []
    });
  }
  const scanResumeMaxAgeMinutes = Math.max(0, Math.min(525600, Number(options.scanResumeMaxAgeMinutes || 0)));
  const scanResumeStaleBehavior =
    toText(options.scanResumeStaleBehavior).toLowerCase() === "error" ? "error" : "restart";
  const resumeStaleReason = hasResumeGeneratedAt ? "age_exceeded" : "missing_generated_at";
  const resumeStale = scanResumeMaxAgeMinutes > 0 && (!hasResumeGeneratedAt || Number(resumeAgeMinutes) > scanResumeMaxAgeMinutes);
  if (resumeStale) {
    if (scanResumeStaleBehavior === "error") {
      if (!hasResumeGeneratedAt) {
        throw new Error(
          `Scan resume file (${resolvedResumePath}) is stale: generatedAt missing and --scan-resume-max-age-minutes=${scanResumeMaxAgeMinutes}.`
        );
      }
      throw new Error(
        `Scan resume file (${resolvedResumePath}) is stale: age ${resumeAgeMinutes}m exceeds max ${scanResumeMaxAgeMinutes}m.`
      );
    }
    return attachResumeSizeTelemetry({
      startCursor: null,
      source: `${baseSource}_stale`,
      resumeFile: resolvedResumePath,
      exhausted: false,
      stale: true,
      resumeAgeMinutes,
      resumeGeneratedAt,
      resumeStaleReason,
      resumeApiBaseUrl: resumeApiBaseUrl || null,
      resumeApiBaseValidated: scanResumeValidateApiBase,
      resumeApiBaseMismatch: false,
      resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
      resumeKind: resumeKindRaw || null,
      resumeKindValidated: scanResumeValidateKind,
      resumeKindMismatch: false,
      resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
      resumeSchemaVersionExpected: expectedResumeSchemaVersion,
      resumeSchemaVersion,
      resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
      resumeSchemaVersionMismatch: false,
      resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
      resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
      resumeGeneratedAtSource,
      resumeFuture: false,
      resumeFutureMinutes,
      resumeFutureBehavior: scanResumeFutureBehavior,
      resumeFilterValidated: scanResumeValidateFilters,
      resumeFilterMismatch: false,
      resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
      resumeFilterMismatchFields: []
    });
  }
  const resumeHasPaging = Boolean(parsed && typeof parsed === "object" && parsed.paging && typeof parsed.paging === "object");
  const resumeHasMore = resumeHasPaging ? toBool(parsed.paging.hasMore, false) : false;
  if (!cursor && options.scanResumeAllowExhausted && resumeHasPaging && !resumeHasMore) {
    return attachResumeSizeTelemetry({
      startCursor: null,
      source: `${baseSource}_exhausted`,
      resumeFile: resolvedResumePath,
      exhausted: true,
      stale: false,
      resumeAgeMinutes,
      resumeGeneratedAt,
      resumeStaleReason: null,
      resumeApiBaseUrl: resumeApiBaseUrl || null,
      resumeApiBaseValidated: scanResumeValidateApiBase,
      resumeApiBaseMismatch: false,
      resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
      resumeKind: resumeKindRaw || null,
      resumeKindValidated: scanResumeValidateKind,
      resumeKindMismatch: false,
      resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
      resumeSchemaVersionExpected: expectedResumeSchemaVersion,
      resumeSchemaVersion,
      resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
      resumeSchemaVersionMismatch: false,
      resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
      resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
      resumeGeneratedAtSource,
      resumeFuture: false,
      resumeFutureMinutes,
      resumeFutureBehavior: scanResumeFutureBehavior,
      resumeFilterValidated: scanResumeValidateFilters,
      resumeFilterMismatch: false,
      resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
      resumeFilterMismatchFields: []
    });
  }
  if (!cursor) {
    throw new Error(
      `Scan resume file (${resolvedResumePath}) is missing paging.nextCursor. Run a scan with hasMore=true first.`
    );
  }

  return attachResumeSizeTelemetry({
    startCursor: cursor,
    source: baseSource,
    resumeFile: resolvedResumePath,
    exhausted: false,
    stale: false,
    resumeAgeMinutes,
    resumeGeneratedAt,
    resumeStaleReason: null,
    resumeApiBaseUrl: resumeApiBaseUrl || null,
    resumeApiBaseValidated: scanResumeValidateApiBase,
    resumeApiBaseMismatch: false,
    resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
    resumeKind: resumeKindRaw || null,
    resumeKindValidated: scanResumeValidateKind,
    resumeKindMismatch: false,
    resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
    resumeSchemaVersionExpected: expectedResumeSchemaVersion,
    resumeSchemaVersion,
    resumeSchemaVersionValidated: scanResumeValidateSchemaVersion,
    resumeSchemaVersionMismatch: false,
    resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
    resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
    resumeGeneratedAtSource,
    resumeFuture: false,
    resumeFutureMinutes,
    resumeFutureBehavior: scanResumeFutureBehavior,
    resumeFilterValidated: scanResumeValidateFilters,
    resumeFilterMismatch: false,
    resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
    resumeFilterMismatchFields: []
  });
}

function normalizeScheduleCursor(value) {
  const createdAt = toText(value?.createdAt);
  const id = toText(value?.id).toLowerCase();
  if (!createdAt || !id) return null;
  return {
    createdAt,
    id
  };
}

function buildListSchedulesPath(options, cursor = null) {
  const params = new URLSearchParams();
  params.set("activeOnly", options.activeOnly ? "true" : "false");
  params.set("limit", String(options.limit));
  const normalizedCursor = normalizeScheduleCursor(cursor);
  if (normalizedCursor) {
    params.set("cursorCreatedAt", normalizedCursor.createdAt);
    params.set("cursorId", normalizedCursor.id);
  }
  return `/api/schedules?${params.toString()}`;
}

function computeListRetryDelayMs(options, retryAttemptNumber) {
  const base = Math.max(0, Math.min(60_000, Number(options.listRetryDelayMs || 0)));
  const factor = Math.max(1, Math.min(5, Number(options.listRetryBackoffFactor || 1)));
  const jitterMax = Math.max(0, Math.min(5_000, Number(options.listRetryJitterMs || 0)));
  const power = Math.max(0, Number(retryAttemptNumber || 0));
  const backoffDelay = Math.min(60_000, Math.floor(base * Math.pow(factor, power)));
  const jitter = jitterMax > 0 ? Math.floor(Math.random() * (jitterMax + 1)) : 0;
  return Math.max(0, Math.min(60_000, backoffDelay + jitter));
}

async function performListSchedulesPageWithRetry(options, cursor = null) {
  const path = buildListSchedulesPath(options, cursor);
  const maxRetries = Math.max(0, Math.min(10, Number(options.listRetryCount || 0)));
  const requestTimeoutMs = Math.max(1_000, Math.min(120_000, Number(options.listRequestTimeoutMs || 15000)));
  const maxAttempts = maxRetries + 1;
  const attempts = [];

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    const attemptNumber = attemptIndex + 1;
    try {
      const response = await requestJson({
        baseUrl: options.apiBaseUrl,
        path,
        token: options.bearerToken,
        method: "GET",
        timeoutMs: requestTimeoutMs
      });
      attempts.push({
        attempt: attemptNumber,
        ok: response.ok,
        status: response.status
      });

      if (response.ok) {
        return {
          ok: true,
          response,
          attempts,
          retried: attemptNumber - 1,
          exhaustedRetries: false
        };
      }

      const hasMoreAttempts = attemptNumber < maxAttempts;
      if (!shouldRetryRequestFailure(response.status) || !hasMoreAttempts) {
        return {
          ok: false,
          response,
          attempts,
          retried: attemptNumber - 1,
          exhaustedRetries: hasMoreAttempts ? false : maxRetries > 0
        };
      }
    } catch (error) {
      attempts.push({
        attempt: attemptNumber,
        ok: false,
        status: 0,
        error: error.message || "request_failed",
        errorType: error.name || "Error"
      });
      const hasMoreAttempts = attemptNumber < maxAttempts;
      if (!hasMoreAttempts) {
        return {
          ok: false,
          response: {
            ok: false,
            status: 0,
            body: {
              error: "list_schedules_request_failed",
              message: error.message
            }
          },
          attempts,
          retried: attemptNumber - 1,
          exhaustedRetries: maxRetries > 0
        };
      }
    }

    const retryDelayMs = computeListRetryDelayMs(options, attemptIndex);
    if (retryDelayMs > 0) {
      await sleep(retryDelayMs);
    }
  }

  return {
    ok: false,
    response: {
      ok: false,
      status: 0,
      body: {
        error: "list_schedules_retry_unexpected_termination"
      }
    },
    attempts,
    retried: attempts.length > 0 ? attempts.length - 1 : 0,
    exhaustedRetries: maxRetries > 0
  };
}

async function listSchedulesPage(options, cursor = null) {
  const outcome = await performListSchedulesPageWithRetry(options, cursor);
  const response = outcome.response;
  if (!outcome.ok) {
    throw new Error(`List schedules failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  const pageInfo =
    response.body && typeof response.body === "object" && response.body.pageInfo && typeof response.body.pageInfo === "object"
      ? response.body.pageInfo
      : {};
  return {
    items: normalizeList(response.body?.items),
    hasMore: Boolean(pageInfo.hasMore),
    nextCursor: normalizeScheduleCursor(pageInfo.nextCursor),
    retried: outcome.retried,
    exhaustedRetries: outcome.exhaustedRetries
  };
}

async function listSchedules(options) {
  const scanAll = Boolean(options.scanAll);
  const configuredScanMaxPages = Math.max(0, Math.min(100000, Number(options.scanMaxPages || 0)));
  const scanHardMaxPages = Math.max(1, Math.min(100000, Number(options.scanHardMaxPages || 5000)));
  const operatorCapEnabled = configuredScanMaxPages > 0;
  const effectiveScanMaxPages = operatorCapEnabled ? configuredScanMaxPages : scanHardMaxPages;
  const scanAutoContinue = Boolean(options.scanAutoContinue);
  const scanAutoContinueMaxSegments = Math.max(
    1,
    Math.min(1000, Number(options.scanAutoContinueMaxSegments || 20))
  );
  const listRetrySummary = {
    maxRetries: Math.max(0, Math.min(10, Number(options.listRetryCount || 0))),
    retryDelayMs: Math.max(0, Math.min(60_000, Number(options.listRetryDelayMs || 0))),
    retryBackoffFactor: Math.max(1, Math.min(5, Number(options.listRetryBackoffFactor || 1))),
    retryJitterMs: Math.max(0, Math.min(5_000, Number(options.listRetryJitterMs || 0))),
    requestTimeoutMs: Math.max(1_000, Math.min(120_000, Number(options.listRequestTimeoutMs || 15000))),
    pagesRetried: 0,
    attemptedRetries: 0,
    exhaustedRetries: 0
  };
  const scanResumeExhaustedBehavior =
    toText(options.scanResumeExhaustedBehavior).toLowerCase() === "restart" ? "restart" : "noop";
  const scanResumeFromCheckpoint = Boolean(options.scanResumeFromCheckpoint);
  const scanResumeMaxAgeMinutes = Math.max(0, Math.min(525600, Number(options.scanResumeMaxAgeMinutes || 0)));
  const scanResumeMaxBytes = Math.max(0, Math.min(50_000_000, Number(options.scanResumeMaxBytes || 0)));
  const scanResumeMaxFutureMinutes = Math.max(0, Math.min(525600, Number(options.scanResumeMaxFutureMinutes || 0)));
  const scanResumeStaleBehavior =
    toText(options.scanResumeStaleBehavior).toLowerCase() === "error" ? "error" : "restart";
  const scanResumeFutureBehavior =
    toText(options.scanResumeFutureBehavior).toLowerCase() === "error" ? "error" : "restart";
  const scanResumeSizeBehavior =
    toText(options.scanResumeSizeBehavior).toLowerCase() === "error" ? "error" : "restart";
  const scanResumeValidateApiBase = Boolean(options.scanResumeValidateApiBase);
  const scanResumeRequireApiBase = Boolean(options.scanResumeRequireApiBase);
  const scanResumeApiBaseMismatchBehavior =
    toText(options.scanResumeApiBaseMismatchBehavior).toLowerCase() === "restart" ? "restart" : "error";
  const scanResumeApiBaseMissingBehavior =
    toText(options.scanResumeApiBaseMissingBehavior).toLowerCase() === "error" ? "error" : "restart";
  const scanResumeValidateKind = Boolean(options.scanResumeValidateKind);
  const scanResumeKindMismatchBehavior =
    toText(options.scanResumeKindMismatchBehavior).toLowerCase() === "restart" ? "restart" : "error";
  const scanResumeValidateSchemaVersion = Boolean(options.scanResumeValidateSchemaVersion);
  const scanResumeSchemaVersionMismatchBehavior =
    toText(options.scanResumeSchemaVersionMismatchBehavior).toLowerCase() === "error" ? "error" : "restart";
  const scanResumeValidateFilters = Boolean(options.scanResumeValidateFilters);
  const scanResumeFilterMismatchBehavior =
    toText(options.scanResumeFilterMismatchBehavior).toLowerCase() === "error" ? "error" : "restart";
  const scanResumeGeneratedAtSourcePolicy = normalizeResumeGeneratedAtSource(
    options.scanResumeGeneratedAtSourcePolicy || options.scanResumeGeneratedAtSource
  );
  const scanResumeGeneratedAtSource = normalizeResolvedResumeGeneratedAtSource(options.scanResumeGeneratedAtSourceResolved);
  const resumeExhaustedNoop = Boolean(
    options.scanResumeExhausted && options.scanResumeAllowExhausted && scanResumeExhaustedBehavior === "noop"
  );
  const all = [];
  const seenIds = new Set();
  const seenCursorKeys = new Set();
  let pagesFetched = 0;
  let hasMore = false;
  let nextCursor = null;
  let truncatedByMaxPages = false;
  let truncatedByHardMaxPages = false;
  let cursorLoopDetected = false;
  let autoContinueLimitReached = false;
  let segmentNumber = 1;
  let segmentPagesFetched = 0;
  let continuations = 0;
  let cursor = normalizeScheduleCursor(options.scanStartCursor);
  const startCursor = cursor ? { ...cursor } : null;
  const currentCheckpointState = () => ({
    pagesFetched,
    segmentsUsed: segmentNumber,
    continuations,
    hasMore,
    nextCursor: hasMore ? nextCursor : null,
    truncatedByMaxPages,
    truncatedByHardMaxPages,
    autoContinueLimitReached,
    cursorLoopDetected,
    resumeExhaustedNoop
  });
  const buildPagingSummary = () => ({
    scanAll,
    pageLimit: options.limit,
    pagesFetched,
    maxPages: configuredScanMaxPages,
    operatorCapEnabled,
    hardMaxPages: scanHardMaxPages,
    effectiveMaxPages: effectiveScanMaxPages,
    scanAutoContinue,
    scanAutoContinueMaxSegments,
    segmentsUsed: segmentNumber,
    continuations,
    autoContinueLimitReached,
    startCursor,
    resumeSource: options.scanResumeSource || "none",
    resumeFile: options.scanResumeResolvedFile || null,
    resumeFromCheckpoint: scanResumeFromCheckpoint,
    resumeValidateApiBase: scanResumeValidateApiBase,
    resumeRequireApiBase: scanResumeRequireApiBase,
    resumeApiBaseValidated: Boolean(options.scanResumeApiBaseValidated),
    resumeApiBaseMismatchBehavior: scanResumeApiBaseMismatchBehavior,
    resumeApiBaseMissingBehavior: scanResumeApiBaseMissingBehavior,
    resumeApiBaseUrl: options.scanResumeApiBaseUrl || null,
    resumeApiBaseRequired: Boolean(options.scanResumeApiBaseRequired),
    resumeApiBaseMissing: Boolean(options.scanResumeApiBaseMissing),
    resumeApiBaseMismatch: Boolean(options.scanResumeApiBaseMismatch),
    resumeValidateKind: scanResumeValidateKind,
    resumeKindValidated: Boolean(options.scanResumeKindValidated),
    resumeKindMismatchBehavior: scanResumeKindMismatchBehavior,
    resumeKind: options.scanResumeKind || null,
    resumeKindMismatch: Boolean(options.scanResumeKindMismatch),
    resumeValidateSchemaVersion: scanResumeValidateSchemaVersion,
    resumeSchemaVersionValidated: Boolean(options.scanResumeSchemaVersionValidated),
    resumeSchemaVersionMismatchBehavior: scanResumeSchemaVersionMismatchBehavior,
    resumeSchemaVersionExpected: Number.isFinite(Number(options.scanResumeSchemaVersionExpected))
      ? Number(options.scanResumeSchemaVersionExpected)
      : SCAN_RESUME_SCHEMA_VERSION,
    resumeSchemaVersion:
      Number.isFinite(Number(options.scanResumeSchemaVersion)) ? Number(options.scanResumeSchemaVersion) : null,
    resumeSchemaVersionMismatch: Boolean(options.scanResumeSchemaVersionMismatch),
    resumeMaxBytes: scanResumeMaxBytes > 0 ? scanResumeMaxBytes : null,
    resumeSizeBehavior: scanResumeSizeBehavior,
    resumeOversized: Boolean(options.scanResumeOversized),
    resumeSizeBytes: Number.isFinite(Number(options.scanResumeSizeBytes)) ? Number(options.scanResumeSizeBytes) : null,
    resumeSizeLimitBytes: Number.isFinite(Number(options.scanResumeSizeLimitBytes))
      ? Number(options.scanResumeSizeLimitBytes)
      : scanResumeMaxBytes > 0
        ? scanResumeMaxBytes
        : null,
    resumeHashExpected: normalizeSha256(options.scanResumeHashExpected || options.scanResumeSha256) || null,
    resumeHashActual: normalizeSha256(options.scanResumeHashActual) || null,
    resumeHashMismatch: Boolean(options.scanResumeHashMismatch),
    resumeHashBehavior: toText(options.scanResumeHashBehavior).toLowerCase() === "error" ? "error" : "restart",
    resumeMaxFutureMinutes: scanResumeMaxFutureMinutes > 0 ? scanResumeMaxFutureMinutes : null,
    resumeFutureBehavior: scanResumeFutureBehavior,
    resumeFuture: Boolean(options.scanResumeFuture),
    resumeFutureMinutes:
      Number.isFinite(Number(options.scanResumeFutureMinutes)) ? Number(options.scanResumeFutureMinutes) : null,
    resumeValidateFilters: scanResumeValidateFilters,
    resumeFilterValidated: Boolean(options.scanResumeFilterValidated),
    resumeFilterMismatchBehavior: scanResumeFilterMismatchBehavior,
    resumeFilterMismatch: Boolean(options.scanResumeFilterMismatch),
    resumeFilterMismatchFields: Array.isArray(options.scanResumeFilterMismatchFields)
      ? options.scanResumeFilterMismatchFields
      : [],
    resumeMaxAgeMinutes: scanResumeMaxAgeMinutes > 0 ? scanResumeMaxAgeMinutes : null,
    resumeStaleBehavior: scanResumeStaleBehavior,
    resumeStale: Boolean(options.scanResumeStale),
    resumeStaleReason: options.scanResumeStaleReason || null,
    resumeAgeMinutes: Number.isFinite(Number(options.scanResumeAgeMinutes)) ? Number(options.scanResumeAgeMinutes) : null,
    resumeGeneratedAt: options.scanResumeGeneratedAt || null,
    resumeGeneratedAtSourcePolicy: scanResumeGeneratedAtSourcePolicy,
    resumeGeneratedAtSource: scanResumeGeneratedAtSource,
    resumeAllowExhausted: Boolean(options.scanResumeAllowExhausted),
    resumeExhausted: Boolean(options.scanResumeExhausted),
    resumeExhaustedBehavior: scanResumeExhaustedBehavior,
    resumeExhaustedNoop,
    hasMore,
    nextCursor: hasMore ? nextCursor : null,
    truncatedByMaxPages,
    truncatedByHardMaxPages,
    cursorLoopDetected,
    retry: listRetrySummary
  });

  if (resumeExhaustedNoop) {
    await writeScanCheckpointIfConfigured(options, currentCheckpointState(), { force: true });
    const filtered = applyFilters(all, options);
    return {
      all,
      filtered,
      paging: buildPagingSummary()
    };
  }

  while (true) {
    pagesFetched += 1;
    segmentPagesFetched += 1;
    const page = await listSchedulesPage(options, cursor);
    if (page.retried > 0) {
      listRetrySummary.pagesRetried += 1;
      listRetrySummary.attemptedRetries += page.retried;
    }
    if (page.exhaustedRetries) {
      listRetrySummary.exhaustedRetries += 1;
    }
    hasMore = Boolean(page.hasMore);
    nextCursor = page.nextCursor;
    for (const item of page.items) {
      const id = toText(item.id);
      if (id) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      all.push(item);
    }

    if (!scanAll || !hasMore || !nextCursor) {
      break;
    }

    if (segmentPagesFetched >= effectiveScanMaxPages) {
      const canContinueSegment = scanAutoContinue && segmentNumber < scanAutoContinueMaxSegments;
      if (canContinueSegment) {
        continuations += 1;
        segmentNumber += 1;
        segmentPagesFetched = 0;
        await writeScanCheckpointIfConfigured(options, currentCheckpointState(), { force: false });
        cursor = nextCursor;
        continue;
      }

      if (scanAutoContinue && segmentNumber >= scanAutoContinueMaxSegments) {
        autoContinueLimitReached = true;
      }
      if (operatorCapEnabled) {
        truncatedByMaxPages = true;
      } else {
        truncatedByHardMaxPages = true;
      }
      break;
    }

    const cursorKey = `${nextCursor.createdAt}|${nextCursor.id}`;
    if (seenCursorKeys.has(cursorKey)) {
      cursorLoopDetected = true;
      break;
    }
    await writeScanCheckpointIfConfigured(options, currentCheckpointState(), { force: false });
    seenCursorKeys.add(cursorKey);
    cursor = nextCursor;
  }

  await writeScanCheckpointIfConfigured(options, currentCheckpointState(), { force: true });

  const filtered = applyFilters(all, options);
  return {
    all,
    filtered,
    paging: buildPagingSummary()
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function shouldRetryRequestFailure(status) {
  const code = Number(status || 0);
  if (!Number.isFinite(code) || code <= 0) return true;
  if (code === 408 || code === 425 || code === 429) return true;
  return code >= 500;
}

function computeRetryDelayMs(options, retryAttemptNumber) {
  const base = Math.max(0, Math.min(60_000, Number(options.pauseRetryDelayMs || 0)));
  const factor = Math.max(1, Math.min(5, Number(options.pauseRetryBackoffFactor || 1)));
  const jitterMax = Math.max(0, Math.min(5_000, Number(options.pauseRetryJitterMs || 0)));
  const power = Math.max(0, Number(retryAttemptNumber || 0));
  const backoffDelay = Math.min(60_000, Math.floor(base * Math.pow(factor, power)));
  const jitter = jitterMax > 0 ? Math.floor(Math.random() * (jitterMax + 1)) : 0;
  return Math.max(0, Math.min(60_000, backoffDelay + jitter));
}

async function performPauseToggleWithRetry(options, scheduleId) {
  const maxRetries = Math.max(0, Math.min(10, Number(options.pauseRetryCount || 0)));
  const requestTimeoutMs = Math.max(1_000, Math.min(120_000, Number(options.pauseRequestTimeoutMs || 15000)));
  const maxAttempts = maxRetries + 1;
  const attempts = [];

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    const attemptNumber = attemptIndex + 1;

    try {
      const response = await requestJson({
        baseUrl: options.apiBaseUrl,
        path: "/api/schedules/toggle",
        token: options.bearerToken,
        method: "POST",
        body: {
          scheduleId,
          isActive: false
        },
        timeoutMs: requestTimeoutMs
      });

      attempts.push({
        attempt: attemptNumber,
        ok: response.ok,
        status: response.status
      });

      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          body: response.body,
          attempts,
          retried: attemptNumber - 1,
          exhaustedRetries: false
        };
      }

      const hasMoreAttempts = attemptNumber < maxAttempts;
      if (!shouldRetryRequestFailure(response.status) || !hasMoreAttempts) {
        return {
          ok: false,
          status: response.status,
          body: response.body,
          attempts,
          retried: attemptNumber - 1,
          exhaustedRetries: hasMoreAttempts ? false : maxRetries > 0
        };
      }
    } catch (error) {
      attempts.push({
        attempt: attemptNumber,
        ok: false,
        status: 0,
        error: error.message || "request_failed",
        errorType: error.name || "Error"
      });

      const hasMoreAttempts = attemptNumber < maxAttempts;
      if (!hasMoreAttempts) {
        return {
          ok: false,
          status: 0,
          body: {
            error: "pause_toggle_request_failed",
            message: error.message
          },
          attempts,
          retried: attemptNumber - 1,
          exhaustedRetries: maxRetries > 0
        };
      }
    }

    const retryDelayMs = computeRetryDelayMs(options, attemptIndex);
    if (retryDelayMs > 0) {
      await sleep(retryDelayMs);
    }
  }

  return {
    ok: false,
    status: 0,
    body: {
      error: "pause_toggle_retry_unexpected_termination"
    },
    attempts,
    retried: attempts.length > 0 ? attempts.length - 1 : 0,
    exhaustedRetries: maxRetries > 0
  };
}

async function pauseSchedules(options, schedules) {
  const results = [];
  const batches = [];
  const batchSize = Math.max(1, Math.min(100, Number(options.pauseBatchSize || 20)));
  const batchDelayMs = Math.max(0, Number(options.pauseBatchDelayMs || 0));
  const continueOnPauseError = Boolean(options.continueOnPauseError);
  const retrySummary = {
    maxRetries: Math.max(0, Math.min(10, Number(options.pauseRetryCount || 0))),
    retryDelayMs: Math.max(0, Math.min(60_000, Number(options.pauseRetryDelayMs || 0))),
    retryBackoffFactor: Math.max(1, Math.min(5, Number(options.pauseRetryBackoffFactor || 1))),
    retryJitterMs: Math.max(0, Math.min(5_000, Number(options.pauseRetryJitterMs || 0))),
    requestTimeoutMs: Math.max(1_000, Math.min(120_000, Number(options.pauseRequestTimeoutMs || 15000))),
    schedulesRetried: 0,
    attemptedRetries: 0,
    exhaustedRetries: 0
  };
  let halted = false;

  for (let start = 0; start < schedules.length; start += batchSize) {
    const batchItems = schedules.slice(start, start + batchSize);
    const batchSummary = {
      batchNumber: batches.length + 1,
      size: batchItems.length,
      attempted: 0,
      updated: 0,
      skippedDryRun: 0,
      skippedAlreadyInactive: 0,
      failed: 0,
      halted: false
    };

    for (const schedule of batchItems) {
      batchSummary.attempted += 1;

      if (!schedule.isActive) {
        results.push({
          scheduleId: schedule.id,
          ok: true,
          skipped: true,
          reason: "already_inactive"
        });
        batchSummary.skippedAlreadyInactive += 1;
        continue;
      }

      if (!options.apply) {
        results.push({
          scheduleId: schedule.id,
          ok: true,
          skipped: true,
          reason: "dry_run"
        });
        batchSummary.skippedDryRun += 1;
        continue;
      }

      const pauseOutcome = await performPauseToggleWithRetry(options, schedule.id);
      const resultItem = {
        scheduleId: schedule.id,
        ok: pauseOutcome.ok,
        status: pauseOutcome.status,
        body: pauseOutcome.body,
        attempts: pauseOutcome.attempts,
        retried: pauseOutcome.retried
      };
      results.push(resultItem);

      if (pauseOutcome.retried > 0) {
        retrySummary.schedulesRetried += 1;
        retrySummary.attemptedRetries += pauseOutcome.retried;
      }
      if (pauseOutcome.exhaustedRetries) {
        retrySummary.exhaustedRetries += 1;
      }

      if (pauseOutcome.ok) {
        batchSummary.updated += 1;
      } else {
        batchSummary.failed += 1;
        if (options.apply && !continueOnPauseError) {
          halted = true;
          batchSummary.halted = true;
          break;
        }
      }
    }

    batches.push(batchSummary);
    if (halted) {
      break;
    }

    const hasMoreBatches = start + batchSize < schedules.length;
    if (options.apply && batchDelayMs > 0 && hasMoreBatches) {
      await sleep(batchDelayMs);
    }
  }

  const failures = results.filter((item) => item.ok === false);
  return {
    results,
    failures,
    batches,
    halted,
    retry: retrySummary
  };
}

function buildPauseGuardrail(options, attempted) {
  const limit = Number(options.maxPause || 0);
  const normalizedAttempted = Math.max(0, Number(attempted || 0));
  const enabled = limit > 0;
  const blocked = Boolean(options.apply && enabled && normalizedAttempted > limit && !options.forcePauseOverLimit);
  return {
    enabled,
    maxPause: enabled ? limit : null,
    attempted: normalizedAttempted,
    forcePauseOverLimit: Boolean(options.forcePauseOverLimit),
    blocked
  };
}

function buildTimestampTag(date = new Date()) {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function resolveOutputPath(options) {
  const outputFile = toText(options.outputFile);
  if (!outputFile) return "";
  if (!options.outputTimestamp) {
    return resolve(process.cwd(), outputFile);
  }

  const parsed = parse(outputFile);
  const nameBase = toText(parsed.name) || "queue-hygiene";
  const stamped = format({
    ...parsed,
    base: undefined,
    name: `${nameBase}-${buildTimestampTag(new Date())}`
  });
  return resolve(process.cwd(), stamped);
}

function resolveScanCheckpointPath(options) {
  const checkpointFile = toText(options.scanCheckpointFile);
  if (!checkpointFile) return "";
  return resolve(process.cwd(), checkpointFile);
}

async function writeTextFileAtomic(targetPath, contents) {
  const resolvedPath = toText(targetPath);
  if (!resolvedPath) {
    throw new Error("Atomic write target path is required.");
  }
  const tempPath = `${resolvedPath}.tmp-${process.pid}-${Date.now()}-${randomUUID()}`;
  try {
    await mkdir(dirname(resolvedPath), { recursive: true });
    await writeFile(tempPath, contents, "utf8");
    try {
      await rename(tempPath, resolvedPath);
    } catch (error) {
      if (error && (error.code === "EEXIST" || error.code === "EPERM" || error.code === "ENOTEMPTY")) {
        await rm(resolvedPath, { force: true });
        await rename(tempPath, resolvedPath);
      } else {
        throw error;
      }
    }
  } catch (error) {
    try {
      await rm(tempPath, { force: true });
    } catch (_cleanupError) {
      // ignore cleanup failures so original write error is preserved
    }
    throw error;
  }
}

function buildScanCheckpointPayload(options, state) {
  return {
    ok: true,
    kind: "queue_hygiene_scan_checkpoint",
    schemaVersion: SCAN_RESUME_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    apiBaseUrl: options.apiBaseUrl,
    action: options.action,
    filters: {
      scanAll: options.scanAll,
      scanMaxPages: options.scanMaxPages,
      scanHardMaxPages: options.scanHardMaxPages,
      scanAutoContinue: options.scanAutoContinue,
      scanAutoContinueMaxSegments: options.scanAutoContinueMaxSegments,
      scanStartCursorCreatedAt: options.scanStartCursor?.createdAt || null,
      scanStartCursorId: options.scanStartCursor?.id || null,
      scanResumeSource: options.scanResumeSource || "none",
      scanResumeFile: options.scanResumeResolvedFile || options.scanResumeFile || null,
      scanResumeFromCheckpoint: Boolean(options.scanResumeFromCheckpoint),
      scanResumeValidateApiBase: Boolean(options.scanResumeValidateApiBase),
      scanResumeRequireApiBase: Boolean(options.scanResumeRequireApiBase),
      scanResumeApiBaseRequired: Boolean(options.scanResumeApiBaseRequired),
      scanResumeApiBaseValidated: Boolean(options.scanResumeApiBaseValidated),
      scanResumeValidateKind: Boolean(options.scanResumeValidateKind),
      scanResumeKindValidated: Boolean(options.scanResumeKindValidated),
      scanResumeValidateSchemaVersion: Boolean(options.scanResumeValidateSchemaVersion),
      scanResumeSchemaVersionValidated: Boolean(options.scanResumeSchemaVersionValidated),
      scanResumeValidateFilters: Boolean(options.scanResumeValidateFilters),
      scanResumeFilterValidated: Boolean(options.scanResumeFilterValidated),
      scanResumeApiBaseMismatchBehavior:
        toText(options.scanResumeApiBaseMismatchBehavior).toLowerCase() === "restart" ? "restart" : "error",
      scanResumeApiBaseMissingBehavior:
        toText(options.scanResumeApiBaseMissingBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeKindMismatchBehavior:
        toText(options.scanResumeKindMismatchBehavior).toLowerCase() === "restart" ? "restart" : "error",
      scanResumeSchemaVersionMismatchBehavior:
        toText(options.scanResumeSchemaVersionMismatchBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeFilterMismatchBehavior:
        toText(options.scanResumeFilterMismatchBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeApiBaseUrl: options.scanResumeApiBaseUrl || null,
      scanResumeApiBaseMissing: Boolean(options.scanResumeApiBaseMissing),
      scanResumeApiBaseMismatch: Boolean(options.scanResumeApiBaseMismatch),
      scanResumeKind: options.scanResumeKind || null,
      scanResumeKindMismatch: Boolean(options.scanResumeKindMismatch),
      scanResumeSchemaVersionExpected: Number.isFinite(Number(options.scanResumeSchemaVersionExpected))
        ? Number(options.scanResumeSchemaVersionExpected)
        : SCAN_RESUME_SCHEMA_VERSION,
      scanResumeSchemaVersion:
        Number.isFinite(Number(options.scanResumeSchemaVersion)) ? Number(options.scanResumeSchemaVersion) : null,
      scanResumeSchemaVersionMismatch: Boolean(options.scanResumeSchemaVersionMismatch),
      scanResumeFilterMismatch: Boolean(options.scanResumeFilterMismatch),
      scanResumeFilterMismatchFields: Array.isArray(options.scanResumeFilterMismatchFields)
        ? options.scanResumeFilterMismatchFields
        : [],
      scanResumeGeneratedAtSourcePolicy: normalizeResumeGeneratedAtSource(
        options.scanResumeGeneratedAtSourcePolicy || options.scanResumeGeneratedAtSource
      ),
      scanResumeGeneratedAtSource: normalizeResolvedResumeGeneratedAtSource(options.scanResumeGeneratedAtSourceResolved),
      scanResumeMaxBytes:
        Math.max(0, Math.min(50_000_000, Number(options.scanResumeMaxBytes || 0))) > 0
          ? Math.max(0, Math.min(50_000_000, Number(options.scanResumeMaxBytes || 0)))
          : null,
      scanResumeSizeBehavior:
        toText(options.scanResumeSizeBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeOversized: Boolean(options.scanResumeOversized),
      scanResumeSizeBytes:
        Number.isFinite(Number(options.scanResumeSizeBytes)) ? Number(options.scanResumeSizeBytes) : null,
      scanResumeSizeLimitBytes:
        Number.isFinite(Number(options.scanResumeSizeLimitBytes))
          ? Number(options.scanResumeSizeLimitBytes)
          : Math.max(0, Math.min(50_000_000, Number(options.scanResumeMaxBytes || 0))) > 0
            ? Math.max(0, Math.min(50_000_000, Number(options.scanResumeMaxBytes || 0)))
            : null,
      scanResumeSha256: normalizeSha256(options.scanResumeHashExpected || options.scanResumeSha256) || null,
      scanResumeHashBehavior:
        toText(options.scanResumeHashBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeHashActual: normalizeSha256(options.scanResumeHashActual) || null,
      scanResumeHashMismatch: Boolean(options.scanResumeHashMismatch),
      scanResumeMaxAgeMinutes:
        Math.max(0, Math.min(525600, Number(options.scanResumeMaxAgeMinutes || 0))) > 0
          ? Math.max(0, Math.min(525600, Number(options.scanResumeMaxAgeMinutes || 0)))
          : null,
      scanResumeMaxFutureMinutes:
        Math.max(0, Math.min(525600, Number(options.scanResumeMaxFutureMinutes || 0))) > 0
          ? Math.max(0, Math.min(525600, Number(options.scanResumeMaxFutureMinutes || 0)))
          : null,
      scanResumeStaleBehavior:
        toText(options.scanResumeStaleBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeFutureBehavior:
        toText(options.scanResumeFutureBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeStale: Boolean(options.scanResumeStale),
      scanResumeStaleReason: options.scanResumeStaleReason || null,
      scanResumeFuture: Boolean(options.scanResumeFuture),
      scanResumeFutureMinutes:
        Number.isFinite(Number(options.scanResumeFutureMinutes)) ? Number(options.scanResumeFutureMinutes) : null,
      scanResumeAgeMinutes:
        Number.isFinite(Number(options.scanResumeAgeMinutes)) ? Number(options.scanResumeAgeMinutes) : null,
      scanResumeGeneratedAt: options.scanResumeGeneratedAt || null,
      scanResumeAllowExhausted: Boolean(options.scanResumeAllowExhausted),
      scanResumeExhaustedBehavior:
        toText(options.scanResumeExhaustedBehavior).toLowerCase() === "restart" ? "restart" : "noop",
      scanResumeExhausted: Boolean(options.scanResumeExhausted),
      scanCheckpointEveryPages: options.scanCheckpointEveryPages,
      limit: options.limit,
      duplicatesOnly: options.duplicatesOnly,
      signatureMode: options.signatureMode,
      dedupeKeep: options.dedupeKeep,
      minAgeMinutes: options.minAgeMinutes > 0 ? options.minAgeMinutes : null
    },
    paging: {
      pagesFetched: Math.max(0, Number(state.pagesFetched || 0)),
      segmentsUsed: Math.max(1, Number(state.segmentsUsed || 1)),
      continuations: Math.max(0, Number(state.continuations || 0)),
      hasMore: Boolean(state.hasMore),
      nextCursor: normalizeScheduleCursor(state.nextCursor),
      truncatedByMaxPages: Boolean(state.truncatedByMaxPages),
      truncatedByHardMaxPages: Boolean(state.truncatedByHardMaxPages),
      autoContinueLimitReached: Boolean(state.autoContinueLimitReached),
      cursorLoopDetected: Boolean(state.cursorLoopDetected),
      resumeExhaustedNoop: Boolean(state.resumeExhaustedNoop)
    }
  };
}

async function writeScanCheckpointIfConfigured(options, state, { force = false } = {}) {
  const resolvedPath = toText(options.scanCheckpointResolvedFile);
  if (!resolvedPath) {
    return null;
  }

  const everyPages = Math.max(1, Math.min(1000, Number(options.scanCheckpointEveryPages || 1)));
  const pagesFetched = Math.max(0, Number(state?.pagesFetched || 0));
  if (!force && pagesFetched > 0 && pagesFetched % everyPages !== 0) {
    return resolvedPath;
  }

  const payload = buildScanCheckpointPayload(options, state || {});
  await writeTextFileAtomic(resolvedPath, `${JSON.stringify(payload, null, 2)}\n`);
  return resolvedPath;
}

async function writeSummaryOutputIfConfigured(options, summary) {
  const resolvedPath = toText(summary.outputFile);
  if (!resolvedPath) {
    return null;
  }
  if (!options.outputOverwrite) {
    try {
      await access(resolvedPath);
      const existsError = new Error(
        `Output file already exists: ${resolvedPath}. Set --output-overwrite=true or enable --output-timestamp=true.`
      );
      existsError.code = "OUTPUT_FILE_EXISTS";
      throw existsError;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const payload = options.outputCompact ? JSON.stringify(summary) : JSON.stringify(summary, null, 2);
  await writeTextFileAtomic(resolvedPath, `${payload}\n`);
  return resolvedPath;
}

async function main() {
  const startedAtMs = Date.now();
  const startedAtIso = new Date(startedAtMs).toISOString();
  const options = parseArgs(process.argv.slice(2));
  options.scanCheckpointResolvedFile = resolveScanCheckpointPath(options) || null;
  const auth = await resolveToken(options);
  options.bearerToken = requireToken(auth.token);
  const scanStart = await resolveScanStartCursor(options);
  options.scanStartCursor = scanStart.startCursor;
  options.scanResumeSource = scanStart.source;
  options.scanResumeResolvedFile = scanStart.resumeFile;
  options.scanResumeExhausted = Boolean(scanStart.exhausted);
  options.scanResumeStale = Boolean(scanStart.stale);
  options.scanResumeFuture = Boolean(scanStart.resumeFuture);
  options.scanResumeFutureMinutes = Number.isFinite(Number(scanStart.resumeFutureMinutes))
    ? Number(scanStart.resumeFutureMinutes)
    : null;
  options.scanResumeFutureBehavior =
    toText(scanStart.resumeFutureBehavior).toLowerCase() === "error" ? "error" : "restart";
  options.scanResumeGeneratedAtSourcePolicy = normalizeResumeGeneratedAtSource(
    scanStart.resumeGeneratedAtSourcePolicy || options.scanResumeGeneratedAtSource
  );
  options.scanResumeGeneratedAtSource = options.scanResumeGeneratedAtSourcePolicy;
  options.scanResumeGeneratedAtSourceResolved = normalizeResolvedResumeGeneratedAtSource(
    scanStart.resumeGeneratedAtSource
  );
  options.scanResumeOversized = Boolean(scanStart.resumeOversized);
  options.scanResumeSizeBytes = Number.isFinite(Number(scanStart.resumeSizeBytes)) ? Number(scanStart.resumeSizeBytes) : null;
  options.scanResumeSizeLimitBytes = Number.isFinite(Number(scanStart.resumeSizeLimitBytes))
    ? Number(scanStart.resumeSizeLimitBytes)
    : options.scanResumeMaxBytes > 0
      ? Number(options.scanResumeMaxBytes)
      : null;
  options.scanResumeSizeBehavior =
    toText(scanStart.resumeSizeBehavior || options.scanResumeSizeBehavior).toLowerCase() === "error" ? "error" : "restart";
  options.scanResumeHashExpected = normalizeSha256(scanStart.resumeHashExpected || options.scanResumeSha256);
  options.scanResumeSha256 = options.scanResumeHashExpected;
  options.scanResumeHashActual = normalizeSha256(scanStart.resumeHashActual);
  options.scanResumeHashMismatch = Boolean(scanStart.resumeHashMismatch);
  options.scanResumeHashBehavior =
    toText(scanStart.resumeHashBehavior || options.scanResumeHashBehavior).toLowerCase() === "error" ? "error" : "restart";
  options.scanResumeAgeMinutes = Number.isFinite(Number(scanStart.resumeAgeMinutes))
    ? Number(scanStart.resumeAgeMinutes)
    : null;
  options.scanResumeGeneratedAt = scanStart.resumeGeneratedAt || null;
  options.scanResumeStaleReason = scanStart.resumeStaleReason || null;
  options.scanResumeApiBaseUrl = scanStart.resumeApiBaseUrl || null;
  options.scanResumeApiBaseRequired = Boolean(scanStart.resumeApiBaseRequired);
  options.scanResumeApiBaseMissing = Boolean(scanStart.resumeApiBaseMissing);
  options.scanResumeApiBaseValidated = Boolean(scanStart.resumeApiBaseValidated);
  options.scanResumeApiBaseMismatch = Boolean(scanStart.resumeApiBaseMismatch);
  options.scanResumeApiBaseMismatchBehavior =
    toText(scanStart.resumeApiBaseMismatchBehavior).toLowerCase() === "restart" ? "restart" : "error";
  options.scanResumeApiBaseMissingBehavior =
    toText(scanStart.resumeApiBaseMissingBehavior || options.scanResumeApiBaseMissingBehavior).toLowerCase() === "error"
      ? "error"
      : "restart";
  options.scanResumeKind = scanStart.resumeKind || null;
  options.scanResumeKindValidated = Boolean(scanStart.resumeKindValidated);
  options.scanResumeKindMismatch = Boolean(scanStart.resumeKindMismatch);
  options.scanResumeKindMismatchBehavior =
    toText(scanStart.resumeKindMismatchBehavior).toLowerCase() === "restart" ? "restart" : "error";
  options.scanResumeSchemaVersionExpected = Number.isFinite(Number(scanStart.resumeSchemaVersionExpected))
    ? Number(scanStart.resumeSchemaVersionExpected)
    : SCAN_RESUME_SCHEMA_VERSION;
  options.scanResumeSchemaVersion = Number.isFinite(Number(scanStart.resumeSchemaVersion))
    ? Number(scanStart.resumeSchemaVersion)
    : null;
  options.scanResumeSchemaVersionValidated = Boolean(scanStart.resumeSchemaVersionValidated);
  options.scanResumeSchemaVersionMismatch = Boolean(scanStart.resumeSchemaVersionMismatch);
  options.scanResumeSchemaVersionMismatchBehavior =
    toText(scanStart.resumeSchemaVersionMismatchBehavior).toLowerCase() === "error" ? "error" : "restart";
  options.scanResumeFilterValidated = Boolean(scanStart.resumeFilterValidated);
  options.scanResumeFilterMismatch = Boolean(scanStart.resumeFilterMismatch);
  options.scanResumeFilterMismatchBehavior =
    toText(scanStart.resumeFilterMismatchBehavior).toLowerCase() === "error" ? "error" : "restart";
  options.scanResumeFilterMismatchFields = Array.isArray(scanStart.resumeFilterMismatchFields)
    ? scanStart.resumeFilterMismatchFields
    : [];

  const listed = await listSchedules(options);
  const dedupePlan = buildDuplicatePlan(listed.filtered, {
    keep: options.dedupeKeep,
    signatureMode: options.signatureMode
  });
  const selectedSchedules = options.duplicatesOnly ? dedupePlan.duplicateItems : listed.filtered;
  const summary = {
    runId: randomUUID(),
    startedAt: startedAtIso,
    generatedAt: new Date().toISOString(),
    ok: true,
    action: options.action,
    activeOnly: options.activeOnly,
    apply: options.apply,
    apiBaseUrl: options.apiBaseUrl,
    fetched: listed.all.length,
    matched: selectedSchedules.length,
    authMode: auth.authMode,
    filters: {
      jobType: options.jobType || null,
      nameContains: options.nameContains || null,
      intervalLte: options.intervalLte > 0 ? options.intervalLte : null,
      scanAll: options.scanAll,
      scanMaxPages: options.scanMaxPages,
      scanHardMaxPages: options.scanHardMaxPages,
      scanAutoContinue: options.scanAutoContinue,
      scanAutoContinueMaxSegments: options.scanAutoContinueMaxSegments,
      scanStartCursorCreatedAt: options.scanStartCursor?.createdAt || null,
      scanStartCursorId: options.scanStartCursor?.id || null,
      scanResumeFile: options.scanResumeResolvedFile || options.scanResumeFile || null,
      scanResumeSource: options.scanResumeSource || "none",
      scanResumeFromCheckpoint: options.scanResumeFromCheckpoint,
      scanResumeValidateApiBase: options.scanResumeValidateApiBase,
      scanResumeRequireApiBase: options.scanResumeRequireApiBase,
      scanResumeApiBaseRequired: options.scanResumeApiBaseRequired,
      scanResumeApiBaseValidated: options.scanResumeApiBaseValidated,
      scanResumeValidateKind: options.scanResumeValidateKind,
      scanResumeKindValidated: options.scanResumeKindValidated,
      scanResumeValidateSchemaVersion: options.scanResumeValidateSchemaVersion,
      scanResumeSchemaVersionValidated: options.scanResumeSchemaVersionValidated,
      scanResumeValidateFilters: options.scanResumeValidateFilters,
      scanResumeFilterValidated: options.scanResumeFilterValidated,
      scanResumeApiBaseMismatchBehavior:
        toText(options.scanResumeApiBaseMismatchBehavior).toLowerCase() === "restart" ? "restart" : "error",
      scanResumeApiBaseMissingBehavior:
        toText(options.scanResumeApiBaseMissingBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeKindMismatchBehavior:
        toText(options.scanResumeKindMismatchBehavior).toLowerCase() === "restart" ? "restart" : "error",
      scanResumeSchemaVersionMismatchBehavior:
        toText(options.scanResumeSchemaVersionMismatchBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeFilterMismatchBehavior:
        toText(options.scanResumeFilterMismatchBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeApiBaseUrl: options.scanResumeApiBaseUrl || null,
      scanResumeApiBaseMissing: options.scanResumeApiBaseMissing,
      scanResumeApiBaseMismatch: options.scanResumeApiBaseMismatch,
      scanResumeKind: options.scanResumeKind || null,
      scanResumeKindMismatch: options.scanResumeKindMismatch,
      scanResumeSchemaVersionExpected:
        Number.isFinite(Number(options.scanResumeSchemaVersionExpected))
          ? Number(options.scanResumeSchemaVersionExpected)
          : SCAN_RESUME_SCHEMA_VERSION,
      scanResumeSchemaVersion:
        Number.isFinite(Number(options.scanResumeSchemaVersion)) ? Number(options.scanResumeSchemaVersion) : null,
      scanResumeSchemaVersionMismatch: options.scanResumeSchemaVersionMismatch,
      scanResumeFilterMismatch: options.scanResumeFilterMismatch,
      scanResumeFilterMismatchFields: Array.isArray(options.scanResumeFilterMismatchFields)
        ? options.scanResumeFilterMismatchFields
        : [],
      scanResumeGeneratedAtSourcePolicy: normalizeResumeGeneratedAtSource(
        options.scanResumeGeneratedAtSourcePolicy || options.scanResumeGeneratedAtSource
      ),
      scanResumeGeneratedAtSource: normalizeResolvedResumeGeneratedAtSource(options.scanResumeGeneratedAtSourceResolved),
      scanResumeMaxBytes: options.scanResumeMaxBytes > 0 ? options.scanResumeMaxBytes : null,
      scanResumeSizeBehavior:
        toText(options.scanResumeSizeBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeOversized: Boolean(options.scanResumeOversized),
      scanResumeSizeBytes: Number.isFinite(Number(options.scanResumeSizeBytes)) ? Number(options.scanResumeSizeBytes) : null,
      scanResumeSizeLimitBytes:
        Number.isFinite(Number(options.scanResumeSizeLimitBytes))
          ? Number(options.scanResumeSizeLimitBytes)
          : options.scanResumeMaxBytes > 0
            ? options.scanResumeMaxBytes
            : null,
      scanResumeSha256: normalizeSha256(options.scanResumeHashExpected || options.scanResumeSha256) || null,
      scanResumeHashBehavior:
        toText(options.scanResumeHashBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeHashActual: normalizeSha256(options.scanResumeHashActual) || null,
      scanResumeHashMismatch: Boolean(options.scanResumeHashMismatch),
      scanResumeMaxAgeMinutes: options.scanResumeMaxAgeMinutes > 0 ? options.scanResumeMaxAgeMinutes : null,
      scanResumeMaxFutureMinutes: options.scanResumeMaxFutureMinutes > 0 ? options.scanResumeMaxFutureMinutes : null,
      scanResumeStaleBehavior: toText(options.scanResumeStaleBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeFutureBehavior:
        toText(options.scanResumeFutureBehavior).toLowerCase() === "error" ? "error" : "restart",
      scanResumeStale: options.scanResumeStale,
      scanResumeStaleReason: options.scanResumeStaleReason || null,
      scanResumeFuture: options.scanResumeFuture,
      scanResumeFutureMinutes:
        Number.isFinite(Number(options.scanResumeFutureMinutes)) ? Number(options.scanResumeFutureMinutes) : null,
      scanResumeAgeMinutes:
        Number.isFinite(Number(options.scanResumeAgeMinutes)) ? Number(options.scanResumeAgeMinutes) : null,
      scanResumeGeneratedAt: options.scanResumeGeneratedAt || null,
      scanResumeAllowExhausted: options.scanResumeAllowExhausted,
      scanResumeExhaustedBehavior:
        toText(options.scanResumeExhaustedBehavior).toLowerCase() === "restart" ? "restart" : "noop",
      scanResumeExhausted: options.scanResumeExhausted,
      scanCheckpointFile: options.scanCheckpointResolvedFile || options.scanCheckpointFile || null,
      scanCheckpointEveryPages: options.scanCheckpointEveryPages,
      listRetryCount: options.listRetryCount,
      listRetryDelayMs: options.listRetryDelayMs,
      listRetryBackoffFactor: options.listRetryBackoffFactor,
      listRetryJitterMs: options.listRetryJitterMs,
      listRequestTimeoutMs: options.listRequestTimeoutMs,
      duplicatesOnly: options.duplicatesOnly,
      dedupeKeep: options.dedupeKeep,
      signatureMode: options.signatureMode,
      maxPause: options.maxPause > 0 ? options.maxPause : null,
      forcePauseOverLimit: options.forcePauseOverLimit,
      pauseBatchSize: options.pauseBatchSize,
      pauseBatchDelayMs: options.pauseBatchDelayMs,
      continueOnPauseError: options.continueOnPauseError,
      pauseRetryCount: options.pauseRetryCount,
      pauseRetryDelayMs: options.pauseRetryDelayMs,
      pauseRetryBackoffFactor: options.pauseRetryBackoffFactor,
      pauseRetryJitterMs: options.pauseRetryJitterMs,
      pauseRequestTimeoutMs: options.pauseRequestTimeoutMs,
      outputFile: options.outputFile || null,
      outputCompact: options.outputCompact,
      outputTimestamp: options.outputTimestamp,
      outputOverwrite: options.outputOverwrite,
      redactSignatures: options.redactSignatures,
      minAgeMinutes: options.minAgeMinutes > 0 ? options.minAgeMinutes : null
    },
    duplicates: {
      groups: dedupePlan.duplicateGroups.length,
      schedules: dedupePlan.duplicateItems.length,
      pauseCandidates: dedupePlan.pauseCandidates.length,
      signatureMode: options.signatureMode,
      signaturesRedacted: options.redactSignatures
    },
    paging: listed.paging,
    schedules: selectedSchedules.map((item) => ({
      id: item.id,
      name: item.name,
      isActive: item.isActive,
      scheduleKind: item.scheduleKind,
      intervalMinutes: item.intervalMinutes,
      cronExpr: item.cronExpr,
      timezone: item.timezone,
      targetJobType: item.targetJobType,
      maxAttempts: item.maxAttempts,
      nextRunAt: item.nextRunAt,
      signature: maybeRedactSignature(dedupePlan.signatureMap.get(item.id), options)
    }))
  };

  if (options.duplicatesOnly) {
    summary.matchedFromBaseFilter = listed.filtered.length;
    summary.duplicateGroups = mapDuplicateGroupsForSummary(dedupePlan.duplicateGroups, options);
  }

  if (options.action === "pause") {
    const pauseTargets = options.duplicatesOnly ? dedupePlan.pauseCandidates : selectedSchedules;
    const guardrail = buildPauseGuardrail(options, pauseTargets.length);
    summary.pauseGuardrail = guardrail;
    if (guardrail.blocked) {
      summary.ok = false;
      summary.pause = {
        attempted: pauseTargets.length,
        apply: options.apply,
        blockedByGuardrail: true,
        message:
          "Pause guardrail exceeded. Increase --max-pause or set --force-pause-over-limit=true when intentional.",
        duplicatesOnly: options.duplicatesOnly,
        pauseRetryCount: options.pauseRetryCount,
        pauseRetryDelayMs: options.pauseRetryDelayMs,
        pauseRetryBackoffFactor: options.pauseRetryBackoffFactor,
        pauseRetryJitterMs: options.pauseRetryJitterMs,
        pauseRequestTimeoutMs: options.pauseRequestTimeoutMs
      };
    } else {
      const paused = await pauseSchedules(options, pauseTargets);
      const failed = paused.failures.length;
      summary.pause = {
        attempted: pauseTargets.length,
        apply: options.apply,
        updated: paused.results.filter((item) => item.ok === true && item.skipped !== true).length,
        skippedDryRun: paused.results.filter((item) => item.reason === "dry_run").length,
        skippedAlreadyInactive: paused.results.filter((item) => item.reason === "already_inactive").length,
        failed,
        failures: paused.failures,
        duplicatesOnly: options.duplicatesOnly,
      pauseBatchSize: options.pauseBatchSize,
      pauseBatchDelayMs: options.pauseBatchDelayMs,
      continueOnPauseError: options.continueOnPauseError,
      pauseRetryCount: options.pauseRetryCount,
      pauseRetryDelayMs: options.pauseRetryDelayMs,
      pauseRetryBackoffFactor: options.pauseRetryBackoffFactor,
      pauseRetryJitterMs: options.pauseRetryJitterMs,
      pauseRequestTimeoutMs: options.pauseRequestTimeoutMs,
      haltedOnFailure: paused.halted,
      batches: paused.batches,
      retry: paused.retry
    };
      if (failed > 0) {
        summary.ok = false;
      }
    }
  }

  summary.durationMs = Math.max(0, Date.now() - startedAtMs);
  summary.generatedAt = new Date().toISOString();
  summary.outputFile = resolveOutputPath(options) || null;
  summary.scanCheckpointFile = options.scanCheckpointResolvedFile || null;
  await writeSummaryOutputIfConfigured(options, summary);

  if (!summary.ok) {
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error.message
      },
      null,
      2
    )
  );
  process.exit(1);
});
