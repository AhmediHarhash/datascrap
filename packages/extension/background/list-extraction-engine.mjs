import { LOAD_MORE_METHODS } from "../vendor/shared/src/events.mjs";
import { createAbortError } from "../vendor/core/src/utils.mjs";
import { delay, executeInTab, getActiveTab, updateTab, waitForTabComplete } from "./chrome-utils.mjs";

const SPEED_PROFILES = Object.freeze({
  slow: {
    delayMs: 1600,
    attempts: 8,
    noChangeThreshold: 3
  },
  normal: {
    delayMs: 900,
    attempts: 5,
    noChangeThreshold: 2
  },
  fast: {
    delayMs: 450,
    attempts: 3,
    noChangeThreshold: 1
  }
});

function normalizeLoadMoreMethod(value) {
  const method = String(value || LOAD_MORE_METHODS.NONE).trim().toLowerCase();
  if (Object.values(LOAD_MORE_METHODS).includes(method)) {
    return method;
  }
  return LOAD_MORE_METHODS.NONE;
}

function normalizeListConfig(config = {}) {
  const actions = Array.isArray(config.actions) ? config.actions : [];
  const extractAction = actions.find((item) => String(item?.type || "").toUpperCase() === "EXTRACT_LIST");
  const loadMoreAction = actions.find((item) => String(item?.type || "").toUpperCase() === "LOAD_MORE");

  const speedProfileName = String(config.speedProfile || "normal").toLowerCase();
  const profile = SPEED_PROFILES[speedProfileName] || SPEED_PROFILES.normal;

  const extractConfig = extractAction || config.extractList || {};
  const fields = Array.isArray(extractConfig.fields) ? extractConfig.fields : [];
  const loadMoreConfig = loadMoreAction || config.loadMore || {};

  return {
    startUrl: String(config.startUrl || "").trim(),
    containerSelector: String(extractConfig.containerSelector || "").trim(),
    fields,
    loadMore: {
      method: normalizeLoadMoreMethod(loadMoreConfig.method),
      attempts: Number(loadMoreConfig.attempts || profile.attempts),
      delayMs: Number(loadMoreConfig.delayMs || profile.delayMs),
      scrollPx: Number(loadMoreConfig.scrollPx || 1800),
      buttonSelector: String(loadMoreConfig.buttonSelector || "").trim(),
      nextLinkSelector: String(loadMoreConfig.nextLinkSelector || "").trim(),
      noChangeThreshold: Number(loadMoreConfig.noChangeThreshold || profile.noChangeThreshold)
    }
  };
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw createAbortError("Automation stopped");
  }
}

function toDedupeKey(row) {
  return JSON.stringify(row);
}

function extractRowsFromDom(input) {
  function readValue(element, field) {
    if (!element) return "";

    const mode = String(field.extractMode || "text").toLowerCase();
    if (mode === "link_url") {
      return element.href || element.getAttribute("href") || "";
    }
    if (mode === "image_url") {
      return element.src || element.getAttribute("src") || "";
    }
    if (mode === "attribute") {
      const attribute = String(field.attribute || "").trim();
      if (!attribute) return "";
      return element.getAttribute(attribute) || "";
    }

    return (element.innerText || element.textContent || "").trim();
  }

  const containerSelector = String(input?.containerSelector || "").trim();
  if (!containerSelector) {
    return {
      ok: false,
      error: "containerSelector is required",
      rows: [],
      containerCount: 0
    };
  }

  const containers = Array.from(document.querySelectorAll(containerSelector));
  const fields = Array.isArray(input?.fields) ? input.fields : [];
  const rows = [];

  for (const container of containers) {
    const row = {};
    let hasValue = false;

    for (let index = 0; index < fields.length; index += 1) {
      const field = fields[index];
      const fieldName = String(field?.name || `field_${index + 1}`).trim() || `field_${index + 1}`;
      const selector = String(field?.relativeSelector || field?.selector || "").trim();
      const element = selector ? container.querySelector(selector) : null;
      const value = readValue(element, field);
      row[fieldName] = value;
      if (String(value || "").trim()) {
        hasValue = true;
      }
    }

    if (hasValue) {
      rows.push(row);
    }
  }

  return {
    ok: true,
    rows,
    containerCount: containers.length
  };
}

function clickSelectorInDom(input) {
  const selector = String(input?.selector || "").trim();
  if (!selector) return { clicked: false, reason: "missing_selector" };

  const button = document.querySelector(selector);
  if (!button) {
    return { clicked: false, reason: "not_found" };
  }
  button.click();
  return { clicked: true };
}

function resolveNextUrlInDom(input) {
  const selector = String(input?.selector || "").trim();
  if (!selector) {
    return { ok: false, reason: "missing_selector", nextUrl: null };
  }

  const anchor = document.querySelector(selector);
  if (!anchor) {
    return { ok: false, reason: "not_found", nextUrl: null };
  }

  const href = anchor.href || anchor.getAttribute("href");
  if (!href) {
    return { ok: false, reason: "missing_href", nextUrl: null };
  }
  return { ok: true, nextUrl: href };
}

