const EXTRACT_VERBS = ["extract", "scrape", "collect", "gather", "run", "get", "find", "pull", "grab"];
const MAPS_HINTS = ["google maps", "maps", "map pack", "local pack", "near me"];
const LOCAL_LEAD_HINTS = [
  "home service",
  "home services",
  "contractor",
  "plumber",
  "electrician",
  "roofer",
  "hvac",
  "landscaper",
  "cleaning service",
  "repair service"
];
const EMAIL_HINTS = ["email", "emails", "mailbox", "contact email"];
const PHONE_HINTS = ["phone", "phones", "call", "contact number"];
const TEXT_HINTS = ["text", "article", "content", "copy", "headline"];
const METADATA_HINTS = ["metadata", "json-ld", "schema", "meta tag"];
const EXHAUSTIVE_HINTS = [
  "until no more",
  "keep going",
  "extract all",
  "all in this search",
  "full results",
  "whole website",
  "entire website",
  "all pages"
];
const ACCESS_HINTS = ["permission", "access", "enable all access", "allow all access"];
const EXPORT_HINTS = ["export", "download", "save as", "sheet", "xlsx", "json", "csv"];
const RESULT_TARGET_MAX = 50000;
const DATA_INTENT_HINTS = [
  "info",
  "information",
  "data",
  "result",
  "results",
  "lead",
  "leads",
  "company",
  "companies",
  "business",
  "businesses",
  "search"
];

