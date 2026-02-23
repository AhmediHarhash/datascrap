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
    fields
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

function pageExtractInDom(input) {
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

  function extractEmails() {
    const text = `${document.body?.innerText || ""}\n${document.documentElement?.innerText || ""}`;
    const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    const mailtoLinks = Array.from(document.querySelectorAll("a[href^='mailto:']"))
      .map((link) => String(link.getAttribute("href") || "").replace(/^mailto:/i, "").trim())
      .filter(Boolean);
    const unique = Array.from(new Set([...matches, ...mailtoLinks].map((item) => item.toLowerCase())));
    return {
      emails: unique,
      emailCount: unique.length
    };
  }

  function extractPhones() {
    const text = `${document.body?.innerText || ""}\n${document.documentElement?.innerText || ""}`;
    const matches = text.match(/(?:\+?\d[\d\s().-]{6,}\d)/g) || [];
    const normalized = matches
      .map((item) => cleanText(item))
      .map((item) => item.replace(/\s+/g, " "))
      .filter((item) => item.length >= 7);
    const unique = Array.from(new Set(normalized));
    return {
      phones: unique,
      phoneCount: unique.length
    };
  }

  function extractText() {
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
    return {
      title,
      description,
      author,
      publishDate,
      wordCount: words,
      content: mainContent.slice(0, 12_000)
    };
  }

  function extractMaps() {
    const name = cleanText(
      document.querySelector("h1")?.innerText ||
        document.querySelector("[role='main'] h1")?.innerText ||
        ""
    );
    const rating = cleanText(
      document.querySelector("[aria-label*='stars']")?.getAttribute("aria-label") ||
        document.querySelector("[data-value='Rating']")?.innerText ||
        ""
    );
    const address = cleanText(
      document.querySelector("button[data-item-id*='address']")?.innerText ||
        document.querySelector("[data-item-id='address']")?.innerText ||
        ""
    );
    const phone = cleanText(
      document.querySelector("button[data-item-id*='phone']")?.innerText ||
        document.querySelector("[data-item-id='phone:tel']")?.innerText ||
        ""
    );
    const website = cleanText(
      document.querySelector("a[data-item-id='authority']")?.href ||
        document.querySelector("a[data-item-id*='authority']")?.href ||
        ""
    );
    return {
      mapName: name,
      mapRating: rating,
      mapAddress: address,
      mapPhone: phone,
      mapWebsite: website
    };
  }

  const actionType = String(input?.actionType || PAGE_ACTION_TYPES.EXTRACT_PAGES).trim().toUpperCase();
  const fields = Array.isArray(input?.fields) ? input.fields : [];

  let row = {};
  if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_EMAIL) {
    row = extractEmails();
  } else if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_PHONE) {
    row = extractPhones();
  } else if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_TEXT) {
    row = extractText();
  } else if (actionType === PAGE_ACTION_TYPES.EXTRACT_PAGES_GOOGLE_MAPS) {
    row = extractMaps();
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
                  fields: actionConfig.fields
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
          error: lastError?.message || "Page extraction failed"
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

      return {
        rows,
        summary: {
          rowCount: rows.length,
          urlCount: urls.length,
          successCount: completed,
          failureCount: failed,
          actionType: actionConfig.actionType,
          queue,
          failures: failures.slice(0, 50)
        }
      };
    }
  };
}
