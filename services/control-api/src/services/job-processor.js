"use strict";

const { getIntegrationSecretPlaintext } = require("./integration-vault");

const SUPPORTED_JOB_TYPES = Object.freeze(["integration.webhook.deliver", "extraction.page.summary"]);

function createJobError(message, { code = "JOB_EXECUTION_FAILED", retryable = true } = {}) {
  const error = new Error(message);
  error.code = code;
  error.retryable = retryable;
  return error;
}

function clampTimeoutMs(input) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return 10_000;
  return Math.max(1_000, Math.min(60_000, Math.floor(parsed)));
}

function decodeHtmlEntities(input) {
  return String(input || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(input) {
  const source = String(input || "");
  return decodeHtmlEntities(
    source
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function textBetweenTags(html, tagName) {
  const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = String(html || "").match(regex);
  return match ? decodeHtmlEntities(String(match[1] || "").replace(/\s+/g, " ").trim()) : "";
}

function metaTagContent(html, key, by = "name") {
  const escapedKey = String(key || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const attr = by === "property" ? "property" : "name";
  const pattern = new RegExp(
    `<meta\\b[^>]*${attr}\\s*=\\s*["']${escapedKey}["'][^>]*content\\s*=\\s*["']([^"']*)["'][^>]*>`,
    "i"
  );
  const reversePattern = new RegExp(
    `<meta\\b[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*${attr}\\s*=\\s*["']${escapedKey}["'][^>]*>`,
    "i"
  );
  const match = String(html || "").match(pattern) || String(html || "").match(reversePattern);
  return match ? decodeHtmlEntities(String(match[1] || "").trim()) : "";
}

function parseCanonicalUrl(html) {
  const pattern = /<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']*)["'][^>]*>/i;
  const reversePattern = /<link\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*rel\s*=\s*["']canonical["'][^>]*>/i;
  const match = String(html || "").match(pattern) || String(html || "").match(reversePattern);
  return match ? String(match[1] || "").trim() : "";
}

function countTag(html, tagName) {
  const regex = new RegExp(`<${tagName}\\b`, "gi");
  const matches = String(html || "").match(regex);
  return Array.isArray(matches) ? matches.length : 0;
}

function parseLang(html) {
  const match = String(html || "").match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i);
  return match ? String(match[1] || "").trim() : "";
}

function isPrivateIpv4(hostname) {
  const parts = String(hostname || "")
    .split(".")
    .map((item) => Number(item));
  if (parts.length !== 4 || parts.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  return false;
}

function isBlockedHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  if (!host) return true;
  if (host === "localhost" || host === "::1" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".internal")) return true;
  if (isPrivateIpv4(host)) return true;
  return false;
}

function normalizePublicHttpUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    throw createJobError("targetUrl is required", {
      code: "INVALID_EXTRACTION_PAYLOAD",
      retryable: false
    });
  }

  let parsed = null;
  try {
    parsed = new URL(value);
  } catch (_error) {
    throw createJobError("targetUrl must be a valid URL", {
      code: "INVALID_EXTRACTION_PAYLOAD",
      retryable: false
    });
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    throw createJobError("targetUrl must use http/https", {
      code: "INVALID_EXTRACTION_PAYLOAD",
      retryable: false
    });
  }

  if (isBlockedHost(parsed.hostname)) {
    throw createJobError("targetUrl host is blocked by SSRF policy", {
      code: "BLOCKED_TARGET_HOST",
      retryable: false
    });
  }

  return parsed.href;
}

function parseExtractionOptions(payload) {
  const extract = payload && typeof payload.extract === "object" ? payload.extract : {};
  return {
    includeTitle: Boolean(extract.includeTitle !== false),
    includeMetaDescription: Boolean(extract.includeMetaDescription !== false),
    includeCanonical: Boolean(extract.includeCanonical !== false),
    includeWordCount: Boolean(extract.includeWordCount !== false),
    includeHeadings: Boolean(extract.includeHeadings !== false),
    includeLinks: Boolean(extract.includeLinks !== false),
    includeLang: Boolean(extract.includeLang !== false)
  };
}

function resolveTargetUrls(payload) {
  const list = [];
  if (Array.isArray(payload.targetUrls)) {
    for (const item of payload.targetUrls) {
      const text = String(item || "").trim();
      if (text) list.push(text);
    }
  }
  const single = String(payload.targetUrl || "").trim();
  if (single) list.push(single);

  const seen = new Set();
  const deduped = [];
  for (const item of list) {
    const normalized = normalizePublicHttpUrl(item);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(normalized);
  }

  if (deduped.length === 0) {
    throw createJobError("targetUrl or targetUrls is required", {
      code: "INVALID_EXTRACTION_PAYLOAD",
      retryable: false
    });
  }

  const maxUrlsRaw = Number(payload.maxUrls);
  const maxUrls = Number.isFinite(maxUrlsRaw) ? Math.max(1, Math.min(10, Math.floor(maxUrlsRaw))) : 1;
  return deduped.slice(0, maxUrls);
}

async function fetchWithRedirectPolicy(targetUrl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const maxRedirects = 5;
  const baseHeaders = {
    "user-agent": "datascrap-jobs-worker/0.1",
    accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.5"
  };

  try {
    let currentUrl = targetUrl;
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        headers: baseHeaders,
        signal: controller.signal
      });

      const status = Number(response.status || 0);
      const isRedirect = status >= 300 && status < 400;
      if (!isRedirect) {
        return response;
      }

      const location = String(response.headers.get("location") || "").trim();
      if (!location) {
        throw createJobError("Redirect missing location header", {
          code: "EXTRACTION_REDIRECT_ERROR",
          retryable: false
        });
      }
      const nextUrl = new URL(location, currentUrl).href;
      normalizePublicHttpUrl(nextUrl);
      currentUrl = nextUrl;
    }

    throw createJobError("Too many redirects", {
      code: "EXTRACTION_TOO_MANY_REDIRECTS",
      retryable: false
    });
  } catch (error) {
    if (error?.code) throw error;
    const isAbort = error && (error.name === "AbortError" || /aborted/i.test(String(error.message || "")));
    throw createJobError(isAbort ? "Extraction request timed out" : `Extraction request failed: ${error.message}`, {
      code: isAbort ? "EXTRACTION_TIMEOUT" : "EXTRACTION_NETWORK_ERROR",
      retryable: true
    });
  } finally {
    clearTimeout(timer);
  }
}