function hasAnyHint(lowerText, hints) {
  const text = String(lowerText || "");
  return hints.some((hint) => text.includes(hint));
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractFirstUrl(text) {
  const source = String(text || "");
  const match = source.match(/https?:\/\/[^\s)"'<>]+/i);
  return match ? String(match[0] || "").trim() : "";
}

function parseExportFormat(lowerText) {
  const lower = String(lowerText || "");
  if (lower.includes("xlsx") || lower.includes("excel")) return "xlsx";
  if (lower.includes("json")) return "json";
  return "csv";
}

function normalizeResultTarget(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(RESULT_TARGET_MAX, Math.floor(parsed)));
}

function parseResultTarget(rawText, lowerText) {
  const raw = String(rawText || "");
  const lower = String(lowerText || "");
  if (!raw || !lower) return 0;

  const byResultWords = raw.match(/\b(\d{1,5})\s*\+?\s*(?:results?|rows?|records?|items?|leads?|companies|businesses)\b/i);
  if (byResultWords?.[1]) {
    return normalizeResultTarget(byResultWords[1]);
  }

  const byTopFirst = raw.match(/\b(?:top|first)\s+(\d{1,5})\b/i);
  if (byTopFirst?.[1]) {
    return normalizeResultTarget(byTopFirst[1]);
  }

  return 0;
}

function stripLeadingInstruction(text) {
  const value = normalizeWhitespace(text);
  if (!value) return "";
  let stripped = value;
  stripped = stripped.replace(/^(please|can you|could you|would you)\s+/i, "").trim();
  stripped = stripped.replace(/^(show|give|find|get)\s+me\b/i, "").trim();
  stripped = stripped.replace(/^i\s+(want|need|would like)\s+/i, "").trim();
  stripped = stripped.replace(/^looking\s+for\s+/i, "").trim();
  stripped = stripped.replace(/^(info|information|data)\s+(for|of|on|about)\s+/i, "").trim();
  for (const verb of EXTRACT_VERBS) {
    const expression = new RegExp(`^${verb}\\b`, "i");
    if (expression.test(stripped)) {
      stripped = stripped.replace(expression, "").trim();
      break;
    }
  }
  stripped = stripped.replace(/^(all|everything|results)\b/i, "").trim();
  stripped = stripped.replace(/^(from|for|about|on)\b/i, "").trim();
  return normalizeWhitespace(stripped);
}

function extractIntentQuery(rawText, lowerText, explicitUrl) {
  if (explicitUrl) return "";
  const raw = normalizeWhitespace(rawText);
  if (!raw) return "";

  const byFor = raw.match(/\b(?:for|about|on)\s+(.+)$/i);
  if (byFor?.[1]) {
    return normalizeWhitespace(byFor[1]);
  }

  if (lowerText.includes("search")) {
    const afterSearch = raw.replace(/^.*?\bsearch\b\s*/i, "");
    return stripLeadingInstruction(afterSearch);
  }

  return stripLeadingInstruction(raw);
}

function isMapsUrl(value) {
  const lower = String(value || "").trim().toLowerCase();
  return lower.includes("google.com/maps") || lower.includes("maps.google.");
}

function encodeSearchPath(query) {
  return encodeURIComponent(normalizeWhitespace(query)).replace(/%20/g, "+");
}

export const ORCHESTRATION_STRATEGIES = Object.freeze({
  ACCESS_ONLY: "access_only",
  EXPORT_ONLY: "export_only",
  POINT_FOLLOW_GUIDED: "point_follow_guided",
  MAPS_AUTOPILOT: "maps_autopilot",
  PAGE_AUTOPILOT: "page_autopilot",
  LIST_AUTODETECT_AUTOPILOT: "list_autodetect_autopilot",
  IDLE: "idle"
});

export function parseAutonomousGoal(commandText) {
  const raw = normalizeWhitespace(commandText);
  const lower = raw.toLowerCase();
  const hasText = raw.length > 0;
  const explicitUrl = extractFirstUrl(raw);
  const intentQuery = extractIntentQuery(raw, lower, explicitUrl);
  const resultTarget = parseResultTarget(raw, lower);

  const wantsAccess = hasAnyHint(lower, ACCESS_HINTS);
  const wantsExport = hasAnyHint(lower, EXPORT_HINTS);
  const wantsPointFollow = lower.includes("point") && lower.includes("follow");
  const wantsMaps = hasAnyHint(lower, MAPS_HINTS);
  const wantsLocalLeads = hasAnyHint(lower, LOCAL_LEAD_HINTS);
  const wantsEmail = hasAnyHint(lower, EMAIL_HINTS);
  const wantsPhone = hasAnyHint(lower, PHONE_HINTS);
  const wantsText = hasAnyHint(lower, TEXT_HINTS);
  const wantsMetadata = hasAnyHint(lower, METADATA_HINTS);
  const wantsExhaustive = hasAnyHint(lower, EXHAUSTIVE_HINTS);
  const conversationalRequest = /\b(i\s+(want|need)|show me|give me|find me|looking for)\b/i.test(raw);
  const verbDrivenExtract = EXTRACT_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`, "i").test(lower));
  const hintedExtract = hasAnyHint(lower, DATA_INTENT_HINTS);
  const wantsExtract =
    verbDrivenExtract ||
    lower.includes("quick extract") ||
    (hasText &&
      !wantsAccess &&
      !wantsExport &&
      (conversationalRequest ||
        hintedExtract ||
        wantsMaps ||
        wantsLocalLeads ||
        wantsEmail ||
        wantsPhone ||
        wantsText ||
        wantsMetadata));
  const wantsFresh =
    lower.includes("fresh") ||
    /\bup[-\s]?to[-\s]?date\b/i.test(raw) ||
    lower.includes("latest") ||
    lower.includes("today") ||
    lower.includes("recent") ||
    lower.includes("newly");

  return {
    raw,
    lower,
    hasText,
    explicitUrl,
    intentQuery,
    wantsExtract,
    wantsAccess,
    wantsExport,
    wantsPointFollow,
    wantsMaps,
    wantsLocalLeads,
    wantsEmail,
    wantsPhone,
    wantsText,
    wantsMetadata,
    wantsExhaustive,
    wantsFresh,
    resultTarget,
    exportFormat: parseExportFormat(lower)
  };
}

export function buildAutonomousDiscoveryUrl(goal = {}) {
  const explicitUrl = String(goal.explicitUrl || "").trim();
  if (explicitUrl) return explicitUrl;
  const query = normalizeWhitespace(goal.intentQuery || "");
  if (!query) return "";

  if (goal.wantsMaps || goal.wantsLocalLeads) {
    return `https://www.google.com/maps/search/${encodeSearchPath(query)}`;
  }
  const freshFilter = goal.wantsFresh ? "&tbs=qdr:d" : "";
  return `https://www.google.com/search?q=${encodeSearchPath(query)}${freshFilter}`;
}

