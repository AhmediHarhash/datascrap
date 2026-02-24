import { PAGE_ACTION_TYPES } from "../vendor/shared/src/events.mjs";
import { createAbortError } from "../vendor/core/src/utils.mjs";
import { createTab, delay, executeInTab, removeTab, updateTab, waitForTabComplete } from "./chrome-utils.mjs";

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

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

const BACKOFF_STRATEGIES = Object.freeze(["fixed", "linear", "exponential"]);
const JITTER_MODES = Object.freeze(["none", "bounded", "full"]);
const SESSION_REUSE_MODES = Object.freeze(["off", "sticky"]);

function normalizeEnum(value, allowedValues, fallback) {
  const normalized = String(value || "").trim().toLowerCase();
  return allowedValues.includes(normalized) ? normalized : fallback;
}

function normalizeUrls(config = {}) {
  const fromArray = Array.isArray(config.urls) ? config.urls : [];
  const cleaned = fromArray.map((item) => String(item || "").trim()).filter(Boolean);
  if (cleaned.length > 0) return cleaned;

  const single = String(config.startUrl || "").trim();
  if (single) return [single];
  return [];
}

function normalizeEmailOptions(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const domainFilters =
    Array.isArray(source.domainFilters)
      ? source.domainFilters
      : String(source.domainFilters || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
  return {
    deepScanEnabled: Boolean(source.deepScanEnabled),
    maxDepth: clamp(source.maxDepth, 1, 3, 1),
    maxLinksPerPage: clamp(source.maxLinksPerPage, 1, 60, 20),
    sameDomainOnly: Boolean(source.sameDomainOnly !== false),
    linkSelector: String(source.linkSelector || "").trim(),
    removeDuplicates: Boolean(source.removeDuplicates !== false),
    toLowerCase: Boolean(source.toLowerCase !== false),
    basicValidation: Boolean(source.basicValidation !== false),
    includeMailtoLinks: Boolean(source.includeMailtoLinks !== false),
    domainFilters
  };
}

function normalizePhoneOptions(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const phonePatterns = Array.isArray(source.phonePatterns)
    ? source.phonePatterns.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  return {
    removeDuplicates: Boolean(source.removeDuplicates !== false),
    basicValidation: Boolean(source.basicValidation !== false),
    phonePatterns
  };
}

function normalizeTextOptions(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return {
    includeMetadata: Boolean(source.includeMetadata !== false),
    maxContentChars: clamp(source.maxContentChars, 1000, 100_000, 12_000)
  };
}

function normalizeMapsOptions(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const requestedMaxResults = Number(source.maxResults);
  const maxResults = Number.isFinite(requestedMaxResults) ? clamp(requestedMaxResults, 0, 5000, 2000) : 2000;
  return {
    includeBasicInfo: Boolean(source.includeBasicInfo !== false),
    includeContactDetails: Boolean(source.includeContactDetails !== false),
    includeReviews: Boolean(source.includeReviews !== false),
    includeHours: Boolean(source.includeHours !== false),
    includeLocation: Boolean(source.includeLocation !== false),
    includeImages: Boolean(source.includeImages !== false),
    onlyNewResults: Boolean(source.onlyNewResults !== false),
    autoScrollResults: Boolean(source.autoScrollResults !== false),
    untilNoMore: Boolean(source.untilNoMore !== false),
    maxResults,
    maxScrollSteps: clamp(source.maxScrollSteps, 1, 500, 220),
    stabilityPasses: clamp(source.stabilityPasses, 2, 20, 8),
    scrollDelayMs: clamp(source.scrollDelayMs, 120, 3000, 650)
  };
}

function normalizeActionConfig(config = {}) {
  const actions = Array.isArray(config.actions) ? config.actions : [];
  const explicitActionType = String(config.pageActionType || "").trim().toUpperCase();
  const defaultType = explicitActionType || PAGE_ACTION_TYPES.EXTRACT_PAGES;
  const action = actions.find((item) => {
    const type = String(item?.type || "").trim().toUpperCase();
    return type.startsWith("EXTRACT_PAGES");
  });

  const actionType = String(action?.type || defaultType).trim().toUpperCase();
  const fields = Array.isArray(action?.fields) ? action.fields : [];
  return {
    actionType,
    fields,
    emailOptions: normalizeEmailOptions(action?.emailOptions || config.emailOptions),
    phoneOptions: normalizePhoneOptions(action?.phoneOptions || config.phoneOptions),
    textOptions: normalizeTextOptions(action?.textOptions || config.textOptions),
    mapsOptions: normalizeMapsOptions(action?.mapsOptions || config.mapsOptions)
  };
}

function normalizeReliabilityConfig(queue = {}) {
  const reliability = queue?.reliability && typeof queue.reliability === "object" ? queue.reliability : {};
  const profile = normalizeEnum(reliability.profile, ["conservative", "balanced", "aggressive", "custom"], "balanced");
  const defaults = RELIABILITY_PROFILES[profile] || RELIABILITY_PROFILES.balanced;
  const minRetryDelayMs = clamp(reliability.minRetryDelayMs, 0, 120_000, defaults.minRetryDelayMs);
  const maxRetryDelayMs = clamp(reliability.maxRetryDelayMs, minRetryDelayMs, 120_000, defaults.maxRetryDelayMs);
  return {
    profile,
    backoffStrategy: normalizeEnum(reliability.backoffStrategy, BACKOFF_STRATEGIES, defaults.backoffStrategy),
    jitterMode: normalizeEnum(reliability.jitterMode, JITTER_MODES, defaults.jitterMode),
    minRetryDelayMs,
    maxRetryDelayMs,
    sessionReuseMode: normalizeEnum(reliability.sessionReuseMode, SESSION_REUSE_MODES, defaults.sessionReuseMode)
  };
}

function normalizeQueueConfig(config = {}) {
  const queue = config.queue && typeof config.queue === "object" ? config.queue : {};
  const reliability = normalizeReliabilityConfig(queue);
  const retryDelayMs = clamp(queue.retryDelayMs, 0, 120_000, 1_200);
  return {
    maxConcurrentTabs: clamp(queue.maxConcurrentTabs, 1, 8, 3),
    delayBetweenRequestsMs: clamp(queue.delayBetweenRequestsMs, 0, 30_000, 400),
    pageTimeoutMs: clamp(queue.pageTimeoutMs, 2_000, 120_000, 25_000),
    maxRetries: clamp(queue.maxRetries, 0, 5, 1),
    retryDelayMs: Math.max(reliability.minRetryDelayMs, Math.min(retryDelayMs, reliability.maxRetryDelayMs)),
    jitterMs: clamp(queue.jitterMs, 0, 20_000, 220),
    reliability,
    waitForPageLoad: Boolean(queue.waitForPageLoad !== false),
    waitForSelector: String(queue.waitForSelector || "").trim(),
    waitForSelectorTimeoutMs: clamp(queue.waitForSelectorTimeoutMs, 200, 60_000, 4_000)
  };
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw createAbortError("Automation stopped");
  }
}

