import { createAbortError } from "../vendor/core/src/utils.mjs";
import { createTab, delay, executeInTab, removeTab, waitForTabComplete } from "./chrome-utils.mjs";

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function normalizeUrls(config = {}) {
  const fromArray = Array.isArray(config.urls) ? config.urls : [];
  const cleaned = fromArray.map((item) => String(item || "").trim()).filter(Boolean);
  if (cleaned.length > 0) return cleaned;

  const single = String(config.startUrl || "").trim();
  if (single) return [single];
  return [];
}

function normalizeQueueConfig(config = {}) {
  const queue = config.queue && typeof config.queue === "object" ? config.queue : {};
  return {
    maxConcurrentTabs: clamp(queue.maxConcurrentTabs, 1, 8, 2),
    delayBetweenRequestsMs: clamp(queue.delayBetweenRequestsMs, 0, 30_000, 300),
    pageTimeoutMs: clamp(queue.pageTimeoutMs, 2_000, 120_000, 25_000),
    maxRetries: clamp(queue.maxRetries, 0, 5, 1),
    retryDelayMs: clamp(queue.retryDelayMs, 0, 30_000, 1_000),
    jitterMs: clamp(queue.jitterMs, 0, 10_000, 200),
    waitForPageLoad: Boolean(queue.waitForPageLoad !== false),
    waitForSelector: String(queue.waitForSelector || "").trim(),
    waitForSelectorTimeoutMs: clamp(queue.waitForSelectorTimeoutMs, 200, 60_000, 4_000)
  };
}