export function createAutonomousExecutionPlan({
  goal = {},
  startUrl = "",
  activeUrl = "",
  activeTool = "list",
  simpleMode = true
} = {}) {
  const currentStartUrl = String(startUrl || "").trim();
  const currentActiveUrl = String(activeUrl || "").trim();
  const discoveredUrl = buildAutonomousDiscoveryUrl(goal);
  const mapsIntent = Boolean(goal.wantsMaps || goal.wantsLocalLeads);
  const prioritizeDiscovery = mapsIntent || Boolean(goal.wantsFresh);
  const targetUrl = String(
    goal.explicitUrl || (prioritizeDiscovery ? discoveredUrl : "") || currentStartUrl || discoveredUrl || currentActiveUrl
  ).trim();
  const mapsMode = goal.wantsMaps || goal.wantsLocalLeads || isMapsUrl(targetUrl);
  const wantsPageRunner = Boolean(goal.wantsEmail || goal.wantsPhone || goal.wantsText || goal.wantsMetadata || mapsMode);
  const listModePreferred = !wantsPageRunner && (simpleMode || activeTool === "list");

  let strategy = ORCHESTRATION_STRATEGIES.IDLE;
  if (goal.wantsAccess && !goal.wantsExtract && !goal.wantsPointFollow && !goal.wantsExport) {
    strategy = ORCHESTRATION_STRATEGIES.ACCESS_ONLY;
  } else if (goal.wantsExport && !goal.wantsExtract) {
    strategy = ORCHESTRATION_STRATEGIES.EXPORT_ONLY;
  } else if (goal.wantsPointFollow) {
    strategy = ORCHESTRATION_STRATEGIES.POINT_FOLLOW_GUIDED;
  } else if (goal.wantsExtract) {
    if (mapsMode) {
      strategy = ORCHESTRATION_STRATEGIES.MAPS_AUTOPILOT;
    } else if (wantsPageRunner) {
      strategy = ORCHESTRATION_STRATEGIES.PAGE_AUTOPILOT;
    } else if (listModePreferred) {
      strategy = ORCHESTRATION_STRATEGIES.LIST_AUTODETECT_AUTOPILOT;
    }
  }

  const shouldNavigateActiveTab =
    (strategy === ORCHESTRATION_STRATEGIES.LIST_AUTODETECT_AUTOPILOT ||
      strategy === ORCHESTRATION_STRATEGIES.POINT_FOLLOW_GUIDED) &&
    Boolean(targetUrl) &&
    targetUrl !== currentActiveUrl;

  const phases = [
    {
      id: "intent_parse",
      label: "Understanding your request",
      progress: 8
    },
    {
      id: "target_discovery",
      label: "Resolving best target source",
      progress: 18
    },
    {
      id: "access_preflight",
      label: "Preparing browser access",
      progress: 30
    },
    {
      id: "strategy_selection",
      label: "Selecting best extraction strategy",
      progress: 42
    },
    {
      id: "automation_start",
      label: "Starting autonomous extraction",
      progress: 58
    },
    {
      id: "monitoring",
      label: "Collecting fresh results",
      progress: 84
    },
    {
      id: "export_finalize",
      label: "Finalizing export",
      progress: 96
    }
  ];

  return {
    goal,
    strategy,
    targetUrl,
    discoveredUrl,
    shouldNavigateActiveTab,
    mapsMode,
    wantsPageRunner,
    phases
  };
}

export function summarizeAutonomousPlan(plan = {}) {
  const strategy = String(plan.strategy || ORCHESTRATION_STRATEGIES.IDLE);
  const targetUrl = String(plan.targetUrl || "").trim();
  const segments = [`strategy=${strategy}`];
  if (targetUrl) {
    segments.push(`target=${targetUrl}`);
  }
  if (plan.shouldNavigateActiveTab) {
    segments.push("navigateActiveTab=true");
  }
  if (plan.mapsMode) {
    segments.push("mapsMode=true");
  }
  const resultTarget = Number(plan?.goal?.resultTarget || 0);
  if (Number.isFinite(resultTarget) && resultTarget > 0) {
    segments.push(`resultTarget=${resultTarget}`);
  }
  return segments.join(" | ");
}
