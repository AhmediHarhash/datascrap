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

function normalizeProfileEntry(input, fallback) {
  const source = input && typeof input === "object" ? input : {};
  const delayRaw = Number(source.delayMs);
  const attemptsRaw = Number(source.attempts);
  const noChangeRaw = Number(source.noChangeThreshold);
  return {
    delayMs: Math.max(100, Math.min(10_000, Number.isFinite(delayRaw) ? delayRaw : fallback.delayMs)),
    attempts: Math.max(1, Math.min(30, Number.isFinite(attemptsRaw) ? attemptsRaw : fallback.attempts)),
    noChangeThreshold: Math.max(1, Math.min(10, Number.isFinite(noChangeRaw) ? noChangeRaw : fallback.noChangeThreshold))
  };
}

function normalizeSpeedProfiles(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    slow: normalizeProfileEntry(source.slow, SPEED_PROFILES.slow),
    normal: normalizeProfileEntry(source.normal, SPEED_PROFILES.normal),
    fast: normalizeProfileEntry(source.fast, SPEED_PROFILES.fast)
  };
}

function normalizeLoadMoreMethod(value) {
  const method = String(value || LOAD_MORE_METHODS.NONE).trim().toLowerCase();
  if (Object.values(LOAD_MORE_METHODS).includes(method)) {
    return method;
  }
  return LOAD_MORE_METHODS.NONE;
}

function normalizeMaxRows(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(50_000, Math.floor(parsed)));
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return Boolean(fallback);
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return Boolean(fallback);
}

function normalizeRoundSafetyCap(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(500, Math.floor(parsed)));
}

function normalizeAutoContinueMaxSegments(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(50, Math.floor(parsed)));
}

function normalizeHardRoundCap(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5000;
  return Math.max(100, Math.min(10000, Math.floor(parsed)));
}

function normalizeHardRoundAbsoluteLimit(value, fallback = 5000) {
  const base = normalizeHardRoundCap(fallback);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return base;
  return Math.max(base, Math.min(50000, Math.floor(parsed)));
}

function normalizeUrlSignature(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch (_error) {
    return raw.replace(/\/+$/, "");
  }
}