function randomJitter(maxJitterMs) {
  const max = Math.max(0, Number(maxJitterMs || 0));
  if (!max) return 0;
  return Math.floor(Math.random() * max);
}

function resolveJitterWindowMs(queue = {}) {
  const baseJitter = Math.max(0, Number(queue.jitterMs || 0));
  const jitterMode = String(queue?.reliability?.jitterMode || "none");
  if (jitterMode === "full") return baseJitter;
  if (jitterMode === "bounded") return Math.floor(baseJitter * 0.45);
  return 0;
}

function computeRetryDelayMs({ queue, retryAttempt, random = Math.random }) {
  const reliability = queue?.reliability || {};
  const strategy = String(reliability.backoffStrategy || "fixed");
  const minDelay = Math.max(0, Number(reliability.minRetryDelayMs || 0));
  const maxDelay = Math.max(minDelay, Number(reliability.maxRetryDelayMs || minDelay));
  const baseDelay = Math.max(0, Number(queue?.retryDelayMs || 0));
  const attempt = Math.max(1, Number(retryAttempt || 1));

  let scaledDelay = baseDelay;
  if (strategy === "linear") {
    scaledDelay = baseDelay * attempt;
  } else if (strategy === "exponential") {
    scaledDelay = baseDelay * 2 ** (attempt - 1);
  }

  const boundedDelay = Math.max(minDelay, Math.min(Math.floor(scaledDelay), maxDelay));
  const jitterWindow = resolveJitterWindowMs(queue);
  const randomValue = typeof random === "function" ? Number(random()) : Math.random();
  const clampedRandom = Number.isFinite(randomValue) ? Math.max(0, Math.min(1, randomValue)) : Math.random();
  const jitterOffset = jitterWindow > 0 ? Math.floor(clampedRandom * jitterWindow) : 0;
  const withJitter = boundedDelay + jitterOffset;
  return Math.max(minDelay, Math.min(withJitter, maxDelay));
}

function limitList(list, maxItems = 5000) {
  if (!Array.isArray(list)) return [];
  const limit = Math.max(1, Math.min(50_000, Number(maxItems || 5000)));
  return list.slice(0, limit);
}