function normalizeMetadataOptions(config = {}) {
  const metadata = config.metadata && typeof config.metadata === "object" ? config.metadata : {};
  return {
    includeMetaTags: Boolean(metadata.includeMetaTags !== false),
    includeJsonLd: Boolean(metadata.includeJsonLd !== false),
    includeReviewSignals: Boolean(metadata.includeReviewSignals !== false),
    includeContactSignals: Boolean(metadata.includeContactSignals !== false),
    includeRawJsonLd: Boolean(metadata.includeRawJsonLd === true)
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

function selectorExistsInDom(selector) {
  const value = String(selector || "").trim();
  if (!value) return true;
  return Boolean(document.querySelector(value));
}

function metadataExtractInDom(input) {
  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function readMetaByName(name) {
    return cleanText(document.querySelector(`meta[name='${name}']`)?.getAttribute("content") || "");
  }

  function readMetaByProperty(property) {
    return cleanText(document.querySelector(`meta[property='${property}']`)?.getAttribute("content") || "");
  }

  function readCanonicalUrl() {
    return cleanText(document.querySelector("link[rel='canonical']")?.getAttribute("href") || "");
  }

  function flattenJsonLd(inputValue, output) {
    if (!inputValue) return;
    if (Array.isArray(inputValue)) {
      for (const item of inputValue) flattenJsonLd(item, output);
      return;
    }
    if (typeof inputValue !== "object") return;
    output.push(inputValue);
    if (Array.isArray(inputValue["@graph"])) {
      flattenJsonLd(inputValue["@graph"], output);
    }
  }

  function normalizeType(typeValue) {
    if (!typeValue) return [];
    if (Array.isArray(typeValue)) return typeValue.map((item) => cleanText(item)).filter(Boolean);
    return [cleanText(typeValue)].filter(Boolean);
  }

  function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const options = input?.options && typeof input.options === "object" ? input.options : {};
  const includeMetaTags = Boolean(options.includeMetaTags !== false);
  const includeJsonLd = Boolean(options.includeJsonLd !== false);
  const includeReviewSignals = Boolean(options.includeReviewSignals !== false);
  const includeContactSignals = Boolean(options.includeContactSignals !== false);
  const includeRawJsonLd = Boolean(options.includeRawJsonLd === true);

  const url = cleanText(String(location.href || ""));
  const titleTag = cleanText(document.querySelector("title")?.textContent || "");
  const pageText = `${document.body?.innerText || ""}\n${document.documentElement?.innerText || ""}`;

  const row = {
    url,
    title: titleTag,
    description: includeMetaTags ? readMetaByName("description") : "",
    author: includeMetaTags ? (readMetaByName("author") || cleanText(document.querySelector("[rel='author']")?.textContent || "")) : "",
    publishDate: includeMetaTags
      ? (readMetaByProperty("article:published_time") || cleanText(document.querySelector("time")?.getAttribute("datetime") || ""))
      : "",
    canonicalUrl: includeMetaTags ? readCanonicalUrl() : "",
    ogTitle: includeMetaTags ? readMetaByProperty("og:title") : "",
    ogDescription: includeMetaTags ? readMetaByProperty("og:description") : "",
    ogType: includeMetaTags ? readMetaByProperty("og:type") : "",
    ogImage: includeMetaTags ? readMetaByProperty("og:image") : "",
    twitterCard: includeMetaTags ? readMetaByName("twitter:card") : "",
    metadataTagCount: includeMetaTags ? document.querySelectorAll("meta").length : 0
  };

  let jsonLdScriptsCount = 0;
  let jsonLdNodeCount = 0;
  let schemaTypes = [];
  let reviewCount = 0;
  let ratingCount = 0;
  let jsonLdPreview = [];

  if (includeJsonLd) {
    const scripts = Array.from(document.querySelectorAll("script[type='application/ld+json']"));
    jsonLdScriptsCount = scripts.length;
    const nodes = [];
    for (const script of scripts) {
      const raw = String(script.textContent || "").trim();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        flattenJsonLd(parsed, nodes);
      } catch (_error) {
        continue;
      }
    }

    jsonLdNodeCount = nodes.length;
    const typeSet = new Set();

    for (const node of nodes) {
      const types = normalizeType(node?.["@type"]);
      types.forEach((type) => typeSet.add(type));
      if (types.some((type) => type.toLowerCase() === "review")) {
        reviewCount += 1;
      }
      if (node?.aggregateRating) {
        const count = toNumber(node.aggregateRating.reviewCount ?? node.aggregateRating.ratingCount);
        if (count !== null) {
          ratingCount += count;
        }
      }
      if (includeRawJsonLd && jsonLdPreview.length < 5) {
        jsonLdPreview.push(node);
      }
    }

    schemaTypes = Array.from(typeSet).sort((left, right) => left.localeCompare(right));
  }

  let emails = [];
  let phones = [];
  if (includeContactSignals) {
    const emailMatches = pageText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    const phoneMatches = pageText.match(/(?:\+?\d[\d\s().-]{6,}\d)/g) || [];
    emails = Array.from(new Set(emailMatches.map((item) => cleanText(item).toLowerCase())));
    phones = Array.from(new Set(phoneMatches.map((item) => cleanText(item)).filter((item) => item.length >= 7)));
  }

  row.schemaTypes = schemaTypes.join(" | ");
  row.schemaTypeCount = schemaTypes.length;
  row.jsonLdScriptsCount = jsonLdScriptsCount;
  row.jsonLdNodeCount = jsonLdNodeCount;
  row.reviewCount = includeReviewSignals ? reviewCount : 0;
  row.aggregateRatingCount = includeReviewSignals ? ratingCount : 0;
  row.emailCount = includeContactSignals ? emails.length : 0;
  row.phoneCount = includeContactSignals ? phones.length : 0;
  row.detectedLang = cleanText(document.documentElement?.getAttribute("lang") || "");

  if (includeRawJsonLd) {
    const rawText = JSON.stringify(jsonLdPreview, null, 0);
    row.jsonLdPreview = rawText.slice(0, 6000);
  }

  return {
    ok: true,
    row
  };
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

export function createMetadataExtractionEngine({ chromeApi = chrome } = {}) {
  return {
    async extractMetadataPages({ config, signal, emitProgress }) {
      const urls = normalizeUrls(config || {});
      const queue = normalizeQueueConfig(config || {});
      const options = normalizeMetadataOptions(config || {});

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
      const rows = [];
      const failures = [];

      async function processJob(job) {
        let lastError = null;
        for (let attempt = 0; attempt <= queue.maxRetries; attempt += 1) {
          throwIfAborted(signal);
          let tab = null;
          try {
            tab = await createTab({
              createProperties: {
                active: false,
                url: job.url
              },
              chromeApi
            });

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
              func: metadataExtractInDom,
              args: [
                {
                  options
                }
              ],
              chromeApi
            });

            const payload = extractResult?.[0]?.result || {};
            if (!payload.ok || !payload.row) {
              throw new Error("Metadata extraction script failed");
            }

            const row = {
              sourceUrl: job.url,
              ...payload.row
            };
            return {
              ok: true,
              row
            };
          } catch (error) {
            lastError = error;
            if (attempt < queue.maxRetries) {
              const retryDelay = queue.retryDelayMs + randomJitter(queue.jitterMs);
              await delay(retryDelay);
            }
          } finally {
            if (tab?.id) {
              await removeTab({
                tabId: tab.id,
                chromeApi
              });
            }
          }
        }

        return {
          ok: false,
          error: lastError?.message || "Metadata extraction failed"
        };
      }

      async function workerLoop(workerId) {
        while (true) {
          throwIfAborted(signal);
          const currentIndex = nextJobIndex;
          if (currentIndex >= jobs.length) {
            return;
          }
          nextJobIndex += 1;
          const job = jobs[currentIndex];

          const result = await processJob(job);
          if (result.ok) {
            rows.push(result.row);
            completed += 1;
          } else {
            failed += 1;
            failures.push({
              url: job.url,
              error: result.error
            });
          }

          const progress = Math.min(99, Math.floor(((completed + failed) / jobs.length) * 100));
          emitProgress?.({
            progress,
            phase: `Metadata extraction ${completed + failed}/${jobs.length}`,
            context: {
              workerId,
              completed,
              failed,
              remaining: Math.max(0, jobs.length - completed - failed),
              currentUrl: job.url
            }
          });

          if (queue.delayBetweenRequestsMs > 0 && completed + failed < jobs.length) {
            await delay(queue.delayBetweenRequestsMs + randomJitter(queue.jitterMs));
          }
        }
      }

      const workerCount = Math.max(1, Math.min(queue.maxConcurrentTabs, jobs.length));
      const workers = [];
      for (let workerIndex = 0; workerIndex < workerCount; workerIndex += 1) {
        workers.push(workerLoop(workerIndex + 1));
      }
      await Promise.all(workers);

      throwIfAborted(signal);
      emitProgress?.({
        progress: 100,
        phase: "Metadata extraction completed",
        context: {
          completed,
          failed
        }
      });

      return {
        rows,
        summary: {
          rowCount: rows.length,
          urlCount: urls.length,
          successCount: completed,
          failureCount: failed,
          metadata: options,
          queue,
          failures: failures.slice(0, 50)
        }
      };
    }
  };
}

export const __internal = Object.freeze({
  normalizeMetadataOptions,
  normalizeQueueConfig
});
