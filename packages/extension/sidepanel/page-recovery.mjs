function toText(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

export function dedupeUrls(urls = []) {
  const list = Array.isArray(urls) ? urls : [];
  const seen = new Set();
  const output = [];
  for (const item of list) {
    const value = toText(item);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    output.push(value);
  }
  return output;
}

export function parseSeedList(raw) {
  return dedupeUrls(
    String(raw || "")
      .split(/[\r\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function resolveStep(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.max(1, fallback);
  const normalized = Math.floor(Math.abs(parsed));
  return normalized > 0 ? normalized : Math.max(1, fallback);
}

function resolvePadding(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(12, Math.floor(parsed)));
}

function formatIndexValue(numberValue, padding) {
  const sign = numberValue < 0 ? "-" : "";
  const body = String(Math.abs(Number(numberValue || 0))).padStart(padding, "0");
  return `${sign}${body}`;
}

function replaceToken(template, token, value) {
  return String(template || "").split(token).join(String(value));
}

export function generateRangeUrls({
  template = "",
  start = 1,
  end = 1,
  step = 1,
  padding = 0,
  maxCount = 10_000
} = {}) {
  const pattern = String(template || "");
  if (!pattern.includes("{n}")) {
    throw new Error("Range template must include {n}");
  }

  const limit = Math.max(1, Math.min(50_000, Number(maxCount || 10_000)));
  const first = Math.floor(Number(start || 0));
  const last = Math.floor(Number(end || 0));
  const increment = resolveStep(step, 1);
  const pad = resolvePadding(padding);
  const ascending = first <= last;

  const output = [];
  if (ascending) {
    for (let current = first; current <= last && output.length < limit; current += increment) {
      output.push(replaceToken(pattern, "{n}", formatIndexValue(current, pad)));
    }
  } else {
    for (let current = first; current >= last && output.length < limit; current -= increment) {
      output.push(replaceToken(pattern, "{n}", formatIndexValue(current, pad)));
    }
  }

  return dedupeUrls(output);
}

export function generateSeedUrls({
  template = "",
  seeds = [],
  maxCount = 10_000
} = {}) {
  const pattern = String(template || "");
  if (!pattern.includes("{seed}")) {
    throw new Error("Seed template must include {seed}");
  }
  const limit = Math.max(1, Math.min(50_000, Number(maxCount || 10_000)));
  const normalizedSeeds = Array.isArray(seeds) ? seeds : [];

  const output = [];
  for (const item of normalizedSeeds) {
    if (output.length >= limit) break;
    const seed = toText(item);
    if (!seed) continue;
    output.push(replaceToken(pattern, "{seed}", encodeURIComponent(seed)));
  }
  return dedupeUrls(output);
}

export function generatePatternUrls({
  template = "",
  seeds = [],
  start = 1,
  end = 1,
  step = 1,
  padding = 0,
  maxCount = 10_000
} = {}) {
  const pattern = String(template || "");
  const hasSeed = pattern.includes("{seed}");
  const hasNumber = pattern.includes("{n}");
  if (!hasSeed && !hasNumber) {
    throw new Error("Pattern template must include {seed} and/or {n}");
  }

  const limit = Math.max(1, Math.min(50_000, Number(maxCount || 10_000)));
  const rangeValues = hasNumber
    ? generateRangeUrls({
        template: "{n}",
        start,
        end,
        step,
        padding,
        maxCount: limit
      })
    : ["0"];
  const seedValues = hasSeed ? parseSeedList(Array.isArray(seeds) ? seeds.join("\n") : String(seeds || "")) : [""];

  const output = [];
  for (const seed of seedValues) {
    for (const nValue of rangeValues) {
      if (output.length >= limit) break;
      let next = pattern;
      if (hasSeed) next = replaceToken(next, "{seed}", encodeURIComponent(seed));
      if (hasNumber) next = replaceToken(next, "{n}", nValue);
      output.push(next);
    }
    if (output.length >= limit) break;
  }

  return dedupeUrls(output);
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function buildFailureReportEntries(summary = {}) {
  const source = asObject(summary);
  const failures = asArray(source.failures)
    .map((item) => asObject(item))
    .filter((item) => toText(item.url || item.targetUrl));

  if (failures.length > 0) {
    return failures.map((item) => ({
      url: toText(item.url || item.targetUrl),
      error: toText(item.error || item.message || "Extraction failed"),
      code: toText(item.code || ""),
      attempts: Number(item.attempts || 0) || null
    }));
  }

  const failedUrls = dedupeUrls(source.failedUrls || []);
  return failedUrls.map((url) => ({
    url,
    error: "Extraction failed",
    code: "",
    attempts: null
  }));
}

export function resolveRetryFailedUrls(summary = {}) {
  const entries = buildFailureReportEntries(summary);
  return dedupeUrls(entries.map((item) => item.url));
}

export function resolveResumeUrls(summary = {}) {
  const source = asObject(summary);
  const checkpoint = asObject(source.checkpoint);
  const unresolved = dedupeUrls(checkpoint.unresolvedUrls || checkpoint.remainingUrls || []);
  if (unresolved.length > 0) return unresolved;
  return resolveRetryFailedUrls(summary);
}

function escapeCsv(value) {
  const text = String(value === undefined || value === null ? "" : value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export function buildFailureReportCsv(entries = []) {
  const rows = Array.isArray(entries) ? entries : [];
  const lines = ["url,error,code,attempts"];
  for (const entry of rows) {
    lines.push(
      [
        escapeCsv(entry.url),
        escapeCsv(entry.error),
        escapeCsv(entry.code),
        escapeCsv(entry.attempts === null || entry.attempts === undefined ? "" : String(entry.attempts))
      ].join(",")
    );
  }
  return lines.join("\n");
}