function dedupeList(list) {
  const source = Array.isArray(list) ? list : [];
  const seen = new Set();
  const output = [];
  for (const item of source) {
    const value = String(item || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    output.push(value);
  }
  return output;
}

const MAPS_SEEN_STORAGE_PREFIX = "maps_seen_entities_v1";
const MAPS_SEEN_ENTITY_LIMIT = 50_000;

function mapScopeHash(input) {
  const text = String(input || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeMapsScopeUrl(urlValue) {
  const raw = String(urlValue || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!/\/maps\/search\//i.test(parsed.pathname)) {
      return "";
    }
    parsed.searchParams.delete("entry");
    parsed.searchParams.delete("g_ep");
    const normalizedPath = parsed.pathname.replace(/\/@[^/]+$/i, "").replace(/\/+$/g, "");
    return `${parsed.origin}${normalizedPath}${parsed.search || ""}`;
  } catch (_error) {
    return "";
  }
}

function buildMapsSeenStorageKey(scopeUrl) {
  const normalized = normalizeMapsScopeUrl(scopeUrl);
  if (!normalized) return "";
  return `${MAPS_SEEN_STORAGE_PREFIX}:${mapScopeHash(normalized)}`;
}

function mapStorageGet(chromeApi, key) {
  return new Promise((resolve) => {
    chromeApi.storage.local.get([key], (value) => {
      if (chromeApi.runtime?.lastError) {
        resolve(null);
        return;
      }
      resolve(value || null);
    });
  });
}

function mapStorageSet(chromeApi, value) {
  return new Promise((resolve) => {
    chromeApi.storage.local.set(value, () => {
      if (chromeApi.runtime?.lastError) {
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

async function loadMapsSeenEntities({ chromeApi, scopeUrl }) {
  const storageKey = buildMapsSeenStorageKey(scopeUrl);
  if (!storageKey || !chromeApi?.storage?.local?.get) {
    return {
      storageKey,
      entities: new Set()
    };
  }
  const payload = await mapStorageGet(chromeApi, storageKey);
  const list = Array.isArray(payload?.[storageKey]) ? payload[storageKey] : [];
  return {
    storageKey,
    entities: new Set(
      list.map((item) => String(item || "").trim()).filter(Boolean)
    )
  };
}

async function persistMapsSeenEntities({ chromeApi, storageKey, entities }) {
  if (!storageKey || !chromeApi?.storage?.local?.set) {
    return false;
  }
  const list = Array.from(entities)
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(-MAPS_SEEN_ENTITY_LIMIT);
  return mapStorageSet(chromeApi, {
    [storageKey]: list
  });
}

function normalizeMapEntityKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w:/?&.=+-]+/g, "_");
}

function buildMapsEntityKey(row = {}) {
  const mapUrl = String(row?.url || "").trim();
  if (mapUrl) {
    try {
      const parsed = new URL(mapUrl);
      const cid = String(parsed.searchParams.get("cid") || "").trim();
      if (cid) {
        return `cid:${normalizeMapEntityKey(cid)}`;
      }
      const pathname = String(parsed.pathname || "").trim();
      if (pathname) {
        return `path:${normalizeMapEntityKey(`${parsed.origin}${pathname}`)}`;
      }
    } catch (_error) {
      return `url:${normalizeMapEntityKey(mapUrl)}`;
    }
  }

  const name = normalizeMapEntityKey(row?.mapName);
  const address = normalizeMapEntityKey(row?.mapAddress);
  const phone = normalizeMapEntityKey(row?.mapPhone);
  if (name && address) return `name_addr:${name}|${address}`;
  if (name && phone) return `name_phone:${name}|${phone}`;
  if (name) return `name:${name}`;
  return "";
}

async function pageExtractInDom(input) {
  const PAGE_ACTION_TYPES = Object.freeze({
    EXTRACT_PAGES: "EXTRACT_PAGES",
    EXTRACT_PAGES_EMAIL: "EXTRACT_PAGES_EMAIL",
    EXTRACT_PAGES_PHONE: "EXTRACT_PAGES_PHONE",
    EXTRACT_PAGES_TEXT: "EXTRACT_PAGES_TEXT",
    EXTRACT_PAGES_GOOGLE_MAPS: "EXTRACT_PAGES_GOOGLE_MAPS"
  });

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function readFieldValue(field) {
    const selector = String(field?.selector || "").trim();
    if (!selector) return "";
    const element = document.querySelector(selector);
    if (!element) return "";

    const mode = String(field?.extractMode || "text").toLowerCase();
    if (mode === "link_url") {
      return element.href || element.getAttribute("href") || "";
    }
    if (mode === "image_url") {
      return element.src || element.getAttribute("src") || "";
    }
    if (mode === "attribute") {
      const attribute = String(field?.attribute || "").trim();
      if (!attribute) return "";
      return element.getAttribute(attribute) || "";
    }
    return cleanText(element.innerText || element.textContent || "");
  }

  function extractByFields(fields) {
    const row = {};
    for (let index = 0; index < fields.length; index += 1) {
      const field = fields[index];
      const name = String(field?.name || `field_${index + 1}`).trim() || `field_${index + 1}`;
      row[name] = readFieldValue(field);
    }
    return row;
  }

  function normalizeEmailCandidate(value, options) {
    let email = String(value || "").trim();
    email = email.replace(/^mailto:/i, "").replace(/[<>()\[\]{};,]+$/g, "").trim();
    if (options.toLowerCase) {
      email = email.toLowerCase();
    }
    if (!email) return "";
    if (options.basicValidation && !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
      return "";
    }
    if (options.domainFilters.length > 0) {
      const domain = email.split("@")[1] || "";
      const allowed = options.domainFilters.some((item) => domain.endsWith(String(item).toLowerCase()));
      if (!allowed) return "";
    }
    return email;
  }

  function extractEmailsFromText(text, options) {
    const matches = String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    const output = matches
      .map((item) => normalizeEmailCandidate(item, options))
      .filter(Boolean);
    return options.removeDuplicates ? Array.from(new Set(output)) : output;
  }

  function absoluteUrl(value, baseUrl) {
    try {
      const parsed = new URL(String(value || "").trim(), baseUrl);
      if (!/^https?:$/i.test(parsed.protocol)) return "";
      return parsed.href;
    } catch (_error) {
      return "";
    }
  }

  function collectLinksFromDocument(doc, baseUrl, options) {
    const nodes = Array.from(
      doc.querySelectorAll(options.linkSelector || "a[href]")
    );
    const links = [];
    const seen = new Set();
    for (const node of nodes) {
      const href = absoluteUrl(node.getAttribute("href"), baseUrl);
      if (!href || seen.has(href)) continue;
      if (options.sameDomainOnly) {
        try {
          const target = new URL(href);
          const base = new URL(baseUrl);
          if (target.host !== base.host) {
            continue;
          }
        } catch (_error) {
          continue;
        }
      }
      seen.add(href);
      links.push(href);
      if (links.length >= options.maxLinksPerPage) break;
    }
    return links;
  }

  async function deepScanEmails(options) {
    const visited = new Set([location.href]);
    const queue = collectLinksFromDocument(document, location.href, options).map((url) => ({
      url,
      depth: 1
    }));
    let scannedPages = 0;
    const collectedEmails = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || current.depth > options.maxDepth) continue;
      if (visited.has(current.url)) continue;
      visited.add(current.url);

      try {
        const response = await fetch(current.url, {
          credentials: "include"
        });
        if (!response.ok) continue;
        const contentType = String(response.headers.get("content-type") || "").toLowerCase();
        if (!contentType.includes("text/html")) continue;
        const html = await response.text();
        collectedEmails.push(...extractEmailsFromText(html, options));
        scannedPages += 1;

        if (current.depth < options.maxDepth) {
          const doc = new DOMParser().parseFromString(html, "text/html");
          const links = collectLinksFromDocument(doc, current.url, options);
          for (const link of links) {
            if (!visited.has(link)) {
              queue.push({
                url: link,
                depth: current.depth + 1
              });
            }
          }
        }
      } catch (_error) {
        continue;
      }
    }

    return {
      scannedPages,
      emails: options.removeDuplicates ? Array.from(new Set(collectedEmails)) : collectedEmails
    };
  }

  async function extractEmails(options) {
    const text = `${document.body?.innerText || ""}\n${document.documentElement?.innerText || ""}`;
    let emails = extractEmailsFromText(text, options);

    if (options.includeMailtoLinks) {
      const mailtoLinks = Array.from(document.querySelectorAll("a[href^='mailto:']"))
        .map((link) => normalizeEmailCandidate(link.getAttribute("href") || "", options))
        .filter(Boolean);
      emails = [...emails, ...mailtoLinks];
    }

    let deepScanEmailsResult = [];
    let deepScannedPages = 0;
    if (options.deepScanEnabled) {
      const deepResult = await deepScanEmails(options);
      deepScanEmailsResult = deepResult.emails;
      deepScannedPages = deepResult.scannedPages;
    }

    const merged = options.removeDuplicates
      ? Array.from(new Set([...emails, ...deepScanEmailsResult]))
      : [...emails, ...deepScanEmailsResult];

    const domains = Array.from(
      new Set(
        merged
          .map((email) => String(email).split("@")[1] || "")
          .filter(Boolean)
      )
    );

    return {
      emails: merged,
      emailCount: merged.length,
      emailDomains: domains,
      deepScannedPages
    };
  }

  function extractPhones(options) {
    const text = `${document.body?.innerText || ""}\n${document.documentElement?.innerText || ""}`;
    const baseMatches = text.match(/(?:\+?\d[\d\s().-]{6,}\d)/g) || [];
    const customMatches = [];

    for (const pattern of options.phonePatterns) {
      try {
        const regex = new RegExp(pattern, "g");
        const matches = text.match(regex) || [];
        customMatches.push(...matches);
      } catch (_error) {
        continue;
      }
    }

    const merged = [...baseMatches, ...customMatches]
      .map((item) => cleanText(item))
      .filter(Boolean)
      .filter((item) => {
        if (!options.basicValidation) return true;
        const digitCount = item.replace(/\D/g, "").length;
        return digitCount >= 7;
      });

    const phones = options.removeDuplicates ? Array.from(new Set(merged)) : merged;
    return {
      phones,
      phoneCount: phones.length
    };
  }

  function extractText(options) {
    const title = cleanText(document.querySelector("title")?.textContent || "");
    const description = cleanText(
      document.querySelector("meta[name='description']")?.getAttribute("content") || ""
    );
    const author = cleanText(
      document.querySelector("meta[name='author']")?.getAttribute("content") ||
        document.querySelector("[rel='author']")?.textContent ||
        ""
    );
    const publishDate = cleanText(
      document.querySelector("meta[property='article:published_time']")?.getAttribute("content") ||
        document.querySelector("time")?.getAttribute("datetime") ||
        ""
    );
    const mainContent = cleanText(
      document.querySelector("main")?.innerText ||
        document.querySelector("article")?.innerText ||
        document.body?.innerText ||
        ""
    );
    const words = mainContent ? mainContent.split(/\s+/).filter(Boolean).length : 0;
    const maxChars = Math.max(1000, Number(options.maxContentChars || 12000));
    const h1 = cleanText(document.querySelector("h1")?.textContent || "");
    const h2Count = document.querySelectorAll("h2").length;
    const paragraphCount = document.querySelectorAll("p").length;
    const canonicalUrl = cleanText(document.querySelector("link[rel='canonical']")?.getAttribute("href") || "");
    const lang = cleanText(document.documentElement?.getAttribute("lang") || "");

    return {
      title,
      description,
      author: options.includeMetadata ? author : "",
      publishDate: options.includeMetadata ? publishDate : "",
      canonicalUrl: options.includeMetadata ? canonicalUrl : "",
      lang: options.includeMetadata ? lang : "",
      h1,
      h2Count,
      paragraphCount,
      wordCount: words,
      excerpt: mainContent.slice(0, 280),
      content: mainContent.slice(0, maxChars)
    };
  }

  function parseMapCoordsFromUrl(urlValue) {
    const raw = String(urlValue || "");
    const match = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return {
        latitude: match[1],
        longitude: match[2]
      };
    }
    const placePattern = raw.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (placePattern) {
      return {
        latitude: placePattern[1],
        longitude: placePattern[2]
      };
    }
    return {
      latitude: "",
      longitude: ""
    };
  }

  function parseReviewCount(rawValue) {
    const text = cleanText(rawValue);
    const match = text.match(/([0-9][0-9,.]*)/);
    if (!match) return 0;
    const parsed = Number(match[1].replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeMapResultUrl(rawUrl) {
    const raw = String(rawUrl || "").trim();
    if (!raw) return "";
    const absolute = absoluteUrl(raw, location.href);
    if (!absolute) return "";
    try {
      const parsed = new URL(absolute);
      parsed.searchParams.delete("entry");
      parsed.searchParams.delete("g_ep");
      return parsed.toString();
    } catch (_error) {
      return absolute;
    }
  }

  function extractMapResultRowFromAnchor(anchorNode, options) {
    if (!(anchorNode instanceof HTMLElement)) return null;
    const normalizedUrl = normalizeMapResultUrl(anchorNode.href || anchorNode.getAttribute("href") || "");
    if (!normalizedUrl) return null;

    const card =
      anchorNode.closest("[role='article']") ||
      anchorNode.closest(".Nv2PK") ||
      anchorNode.closest("div[jsaction*='mouseover:pane']") ||
      anchorNode.parentElement;

    const headlineCandidate = cleanText(
      anchorNode.getAttribute("aria-label") ||
        anchorNode.querySelector?.("[aria-label]")?.getAttribute?.("aria-label") ||
        card?.querySelector?.(".qBF1Pd")?.textContent ||
        card?.querySelector?.(".fontHeadlineSmall")?.textContent ||
        anchorNode.textContent ||
        ""
    );
    const ratingAria = cleanText(
      card?.querySelector?.("[role='img'][aria-label*='star']")?.getAttribute?.("aria-label") ||
        card?.querySelector?.("[aria-label*='stars']")?.getAttribute?.("aria-label") ||
        ""
    );
    const ratingText = cleanText(ratingAria || card?.querySelector?.(".MW4etd")?.textContent || "");
    const cardText = cleanText(card?.textContent || "");

    const infoLine = cardText
      .split("\n")
      .map((line) => cleanText(line))
      .find((line) => line.includes("·"));
    const infoParts = String(infoLine || "")
      .split("·")
      .map((part) => cleanText(part))
      .filter(Boolean);
    const category = infoParts[0] || "";
    const address = infoParts.slice(1).join(" · ");
    const reviewMatch = cardText.match(/\(([0-9][0-9,.]*)\)/);
    const reviewsFromCard = reviewMatch ? Number(String(reviewMatch[1]).replace(/,/g, "")) : 0;

    const coords = parseMapCoordsFromUrl(normalizedUrl);
    return {
      url: normalizedUrl,
      mapName: options.includeBasicInfo ? headlineCandidate : "",
      mapRating: options.includeBasicInfo ? ratingText : "",
      mapCategory: options.includeBasicInfo ? category : "",
      mapAddress: options.includeLocation ? address : "",
      mapLatitude: options.includeLocation ? coords.latitude : "",
      mapLongitude: options.includeLocation ? coords.longitude : "",
      mapPhone: options.includeContactDetails ? "" : "",
      mapWebsite: options.includeContactDetails ? "" : "",
      mapHours: options.includeHours ? "" : "",
      mapReviewCount: options.includeReviews ? (Number.isFinite(reviewsFromCard) ? reviewsFromCard : 0) : 0,
      mapImageCount: options.includeImages ? Number(card?.querySelectorAll?.("img")?.length || 0) : 0
    };
  }

  function collectMapsResultRows(feedNode, options, rowsByUrl) {
    if (!(feedNode instanceof HTMLElement) || !(rowsByUrl instanceof Map)) return;
    const anchors = Array.from(feedNode.querySelectorAll("a[href*='/maps/place/']"));
    for (const anchor of anchors) {
      if (!(anchor instanceof HTMLElement)) continue;
      const row = extractMapResultRowFromAnchor(anchor, options);
      const rowUrl = String(row?.url || "").trim();
      if (!rowUrl) continue;
      if (!rowsByUrl.has(rowUrl)) {
        rowsByUrl.set(rowUrl, row);
      }
    }
  }

  function readMapsResultFeedNode() {
    return (
      document.querySelector("[role='feed']") ||
      document.querySelector("div[aria-label*='Results']") ||
      document.querySelector("div[aria-label*='results']")
    );
  }

  async function extractMaps(options) {
    const href = String(location.href || "");
    const isMapsSearchPage = /\/maps\/search\//i.test(href);
    if (isMapsSearchPage && options.autoScrollResults) {
      const feedNode = readMapsResultFeedNode();
      if (feedNode instanceof HTMLElement) {
        const rowsByUrl = new Map();
        let stablePasses = 0;
        let previousCount = 0;
        const stopOnStable = Boolean(options.untilNoMore);
        const maxResults = Number(options.maxResults || 0);
        const hasResultCap = Number.isFinite(maxResults) && maxResults > 0;
        const stableTarget = clamp(options.stabilityPasses, 2, 20, 8);
        for (let step = 0; step < options.maxScrollSteps; step += 1) {
          collectMapsResultRows(feedNode, options, rowsByUrl);
          const currentCount = rowsByUrl.size;
          if (hasResultCap && currentCount >= maxResults) break;
          if (currentCount === previousCount) {
            stablePasses += 1;
          } else {
            stablePasses = 0;
          }
          previousCount = currentCount;
          if (stopOnStable && stablePasses >= stableTarget) break;
          feedNode.scrollTop = feedNode.scrollHeight;
          await new Promise((resolve) => setTimeout(resolve, options.scrollDelayMs));
        }
        collectMapsResultRows(feedNode, options, rowsByUrl);
        const rows = hasResultCap
          ? Array.from(rowsByUrl.values()).slice(0, maxResults)
          : Array.from(rowsByUrl.values());
        if (rows.length > 0) {
          return {
            rows
          };
        }
      }
    }

    const rawTitle = cleanText(
      document.querySelector("h1")?.innerText ||
        document.querySelector("[role='main'] h1")?.innerText ||
        ""
    );
    const rawRating = cleanText(
      document.querySelector("[aria-label*='stars']")?.getAttribute("aria-label") ||
        document.querySelector("[data-value='Rating']")?.innerText ||
        ""
    );
    const rawReviewText = cleanText(
      document.querySelector("button[jsaction*='pane.reviewChart.moreReviews']")?.innerText ||
        document.querySelector("[aria-label*='reviews']")?.getAttribute("aria-label") ||
        ""
    );
    const rawCategory = cleanText(
      document.querySelector("button[jsaction*='category']")?.innerText ||
        document.querySelector("[aria-label*='Category']")?.innerText ||
        ""
    );
    const rawAddress = cleanText(
      document.querySelector("button[data-item-id*='address']")?.innerText ||
        document.querySelector("[data-item-id='address']")?.innerText ||
        ""
    );
    const rawPhone = cleanText(
      document.querySelector("button[data-item-id*='phone']")?.innerText ||
        document.querySelector("[data-item-id='phone:tel']")?.innerText ||
        ""
    );
    const rawWebsite = cleanText(
      document.querySelector("a[data-item-id='authority']")?.href ||
        document.querySelector("a[data-item-id*='authority']")?.href ||
        ""
    );
    const rawHours = cleanText(
      document.querySelector("[aria-label*='Hours']")?.textContent ||
        document.querySelector("[data-item-id*='oh']")?.textContent ||
        ""
    );

    const coords = parseMapCoordsFromUrl(location.href);
    const mapImageCount = document.querySelectorAll("img").length;

    return {
      row: {
        mapName: options.includeBasicInfo ? rawTitle : "",
        mapRating: options.includeBasicInfo ? rawRating : "",
        mapCategory: options.includeBasicInfo ? rawCategory : "",
        mapAddress: options.includeLocation ? rawAddress : "",
        mapLatitude: options.includeLocation ? coords.latitude : "",
        mapLongitude: options.includeLocation ? coords.longitude : "",
        mapPhone: options.includeContactDetails ? rawPhone : "",
        mapWebsite: options.includeContactDetails ? rawWebsite : "",
        mapHours: options.includeHours ? rawHours : "",
        mapReviewCount: options.includeReviews ? parseReviewCount(rawReviewText) : 0,
        mapImageCount: options.includeImages ? mapImageCount : 0
      }
    };
  }

  const actionType = String(input?.actionType || PAGE_ACTION_TYPES.EXTRACT_PAGES).trim().toUpperCase();
  const fields = Array.isArray(input?.fields) ? input.fields : [];
  const emailOptions = input?.emailOptions || {};
  const phoneOptions = input?.phoneOptions || {};
  const textOptions = input?.textOptions || {};
  const mapsOptions = input?.mapsOptions || {};

  let row = {};
  let rows = [];
  try {
    if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_EMAIL) {
      row = await extractEmails(emailOptions);
    } else if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_PHONE) {
      row = extractPhones(phoneOptions);
    } else if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_TEXT) {
      row = extractText(textOptions);
    } else if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_GOOGLE_MAPS) {
      const mapsExtraction = await extractMaps(mapsOptions);
      rows = Array.isArray(mapsExtraction?.rows) ? mapsExtraction.rows : [];
      row = mapsExtraction?.row && typeof mapsExtraction.row === "object" ? mapsExtraction.row : {};
    } else {
      row = extractByFields(fields);
    }
  } catch (error) {
    return {
      ok: false,
      actionType,
      error: String(error?.message || error || "Page extraction script failed")
    };
  }

  if (rows.length > 0) {
    return {
      ok: true,
      actionType,
      rows
    };
  }
  return {
    ok: true,
    actionType,
    row
  };
}