function buildExtractionSummary({ html, response, targetUrl, options }) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const safeHtml = String(html || "").slice(0, 400_000);
  const text = stripHtml(safeHtml);
  const words = text ? text.split(/\s+/).filter(Boolean) : [];

  const summary = {
    targetUrl,
    finalUrl: response.url || targetUrl,
    fetchedAt: new Date().toISOString(),
    statusCode: Number(response.status || 0),
    contentType
  };

  if (options.includeTitle) {
    summary.title = textBetweenTags(safeHtml, "title");
  }
  if (options.includeMetaDescription) {
    summary.metaDescription =
      metaTagContent(safeHtml, "description", "name") || metaTagContent(safeHtml, "og:description", "property");
  }
  if (options.includeCanonical) {
    summary.canonicalUrl = parseCanonicalUrl(safeHtml);
  }
  if (options.includeWordCount) {
    summary.wordCount = words.length;
    summary.charCount = text.length;
  }
  if (options.includeHeadings) {
    summary.headingCounts = {
      h1: countTag(safeHtml, "h1"),
      h2: countTag(safeHtml, "h2"),
      h3: countTag(safeHtml, "h3")
    };
  }
  if (options.includeLinks) {
    summary.linkCount = countTag(safeHtml, "a");
  }
  if (options.includeLang) {
    summary.lang = parseLang(safeHtml);
  }

  return summary;
}