function normalizeListConfig(config = {}) {
  const actions = Array.isArray(config.actions) ? config.actions : [];
  const extractAction = actions.find((item) => String(item?.type || "").toUpperCase() === "EXTRACT_LIST");
  const loadMoreAction = actions.find((item) => String(item?.type || "").toUpperCase() === "LOAD_MORE");

  const speedProfiles = normalizeSpeedProfiles(config.speedProfiles);
  const speedProfileName = String(config.speedProfile || "normal").toLowerCase();
  const profile = speedProfiles[speedProfileName] || speedProfiles.normal;

  const extractConfig = extractAction || config.extractList || {};
  const fields = Array.isArray(extractConfig.fields) ? extractConfig.fields : [];
  const loadMoreConfig = loadMoreAction || config.loadMore || {};
  const hardRoundCap = normalizeHardRoundCap(loadMoreConfig.hardRoundCap);

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
      noChangeThreshold: Number(loadMoreConfig.noChangeThreshold || profile.noChangeThreshold),
      maxRows: normalizeMaxRows(loadMoreConfig.maxRows),
      untilNoMore: normalizeBoolean(loadMoreConfig.untilNoMore, false),
      maxRoundsSafety: normalizeRoundSafetyCap(loadMoreConfig.maxRoundsSafety),
      autoContinueSegments: normalizeBoolean(loadMoreConfig.autoContinueSegments, false),
      autoContinueMaxSegments: normalizeAutoContinueMaxSegments(loadMoreConfig.autoContinueMaxSegments),
      hardRoundCap,
      hardCapAutoContinue: normalizeBoolean(loadMoreConfig.hardCapAutoContinue, false),
      hardCapAutoContinueMaxChains: normalizeAutoContinueMaxSegments(loadMoreConfig.hardCapAutoContinueMaxChains),
      hardRoundAbsoluteLimit: normalizeHardRoundAbsoluteLimit(loadMoreConfig.hardRoundAbsoluteLimit, hardRoundCap)
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
      const hasRowCap = Number(listConfig.loadMore.maxRows || 0) > 0;
      const maxRows = hasRowCap ? normalizeMaxRows(listConfig.loadMore.maxRows) : 0;
      let rowCapHit = false;

      const maxLoadAttempts = Math.max(0, Math.floor(Number(listConfig.loadMore.attempts || 0)));
      const defaultRounds = Math.max(1, maxLoadAttempts + 1);
      const untilNoMore =
        Boolean(listConfig.loadMore.untilNoMore) && listConfig.loadMore.method !== LOAD_MORE_METHODS.NONE;
      const maxRoundsSafety = normalizeRoundSafetyCap(listConfig.loadMore.maxRoundsSafety);
      const segmentRoundBudget =
        untilNoMore ? (maxRoundsSafety > 0 ? Math.max(defaultRounds, maxRoundsSafety) : 160) : defaultRounds;
      let maxRounds = segmentRoundBudget;
      const autoContinueSegments =
        untilNoMore && normalizeBoolean(listConfig.loadMore.autoContinueSegments, false);
      const autoContinueMaxSegments = autoContinueSegments
        ? Math.max(1, normalizeAutoContinueMaxSegments(listConfig.loadMore.autoContinueMaxSegments))
        : 1;
      const hardRoundCap = normalizeHardRoundCap(listConfig.loadMore.hardRoundCap);
      const hardCapAutoContinue =
        untilNoMore && normalizeBoolean(listConfig.loadMore.hardCapAutoContinue, false);
      const hardCapAutoContinueMaxChains = hardCapAutoContinue
        ? Math.max(1, normalizeAutoContinueMaxSegments(listConfig.loadMore.hardCapAutoContinueMaxChains))
        : 1;
      const hardRoundAbsoluteLimit = normalizeHardRoundAbsoluteLimit(
        listConfig.loadMore.hardRoundAbsoluteLimit,
        hardRoundCap
      );
      let effectiveHardRoundCap = hardRoundCap;
      let hardCapAutoContinueUsed = 0;
      let autoContinueSegmentsUsed = 0;
      let rowsAddedInSegment = 0;
      let terminationReason = "unknown";
      const visitedNavigationUrls = new Set();
      const initialTabUrlSignature = normalizeUrlSignature(tab.url || listConfig.startUrl || "");
      if (initialTabUrlSignature) {
        visitedNavigationUrls.add(initialTabUrlSignature);
      }

      for (let roundIndex = 0; roundIndex < maxRounds && roundIndex < effectiveHardRoundCap; roundIndex += 1) {
        throwIfAborted(signal);
        rounds += 1;
        const progress = untilNoMore ? Math.min(95, Math.floor(8 + roundIndex * 3)) : Math.min(95, Math.floor((roundIndex / maxRounds) * 100));

        emitProgress?.({
          progress,
          phase: `Extracting rows (round ${roundIndex + 1}/${maxRounds})`,
          context: {
            loadMoreMethod: listConfig.loadMore.method,
            untilNoMore
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
            if (hasRowCap && rowsByKey.size >= maxRows) {
              rowCapHit = true;
              break;
            }
          }
        }

        if (newRows === 0) {
          noChangeStreak += 1;
        } else {
          noChangeStreak = 0;
        }
        rowsAddedInSegment += newRows;

        const isLastRound = roundIndex >= maxRounds - 1;
        if (rowCapHit) {
          terminationReason = "row_cap";
          break;
        }

        if (listConfig.loadMore.method === LOAD_MORE_METHODS.NONE) {
          terminationReason = "load_more_disabled";
          break;
        }

        if (noChangeStreak >= Math.max(1, Math.floor(Number(listConfig.loadMore.noChangeThreshold || 1)))) {
          terminationReason = "no_change";
          break;
        }

        if (!untilNoMore && isLastRound) {
          terminationReason = "attempt_limit";
          break;
        }

        if (untilNoMore && isLastRound) {
          const reachedHardCapWindow = maxRounds >= effectiveHardRoundCap;
          const canAutoContinue =
            autoContinueSegments &&
            autoContinueSegmentsUsed < autoContinueMaxSegments - 1 &&
            rowsAddedInSegment > 0 &&
            maxRounds < effectiveHardRoundCap;
          if (canAutoContinue) {
            const nextMaxRounds = Math.min(effectiveHardRoundCap, maxRounds + segmentRoundBudget);
            if (nextMaxRounds > maxRounds) {
              autoContinueSegmentsUsed += 1;
              maxRounds = nextMaxRounds;
              rowsAddedInSegment = 0;
              emitProgress?.({
                progress: Math.min(95, Math.floor(10 + autoContinueSegmentsUsed * 2)),
                phase: `Auto-continuing pagination segment ${autoContinueSegmentsUsed + 1}/${autoContinueMaxSegments}`,
                context: {
                  autoContinueSegments,
                  autoContinueSegmentsUsed,
                  autoContinueMaxSegments,
                  hardRoundCap: effectiveHardRoundCap,
                  maxRounds
                }
              });
            } else {
              terminationReason = "hard_round_cap";
              break;
            }
          } else {
            if (!(reachedHardCapWindow && hardCapAutoContinue)) {
              terminationReason = reachedHardCapWindow ? "hard_round_cap" : "round_limit";
              break;
            }
          }
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
        } else if (method === LOAD_MORE_METHODS.CLICK_BUTTON) {
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
            terminationReason = `load_more_click_${String(clickResult.reason || "not_found").trim() || "not_found"}`;
            break;
          }
          await delay(Math.max(150, listConfig.loadMore.delayMs));
        } else if (method === LOAD_MORE_METHODS.NAVIGATE) {
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
            terminationReason = `next_link_${String(nextResult.reason || "not_found").trim() || "not_found"}`;
            break;
          }
          const nextUrlSignature = normalizeUrlSignature(nextResult.nextUrl);
          if (nextUrlSignature && visitedNavigationUrls.has(nextUrlSignature)) {
            terminationReason = "next_link_cycle";
            break;
          }
          if (nextUrlSignature) {
            visitedNavigationUrls.add(nextUrlSignature);
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

        const reachedHardCapBoundary = roundIndex >= effectiveHardRoundCap - 1;
        if (!reachedHardCapBoundary) {
          continue;
        }

        const canHardCapAutoContinue =
          hardCapAutoContinue &&
          hardCapAutoContinueUsed < hardCapAutoContinueMaxChains &&
          rowsAddedInSegment > 0 &&
          noChangeStreak === 0 &&
          effectiveHardRoundCap < hardRoundAbsoluteLimit;
        if (canHardCapAutoContinue) {
          const nextHardRoundCap = Math.min(hardRoundAbsoluteLimit, effectiveHardRoundCap + hardRoundCap);
          if (nextHardRoundCap > effectiveHardRoundCap) {
            hardCapAutoContinueUsed += 1;
            effectiveHardRoundCap = nextHardRoundCap;
            maxRounds = Math.max(maxRounds, effectiveHardRoundCap);
            rowsAddedInSegment = 0;
            emitProgress?.({
              progress: Math.min(95, Math.floor(12 + hardCapAutoContinueUsed * 2)),
              phase: `Auto-continuing safety chain ${hardCapAutoContinueUsed}/${hardCapAutoContinueMaxChains}`,
              context: {
                hardCapAutoContinue,
                hardCapAutoContinueUsed,
                hardCapAutoContinueMaxChains,
                hardRoundCap,
                hardRoundAbsoluteLimit,
                effectiveHardRoundCap
              }
            });
            continue;
          }
        }
        terminationReason = "hard_round_cap";
        break;
      }

      if (terminationReason === "unknown" && rounds >= effectiveHardRoundCap) {
        terminationReason = "hard_round_cap";
      }

      const rows = hasRowCap ? Array.from(rowsByKey.values()).slice(0, maxRows) : Array.from(rowsByKey.values());
      emitProgress?.({
        progress: 100,
        phase: "List extraction completed",
        context: {
          rowCount: rows.length,
          rowCapHit,
          untilNoMore,
          terminationReason,
          autoContinueSegments,
          autoContinueSegmentsUsed,
          autoContinueMaxSegments,
          hardRoundCap,
          hardCapAutoContinue,
          hardCapAutoContinueUsed,
          hardCapAutoContinueMaxChains,
          hardRoundAbsoluteLimit,
          effectiveHardRoundCap,
          visitedNavigationUrlCount: visitedNavigationUrls.size
        }
      });

      return {
        rows,
        summary: {
          rowCount: rows.length,
          rounds,
          loadMoreMethod: listConfig.loadMore.method,
          noChangeStreak,
          maxRows,
          rowCapHit,
          untilNoMore,
          maxRounds,
          segmentRoundBudget,
          autoContinueSegments,
          autoContinueSegmentsUsed,
          autoContinueMaxSegments,
          hardRoundCap,
          hardCapAutoContinue,
          hardCapAutoContinueUsed,
          hardCapAutoContinueMaxChains,
          hardRoundAbsoluteLimit,
          effectiveHardRoundCap,
          visitedNavigationUrlCount: visitedNavigationUrls.size,
          terminationReason
        }
      };
    }
  };
}