function selectorExistsInDom(selector) {
  const value = String(selector || "").trim();
  if (!value) return true;
  return Boolean(document.querySelector(value));
}

async function waitForSelectorInTab({ tabId, selector, timeoutMs, chromeApi, signal }) {
  if (!selector) return true;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    throwIfAborted(signal);
    const result = await executeInTab({
      tabId,
      func: selectorExistsInDom,
      args: [selector],
      chromeApi
    });
    const exists = Boolean(result?.[0]?.result);
    if (exists) return true;
    await delay(220);
  }
  return false;
}

export function createPageExtractionEngine({ chromeApi = chrome } = {}) {
  return {
    async extractPages({ config, signal, emitProgress }) {
      const urls = normalizeUrls(config || {});
      const queue = normalizeQueueConfig(config || {});
      const actionConfig = normalizeActionConfig(config || {});
      const isMapsAction = actionConfig.actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_GOOGLE_MAPS;
      const mapsOnlyNewResults = isMapsAction && Boolean(actionConfig?.mapsOptions?.onlyNewResults);
      const mapsScopeUrl = mapsOnlyNewResults
        ? normalizeMapsScopeUrl(String(config?.startUrl || urls[0] || ""))
        : "";
      const mapsSeenState = mapsOnlyNewResults
        ? await loadMapsSeenEntities({
            chromeApi,
            scopeUrl: mapsScopeUrl
          })
        : {
            storageKey: "",
            entities: new Set()
          };

      if (urls.length === 0) {
        return {
          rows: [],
          summary: {
            rowCount: 0,
            urlCount: 0,
            successCount: 0,
            failureCount: 0
          }
        };
      }

      const jobs = urls.map((url, index) => ({
        id: `${index + 1}`,
        index,
        url
      }));

      let nextJobIndex = 0;
      let completed = 0;
      let failed = 0;
      let retryCount = 0;
      const rows = [];
      const failures = [];
      const mapsSeenEntities = mapsSeenState.entities;
      const initialMapsSeenCount = mapsSeenEntities.size;
      let mapsSkippedKnownEntities = 0;
      let mapsAcceptedNewEntities = 0;
      let mapsSeenPersisted = false;

      async function openJobTab(job, workerContext) {
        if (!workerContext.stickySession) {
          return createTab({
            createProperties: {
              active: false,
              url: job.url
            },
            chromeApi
          });
        }

        if (!workerContext.tabId) {
          const created = await createTab({
            createProperties: {
              active: false,
              url: job.url
            },
            chromeApi
          });
          workerContext.tabId = created?.id || null;
          return created;
        }

        try {
          return await updateTab({
            tabId: workerContext.tabId,
            updateProperties: {
              url: job.url,
              active: false
            },
            chromeApi
          });
        } catch (_error) {
          workerContext.tabId = null;
          const created = await createTab({
            createProperties: {
              active: false,
              url: job.url
            },
            chromeApi
          });
          workerContext.tabId = created?.id || null;
          return created;
        }
      }

      async function processJob(job, workerId, workerContext) {
        let lastError = null;
        for (let attempt = 0; attempt <= queue.maxRetries; attempt += 1) {
          throwIfAborted(signal);
          let tab = null;
          try {
            tab = await openJobTab(job, workerContext);

            if (queue.waitForPageLoad) {
              await waitForTabComplete({
                tabId: tab.id,
                timeoutMs: queue.pageTimeoutMs,
                chromeApi
              });
            }

            if (queue.waitForSelector) {
              const selectorReady = await waitForSelectorInTab({
                tabId: tab.id,
                selector: queue.waitForSelector,
                timeoutMs: queue.waitForSelectorTimeoutMs,
                chromeApi,
                signal
              });
              if (!selectorReady) {
                throw new Error(`Timed out waiting for selector '${queue.waitForSelector}'`);
              }
            }

            const extractResult = await executeInTab({
              tabId: tab.id,
              func: pageExtractInDom,
              args: [
                {
                  actionType: actionConfig.actionType,
                  fields: actionConfig.fields,
                  emailOptions: actionConfig.emailOptions,
                  phoneOptions: actionConfig.phoneOptions,
                  textOptions: actionConfig.textOptions,
                  mapsOptions: actionConfig.mapsOptions
                }
              ],
              chromeApi
            });

            const scriptEntry = extractResult?.[0] || {};
            const payload = scriptEntry?.result || {};
            if (!payload.ok) {
              const scriptError = String(
                payload?.error ||
                  scriptEntry?.error ||
                  scriptEntry?.exceptionDetails?.text ||
                  scriptEntry?.exceptionDetails?.exception?.description ||
                  ""
              ).trim();
              throw new Error(scriptError || "Page extraction script failed");
            }

            const payloadRows = Array.isArray(payload.rows)
              ? payload.rows
              : payload.row && typeof payload.row === "object"
                ? [payload.row]
                : [];
            const resolvedRows = payloadRows.map((payloadRow) => ({
              url: job.url,
              actionType: actionConfig.actionType,
              ...payloadRow
            }));
            return {
              ok: true,
              rows: resolvedRows,
              attempts: attempt + 1
            };
          } catch (error) {
            lastError = error;
            if (attempt < queue.maxRetries) {
              retryCount += 1;
              const retryDelay = computeRetryDelayMs({
                queue,
                retryAttempt: attempt + 1
              });
              emitProgress?.({
                progress: Math.max(1, Math.min(98, Math.floor(((completed + failed) / jobs.length) * 100))),
                phase: `Retry ${attempt + 1}/${queue.maxRetries} for ${job.url}`,
                context: {
                  workerId,
                  currentUrl: job.url,
                  retryAttempt: attempt + 1,
                  maxRetries: queue.maxRetries,
                  retryDelayMs: retryDelay,
                  reliabilityProfile: queue.reliability.profile,
                  backoffStrategy: queue.reliability.backoffStrategy,
                  jitterMode: queue.reliability.jitterMode,
                  sessionReuseMode: queue.reliability.sessionReuseMode
                }
              });
              await delay(retryDelay);
            }
          } finally {
            if (!workerContext.stickySession && tab?.id) {
              await removeTab({
                tabId: tab.id,
                chromeApi
              });
            }
          }
        }

        return {
          ok: false,
          error: lastError?.message || "Page extraction failed",
          attempts: queue.maxRetries + 1
        };
      }

      async function workerLoop(workerId) {
        const workerContext = {
          stickySession: queue.reliability.sessionReuseMode === "sticky",
          tabId: null
        };
        try {
          while (true) {
            throwIfAborted(signal);
            const currentIndex = nextJobIndex;
            if (currentIndex >= jobs.length) {
              return;
            }
            nextJobIndex += 1;
            const job = jobs[currentIndex];

            const result = await processJob(job, workerId, workerContext);
            if (result.ok) {
              const resultRows = Array.isArray(result.rows) ? result.rows : [];
              if (mapsOnlyNewResults) {
                const acceptedRows = [];
                for (const row of resultRows) {
                  const entityKey = buildMapsEntityKey(row);
                  if (!entityKey) {
                    acceptedRows.push(row);
                    continue;
                  }
                  if (mapsSeenEntities.has(entityKey)) {
                    mapsSkippedKnownEntities += 1;
                    continue;
                  }
                  mapsSeenEntities.add(entityKey);
                  mapsAcceptedNewEntities += 1;
                  acceptedRows.push({
                    ...row,
                    mapEntityKey: entityKey
                  });
                }
                rows.push(...acceptedRows);
              } else {
                rows.push(...resultRows);
              }
              completed += 1;
            } else {
              failed += 1;
              failures.push({
                url: job.url,
                error: result.error,
                attempts: Number(result.attempts || queue.maxRetries + 1)
              });
            }

            const progress = Math.min(99, Math.floor(((completed + failed) / jobs.length) * 100));
            emitProgress?.({
              progress,
              phase: `Bulk extraction ${completed + failed}/${jobs.length}`,
              context: {
                workerId,
                completed,
                failed,
                retryCount,
                remaining: Math.max(0, jobs.length - completed - failed),
                currentUrl: job.url
              }
            });

            if (queue.delayBetweenRequestsMs > 0 && completed + failed < jobs.length) {
              const betweenDelay = queue.delayBetweenRequestsMs + randomJitter(resolveJitterWindowMs(queue));
              await delay(betweenDelay);
            }
          }
        } finally {
          if (workerContext.stickySession && workerContext.tabId) {
            await removeTab({
              tabId: workerContext.tabId,
              chromeApi
            });
          }
        }
      }

      const workerCount = Math.max(1, Math.min(queue.maxConcurrentTabs, jobs.length));
      const workers = [];
      for (let workerIndex = 0; workerIndex < workerCount; workerIndex += 1) {
        workers.push(workerLoop(workerIndex + 1));
      }
      await Promise.all(workers);

      if (mapsOnlyNewResults && mapsSeenEntities.size > initialMapsSeenCount) {
        mapsSeenPersisted = await persistMapsSeenEntities({
          chromeApi,
          storageKey: mapsSeenState.storageKey,
          entities: mapsSeenEntities
        });
      }

      throwIfAborted(signal);
      emitProgress?.({
        progress: 100,
        phase: "Bulk extraction completed",
        context: {
          completed,
          failed,
          retryCount,
          reliabilityProfile: queue.reliability.profile
        }
      });

      const inputUrls = limitList(dedupeList(urls), 10_000);
      const successfulUrls = limitList(
        dedupeList(
          rows.map((row) => row?.url).filter(Boolean)
        ),
        10_000
      );
      const failedUrls = limitList(
        dedupeList(
          failures.map((item) => item?.url).filter(Boolean)
        ),
        10_000
      );
      const unresolvedUrls = [...failedUrls];

      return {
        rows,
        summary: {
          rowCount: rows.length,
          urlCount: urls.length,
          successCount: completed,
          failureCount: failed,
          actionType: actionConfig.actionType,
          actionOptions: {
            email: actionConfig.emailOptions,
            phone: actionConfig.phoneOptions,
            text: actionConfig.textOptions,
            maps: actionConfig.mapsOptions
          },
          queue,
          retryStats: {
            totalRetryAttempts: retryCount,
            profile: queue.reliability.profile,
            backoffStrategy: queue.reliability.backoffStrategy,
            jitterMode: queue.reliability.jitterMode,
            sessionReuseMode: queue.reliability.sessionReuseMode
          },
          inputUrls,
          successfulUrls,
          failedUrls,
          failures: failures.slice(0, 200),
          mapsDeduplication: isMapsAction
            ? {
                onlyNewResults: mapsOnlyNewResults,
                scopeUrl: mapsScopeUrl || "",
                knownEntitiesBeforeRun: initialMapsSeenCount,
                skippedKnownEntities: mapsSkippedKnownEntities,
                acceptedNewEntities: mapsAcceptedNewEntities,
                persisted: mapsSeenPersisted
              }
            : null,
          checkpoint: {
            totalUrls: inputUrls.length,
            attemptedCount: completed + failed,
            successCount: completed,
            failureCount: failed,
            nextIndex: inputUrls.length,
            unresolvedUrls: limitList(unresolvedUrls, 10_000)
          }
        }
      };
    }
  };
}

export const __internal = Object.freeze({
  normalizeActionConfig,
  normalizeQueueConfig,
  normalizeReliabilityConfig,
  normalizeEmailOptions,
  normalizePhoneOptions,
  normalizeTextOptions,
  normalizeMapsOptions,
  computeRetryDelayMs,
  resolveJitterWindowMs
});