function scrollPageInDom(input) {
  const scrollPx = Number(input?.scrollPx || 1800);
  const before = window.scrollY || 0;
  window.scrollBy({
    top: scrollPx,
    behavior: "smooth"
  });
  const after = window.scrollY || 0;
  return {
    ok: true,
    before,
    after
  };
}

export function createListExtractionEngine({ chromeApi = chrome } = {}) {
  return {
    async extractList({ config, signal, emitProgress }) {
      const listConfig = normalizeListConfig(config || {});
      const tab = await getActiveTab(chromeApi);
      if (!tab?.id) {
        throw new Error("No active tab available for list extraction");
      }

      if (listConfig.startUrl) {
        const currentUrl = String(tab.url || "");
        if (!currentUrl || currentUrl !== listConfig.startUrl) {
          await updateTab({
            tabId: tab.id,
            updateProperties: { url: listConfig.startUrl },
            chromeApi
          });
          await waitForTabComplete({
            tabId: tab.id,
            timeoutMs: 25_000,
            chromeApi
          });
        }
      }

      if (!listConfig.containerSelector) {
        throw new Error("List extraction requires a container selector");
      }
      if (!Array.isArray(listConfig.fields) || listConfig.fields.length === 0) {
        throw new Error("List extraction requires at least one field selector");
      }

      const rowsByKey = new Map();
      let noChangeStreak = 0;
      let rounds = 0;

      const maxLoadAttempts = Math.max(0, Math.floor(Number(listConfig.loadMore.attempts || 0)));
      const maxRounds = Math.max(1, maxLoadAttempts + 1);

      for (let roundIndex = 0; roundIndex < maxRounds; roundIndex += 1) {
        throwIfAborted(signal);
        rounds += 1;

        emitProgress?.({
          progress: Math.min(95, Math.floor((roundIndex / maxRounds) * 100)),
          phase: `Extracting rows (round ${roundIndex + 1}/${maxRounds})`,
          context: {
            loadMoreMethod: listConfig.loadMore.method
          }
        });

        const extractResponse = await executeInTab({
          tabId: tab.id,
          func: extractRowsFromDom,
          args: [
            {
              containerSelector: listConfig.containerSelector,
              fields: listConfig.fields
            }
          ],
          chromeApi
        });

        const extractResult = extractResponse?.[0]?.result || {
          ok: false,
          rows: []
        };
        if (!extractResult.ok) {
          throw new Error(`List extraction failed in page context: ${extractResult.error || "unknown error"}`);
        }

        let newRows = 0;
        for (const row of extractResult.rows || []) {
          const key = toDedupeKey(row);
          if (!rowsByKey.has(key)) {
            rowsByKey.set(key, row);
            newRows += 1;
          }
        }

        if (newRows === 0) {
          noChangeStreak += 1;
        } else {
          noChangeStreak = 0;
        }

        const isLastRound = roundIndex >= maxRounds - 1;
        if (isLastRound || listConfig.loadMore.method === LOAD_MORE_METHODS.NONE) {
          break;
        }

        if (noChangeStreak >= Math.max(1, Math.floor(Number(listConfig.loadMore.noChangeThreshold || 1)))) {
          break;
        }

        throwIfAborted(signal);
        const method = listConfig.loadMore.method;
        if (method === LOAD_MORE_METHODS.SCROLL) {
          await executeInTab({
            tabId: tab.id,
            func: scrollPageInDom,
            args: [{ scrollPx: listConfig.loadMore.scrollPx }],
            chromeApi
          });
          await delay(Math.max(150, listConfig.loadMore.delayMs));
          continue;
        }

        if (method === LOAD_MORE_METHODS.CLICK_BUTTON) {
          const clickResponse = await executeInTab({
            tabId: tab.id,
            func: clickSelectorInDom,
            args: [
              {
                selector: listConfig.loadMore.buttonSelector
              }
            ],
            chromeApi
          });
          const clickResult = clickResponse?.[0]?.result || {};
          if (!clickResult.clicked) {
            break;
          }
          await delay(Math.max(150, listConfig.loadMore.delayMs));
          continue;
        }

        if (method === LOAD_MORE_METHODS.NAVIGATE) {
          const nextResponse = await executeInTab({
            tabId: tab.id,
            func: resolveNextUrlInDom,
            args: [
              {
                selector: listConfig.loadMore.nextLinkSelector
              }
            ],
            chromeApi
          });
          const nextResult = nextResponse?.[0]?.result || {};
          if (!nextResult.ok || !nextResult.nextUrl) {
            break;
          }
          await updateTab({
            tabId: tab.id,
            updateProperties: {
              url: nextResult.nextUrl
            },
            chromeApi
          });
          await waitForTabComplete({
            tabId: tab.id,
            timeoutMs: 25_000,
            chromeApi
          });
          await delay(Math.max(120, listConfig.loadMore.delayMs));
        }
      }

      const rows = Array.from(rowsByKey.values());
      emitProgress?.({
        progress: 100,
        phase: "List extraction completed",
        context: {
          rowCount: rows.length
        }
      });

      return {
        rows,
        summary: {
          rowCount: rows.length,
          rounds,
          loadMoreMethod: listConfig.loadMore.method,
          noChangeStreak
        }
      };
    }
  };
}