async function executeWebhookDelivery(job) {
  const payload = job.payload || {};
  const targetUrl = String(payload.targetUrl || "").trim();
  const eventType = String(payload.eventType || "").trim();
  const eventId = payload.eventId ? String(payload.eventId).trim() : job.id;

  if (!targetUrl || !eventType) {
    throw createJobError("Invalid webhook job payload", {
      code: "INVALID_WEBHOOK_PAYLOAD",
      retryable: false
    });
  }

  const headers = {
    "content-type": "application/json",
    "x-datascrap-job-id": job.id
  };

  if (payload.secretRef && typeof payload.secretRef === "object") {
    const provider = String(payload.secretRef.provider || "").trim().toLowerCase();
    const secretName = String(payload.secretRef.secretName || "").trim().toLowerCase();
    if (provider && secretName) {
      const secret = await getIntegrationSecretPlaintext({
        accountId: job.accountId,
        provider,
        secretName
      });
      headers.authorization = `Bearer ${secret}`;
    }
  }

  const requestBody = {
    eventType,
    eventId,
    accountId: job.accountId,
    metadata: payload.metadata || {},
    emittedAt: new Date().toISOString()
  };

  const controller = new AbortController();
  const timeoutMs = clampTimeoutMs(payload.timeoutMs);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response = null;
  let responseText = "";

  try {
    response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    responseText = await response.text();
  } catch (error) {
    const isAbort = error && (error.name === "AbortError" || /aborted/i.test(String(error.message || "")));
    throw createJobError(isAbort ? "Webhook delivery timed out" : `Webhook delivery failed: ${error.message}`, {
      code: isAbort ? "WEBHOOK_TIMEOUT" : "WEBHOOK_NETWORK_ERROR",
      retryable: true
    });
  } finally {
    clearTimeout(timer);
  }

  if (response.status >= 200 && response.status < 300) {
    return {
      delivered: true,
      statusCode: response.status,
      responseText: responseText.slice(0, 2_000)
    };
  }

  const retryableStatus = response.status === 429 || response.status >= 500;
  throw createJobError(`Webhook endpoint responded with ${response.status}`, {
    code: `WEBHOOK_HTTP_${response.status}`,
    retryable: retryableStatus
  });
}

async function executeExtractionPageSummary(job) {
  const payload = job.payload || {};
  const options = parseExtractionOptions(payload);
  const timeoutMs = clampTimeoutMs(payload?.request?.timeoutMs);
  const targetUrls = resolveTargetUrls(payload);

  const summaries = [];
  const failed = [];

  for (const targetUrl of targetUrls) {
    try {
      const response = await fetchWithRedirectPolicy(targetUrl, timeoutMs);
      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      const body = contentType.includes("text/")
        ? await response.text()
        : "";
      summaries.push(
        buildExtractionSummary({
          html: body,
          response,
          targetUrl,
          options
        })
      );
    } catch (error) {
      failed.push({
        targetUrl,
        code: error.code || "EXTRACTION_FAILED",
        message: error.message || "Extraction failed"
      });
    }
  }

  if (summaries.length === 0) {
    const primary = failed[0] || {};
    throw createJobError(primary.message || "Extraction summary failed", {
      code: primary.code || "EXTRACTION_FAILED",
      retryable: primary.code === "EXTRACTION_TIMEOUT" || primary.code === "EXTRACTION_NETWORK_ERROR"
    });
  }

  return {
    ok: true,
    jobType: "extraction.page.summary",
    processedCount: summaries.length,
    failedCount: failed.length,
    summaries,
    failures: failed.slice(0, 10)
  };
}

async function executeJob(job) {
  switch (job.jobType) {
    case "integration.webhook.deliver":
      return executeWebhookDelivery(job);
    case "extraction.page.summary":
      return executeExtractionPageSummary(job);
    default:
      throw createJobError(`Unsupported job type: ${job.jobType}`, {
        code: "UNSUPPORTED_JOB_TYPE",
        retryable: false
      });
  }
}

module.exports = {
  SUPPORTED_JOB_TYPES,
  executeJob
};
