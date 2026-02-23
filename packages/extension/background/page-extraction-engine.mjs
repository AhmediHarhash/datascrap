import { PAGE_ACTION_TYPES } from "../vendor/shared/src/events.mjs";
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
  return {
    includeBasicInfo: Boolean(source.includeBasicInfo !== false),
    includeContactDetails: Boolean(source.includeContactDetails !== false),
    includeReviews: Boolean(source.includeReviews !== false),
    includeHours: Boolean(source.includeHours !== false),
    includeLocation: Boolean(source.includeLocation !== false),
    includeImages: Boolean(source.includeImages !== false)
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

function normalizeQueueConfig(config = {}) {
  const queue = config.queue && typeof config.queue === "object" ? config.queue : {};
  return {
    maxConcurrentTabs: clamp(queue.maxConcurrentTabs, 1, 8, 3),
    delayBetweenRequestsMs: clamp(queue.delayBetweenRequestsMs, 0, 30_000, 400),
    pageTimeoutMs: clamp(queue.pageTimeoutMs, 2_000, 120_000, 25_000),
    maxRetries: clamp(queue.maxRetries, 0, 5, 1),
    retryDelayMs: clamp(queue.retryDelayMs, 0, 30_000, 1_200),
    jitterMs: clamp(queue.jitterMs, 0, 10_000, 220),
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

async function pageExtractInDom(input) {
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
    if (!match) {
      return {
        latitude: "",
        longitude: ""
      };
    }
    return {
      latitude: match[1],
      longitude: match[2]
    };
  }

  function parseReviewCount(rawValue) {
    const text = cleanText(rawValue);
    const match = text.match(/([0-9][0-9,.]*)/);
    if (!match) return 0;
    const parsed = Number(match[1].replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function extractMaps(options) {
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
    };
  }

  const actionType = String(input?.actionType || PAGE_ACTION_TYPES.EXTRACT_PAGES).trim().toUpperCase();
  const fields = Array.isArray(input?.fields) ? input.fields : [];
  const emailOptions = input?.emailOptions || {};
  const phoneOptions = input?.phoneOptions || {};
  const textOptions = input?.textOptions || {};
  const mapsOptions = input?.mapsOptions || {};

  let row = {};
  if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_EMAIL) {
    row = await extractEmails(emailOptions);
  } else if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_PHONE) {
    row = extractPhones(phoneOptions);
  } else if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_TEXT) {
    row = extractText(textOptions);
  } else if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_GOOGLE_MAPS) {
    row = extractMaps(mapsOptions);
  } else {
    row = extractByFields(fields);
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

            const payload = extractResult?.[0]?.result || {};
            if (!payload.ok) {
              throw new Error("Page extraction script failed");
            }

            const row = {
              url: job.url,
              actionType: actionConfig.actionType,
              ...payload.row
            };
            return {
              ok: true,
              row,
              attempts: attempt + 1
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
          error: lastError?.message || "Page extraction failed",
          attempts: queue.maxRetries + 1
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
        phase: "Bulk extraction completed",
        context: {
          completed,
          failed
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
          inputUrls,
          successfulUrls,
          failedUrls,
          failures: failures.slice(0, 200),
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
  normalizeEmailOptions,
  normalizePhoneOptions,
  normalizeTextOptions,
  normalizeMapsOptions
});
