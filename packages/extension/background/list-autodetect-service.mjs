import { executeInTab, getActiveTab } from "./chrome-utils.mjs";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function normalizeOptions(input = {}) {
  return {
    maxFields: clamp(input.maxFields || 6, 1, 12),
    maxPreviewRows: clamp(input.maxPreviewRows || 5, 1, 10),
    minItems: clamp(input.minItems || 3, 2, 20),
    sampleItems: clamp(input.sampleItems || 8, 2, 20),
    anchorSelector: toText(input.anchorSelector).trim()
  };
}

function toText(value) {
  return String(value === undefined || value === null ? "" : value);
}

function normalizeMode(value) {
  const mode = String(value || "text").trim().toLowerCase();
  if (mode === "text" || mode === "link_url" || mode === "image_url" || mode === "attribute") {
    return mode;
  }
  return "text";
}

function normalizeDetectedField(field, index) {
  return {
    name: toText(field?.name || `field_${index + 1}`).trim() || `field_${index + 1}`,
    selector: toText(field?.selector).trim(),
    relativeSelector: toText(field?.relativeSelector).trim(),
    extractMode: normalizeMode(field?.extractMode),
    attribute: toText(field?.attribute).trim(),
    confidence: clamp(field?.confidence || 0.5, 0, 1),
    sampleValues: Array.isArray(field?.sampleValues) ? field.sampleValues.slice(0, 3).map((value) => toText(value)) : []
  };
}

function normalizeLoadMore(input = {}) {
  const method = String(input.method || "none").trim().toLowerCase();
  const normalizedMethod = method === "click_button" || method === "navigate" ? method : "none";
  return {
    method: normalizedMethod,
    buttonSelector: toText(input.buttonSelector).trim(),
    nextLinkSelector: toText(input.nextLinkSelector).trim(),
    confidence: clamp(input.confidence || 0, 0, 1)
  };
}

export async function autodetectListConfig({
  chromeApi = chrome,
  permissionManager,
  options
} = {}) {
  const tab = await getActiveTab(chromeApi);
  if (!tab?.id) {
    throw new Error("No active tab found");
  }

  const access = await permissionManager.ensureOperation("extract.list", {
    url: tab.url
  });
  if (!access?.allowed) {
    throw new Error("Host permission denied by user");
  }

  const normalizedOptions = normalizeOptions(options);

  const injected = await executeInTab({
    tabId: tab.id,
    chromeApi,
    world: "MAIN",
    func: (runtimeOptions) => {
      const startTime = Date.now();

      function clampValue(value, min, max) {
        return Math.max(min, Math.min(max, Number(value || 0)));
      }

      function toFieldName(value, fallback) {
        return String(value || "")
          .toLowerCase()
          .replace(/[^a-z0-9_]+/g, "_")
          .replace(/^_+|_+$/g, "") || fallback;
      }

      function cleanText(value) {
        return String(value || "")
          .replace(/\s+/g, " ")
          .trim();
      }

      function isVisible(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        const style = window.getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity || 1) < 0.05) {
          return false;
        }
        const rect = node.getBoundingClientRect();
        return rect.width >= 4 && rect.height >= 4;
      }

      function cssDescriptor(element) {
        const tagName = String(element.tagName || "").toLowerCase() || "div";
        const parent = element.parentElement;
        if (!parent) return tagName;

        const siblings = Array.from(parent.children).filter((item) => item.tagName === element.tagName);
        if (siblings.length <= 1) return tagName;
        const index = siblings.indexOf(element) + 1;
        return `${tagName}:nth-of-type(${index})`;
      }

      function buildAbsoluteSelector(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return "";
        if (element.id) return `#${CSS.escape(element.id)}`;
        const parts = [];
        let current = element;
        while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
          parts.unshift(cssDescriptor(current));
          current = current.parentElement;
        }
        if (parts.length === 0) return "body";
        return `body > ${parts.join(" > ")}`;
      }

      function buildRelativeSelector(element, anchorElement) {
        if (!element || !anchorElement || !anchorElement.contains(element)) return "";
        if (element === anchorElement) return ":scope";

        const parts = [];
        let current = element;
        while (current && current !== anchorElement) {
          parts.unshift(cssDescriptor(current));
          current = current.parentElement;
        }
        return parts.length === 0 ? ":scope" : parts.join(" > ");
      }

      function getSharedClasses(items) {
        if (!items.length) return [];
        const shared = new Set(Array.from(items[0].classList || []));
        for (const item of items.slice(1, 8)) {
          const classes = new Set(Array.from(item.classList || []));
          for (const value of Array.from(shared)) {
            if (!classes.has(value)) {
              shared.delete(value);
            }
          }
          if (shared.size === 0) break;
        }
        return Array.from(shared).filter(Boolean).slice(0, 2);
      }

      function buildContainerSelector(parent, items) {
        if (!parent || !items.length) {
          return "";
        }
        const parentSelector = buildAbsoluteSelector(parent);
        const tag = String(items[0].tagName || "div").toLowerCase();
        const sharedClasses = getSharedClasses(items);
        const classSuffix = sharedClasses.map((value) => `.${CSS.escape(value)}`).join("");
        const candidates = [
          classSuffix ? `${parentSelector} > ${tag}${classSuffix}` : "",
          `${parentSelector} > ${tag}`
        ].filter(Boolean);

        for (const selector of candidates) {
          const count = document.querySelectorAll(selector).length;
          if (count >= items.length && count <= items.length * 2.5) {
            return selector;
          }
        }
        return `${parentSelector} > ${tag}`;
      }

      function nodeValue(node, mode, attribute) {
        if (!node) return "";
        if (mode === "link_url") {
          return cleanText(node.href || node.getAttribute("href") || "");
        }
        if (mode === "image_url") {
          return cleanText(node.currentSrc || node.src || node.getAttribute("src") || "");
        }
        if (mode === "attribute") {
          return cleanText(node.getAttribute(attribute) || "");
        }
        return cleanText(node.innerText || node.textContent || "");
      }

      function inferMode(node) {
        if (!node) return { mode: "text", attribute: "" };
        if (node.tagName === "A" || node.hasAttribute("href")) {
          return { mode: "link_url", attribute: "" };
        }
        if (node.tagName === "IMG" || node.hasAttribute("src")) {
          return { mode: "image_url", attribute: "" };
        }
        return { mode: "text", attribute: "" };
      }

      function scoreGroup(items, parent) {
        const sampled = items.slice(0, 6);
        const textLengths = sampled.map((item) => cleanText(item.innerText || item.textContent || "").length);
        const avgText = textLengths.length
          ? textLengths.reduce((sum, value) => sum + value, 0) / textLengths.length
          : 0;
        const linkCount = sampled.reduce((sum, item) => sum + item.querySelectorAll("a[href]").length, 0);
        const depth = (() => {
          let current = parent;
          let count = 0;
          while (current && current !== document.body && count < 20) {
            count += 1;
            current = current.parentElement;
          }
          return count;
        })();
        const itemCountScore = Math.min(40, items.length);
        return itemCountScore * 2 + Math.min(35, avgText / 8) + Math.min(20, linkCount / sampled.length) - depth * 0.3;
      }

      function findRepeatingGroups(minItems) {
        const parents = Array.from(document.querySelectorAll("body *"));
        const groups = [];

        for (const parent of parents) {
          const childElements = Array.from(parent.children || []).filter((node) => isVisible(node));
          if (childElements.length < minItems || childElements.length > 200) continue;

          const bySignature = new Map();
          for (const child of childElements) {
            const tag = String(child.tagName || "").toLowerCase();
            const classKey = Array.from(child.classList || []).slice(0, 2).join(".");
            const signature = `${tag}|${classKey}`;
            if (!bySignature.has(signature)) {
              bySignature.set(signature, []);
            }
            bySignature.get(signature).push(child);
          }

          for (const items of bySignature.values()) {
            if (items.length < minItems) continue;
            groups.push({
              parent,
              items,
              score: scoreGroup(items, parent)
            });
          }
        }

        groups.sort((a, b) => b.score - a.score);
        return groups.slice(0, 20);
      }

      function resolveBestGroup(groups, anchorSelector) {
        if (!Array.isArray(groups) || groups.length === 0) {
          return null;
        }
        const selector = String(anchorSelector || "").trim();
        if (!selector) {
          return groups[0];
        }

        let anchorNode = null;
        try {
          anchorNode = document.querySelector(selector);
        } catch (_error) {
          anchorNode = null;
        }
        if (!anchorNode) {
          return groups[0];
        }

        const matches = [];
        for (const group of groups) {
          const hasMatch = Array.isArray(group.items)
            ? group.items.some((item) => item === anchorNode || item.contains(anchorNode) || anchorNode.contains(item))
            : false;
          if (!hasMatch) continue;

          const directContain = Array.isArray(group.items)
            ? group.items.some((item) => item === anchorNode || item.contains(anchorNode))
            : false;
          const scoreBoost = directContain ? 40 : 15;
          matches.push({
            group,
            weightedScore: Number(group.score || 0) + scoreBoost
          });
        }

        if (matches.length === 0) {
          return groups[0];
        }
        matches.sort((a, b) => b.weightedScore - a.weightedScore);
        return matches[0].group;
      }

      function detectFields(items, maxFields, sampleItems) {
        const sampledItems = items.slice(0, sampleItems);
        const anchor = sampledItems[0];
        if (!anchor) return [];

        const nodes = Array.from(anchor.querySelectorAll("*")).filter((node) => isVisible(node)).slice(0, 160);
        const fields = [];
        const seenSelectors = new Set();

        for (const node of nodes) {
          const relativeSelector = buildRelativeSelector(node, anchor);
          if (!relativeSelector || relativeSelector === ":scope" || seenSelectors.has(relativeSelector)) {
            continue;
          }
          seenSelectors.add(relativeSelector);

          const modeInfo = inferMode(node);
          let coverage = 0;
          const samples = [];

          for (const item of sampledItems) {
            const target = item.querySelector(relativeSelector);
            const value = nodeValue(target, modeInfo.mode, modeInfo.attribute);
            if (value) {
              coverage += 1;
              if (samples.length < 3) {
                samples.push(value.slice(0, 120));
              }
            }
          }

          const minCoverage = Math.ceil(sampledItems.length * 0.6);
          if (coverage < minCoverage) continue;

          const uniqueSampleCount = new Set(samples.map((value) => value.toLowerCase())).size;
          const qualityScore = coverage * 2 + uniqueSampleCount + (modeInfo.mode === "text" ? 0.5 : 0);

          if (modeInfo.mode === "text" && samples.length === 0) continue;
          const baseName =
            samples[0] ||
            node.getAttribute("aria-label") ||
            node.getAttribute("title") ||
            node.getAttribute("alt") ||
            node.tagName.toLowerCase();

          fields.push({
            name: toFieldName(baseName.split(" ").slice(0, 3).join("_"), `field_${fields.length + 1}`),
            selector: relativeSelector,
            relativeSelector,
            extractMode: modeInfo.mode,
            attribute: modeInfo.attribute,
            score: qualityScore,
            confidence: clampValue(coverage / sampledItems.length, 0, 1),
            sampleValues: samples
          });
        }

        fields.sort((a, b) => b.score - a.score);
        const selected = [];
        const usedNames = new Set();
        for (const field of fields) {
          let nextName = field.name || `field_${selected.length + 1}`;
          let suffix = 2;
          while (usedNames.has(nextName)) {
            nextName = `${field.name}_${suffix}`;
            suffix += 1;
          }
          usedNames.add(nextName);
          selected.push({
            ...field,
            name: nextName
          });
          if (selected.length >= maxFields) break;
        }
        return selected;
      }

      function buildPreviewRows(items, fields, maxRows) {
        const rows = [];
        for (const item of items.slice(0, maxRows)) {
          const row = {};
          let hasValue = false;
          for (const field of fields) {
            const target = item.querySelector(field.relativeSelector);
            const value = nodeValue(target, field.extractMode, field.attribute);
            row[field.name] = value;
            if (value) {
              hasValue = true;
            }
          }
          if (hasValue) {
            rows.push(row);
          }
        }
        return rows;
      }

      function detectLoadMore() {
        const buttonCandidates = [];
        const linkCandidates = [];
        const tokens = ["load more", "show more", "next", "older"];

        for (const node of Array.from(document.querySelectorAll("button, a"))) {
          if (!isVisible(node)) continue;
          const text = cleanText(node.innerText || node.textContent || "").toLowerCase();
          if (!text) continue;
          let score = 0;
          for (const token of tokens) {
            if (text.includes(token)) score += 1;
          }
          if (score <= 0) continue;
          const selector = buildAbsoluteSelector(node);
          if (!selector) continue;
          if (node.tagName === "A") {
            linkCandidates.push({
              selector,
              score,
              href: cleanText(node.getAttribute("href") || node.href || "")
            });
          } else {
            buttonCandidates.push({
              selector,
              score
            });
          }
        }

        buttonCandidates.sort((a, b) => b.score - a.score);
        linkCandidates.sort((a, b) => b.score - a.score);

        if (buttonCandidates.length > 0) {
          const first = buttonCandidates[0];
          return {
            method: "click_button",
            buttonSelector: first.selector,
            nextLinkSelector: "",
            confidence: clampValue(first.score / 3, 0.1, 1)
          };
        }

        if (linkCandidates.length > 0) {
          const first = linkCandidates[0];
          return {
            method: "navigate",
            buttonSelector: "",
            nextLinkSelector: first.selector,
            confidence: clampValue(first.score / 3, 0.1, 1)
          };
        }

        return {
          method: "none",
          buttonSelector: "",
          nextLinkSelector: "",
          confidence: 0
        };
      }

      const groups = findRepeatingGroups(clampValue(runtimeOptions.minItems, 2, 20));
      if (groups.length === 0) {
        return {
          ok: false,
          error: "No repeating list containers were detected on this page.",
          pageUrl: String(location.href || ""),
          pageTitle: String(document.title || "")
        };
      }

      const best = resolveBestGroup(groups, runtimeOptions.anchorSelector);
      const containerSelector = buildContainerSelector(best.parent, best.items);
      const fields = detectFields(
        best.items,
        clampValue(runtimeOptions.maxFields, 1, 12),
        clampValue(runtimeOptions.sampleItems, 2, 20)
      );

      if (fields.length === 0) {
        return {
          ok: false,
          error: "Container detected but no stable repeating fields were found.",
          pageUrl: String(location.href || ""),
          pageTitle: String(document.title || ""),
          containerSelector,
          containerCount: best.items.length
        };
      }

      const previewRows = buildPreviewRows(best.items, fields, clampValue(runtimeOptions.maxPreviewRows, 1, 10));
      const loadMore = detectLoadMore();
      const confidence = clampValue((Math.min(1, best.items.length / 12) + Math.min(1, fields.length / 6)) / 2, 0, 1);

      return {
        ok: true,
        pageUrl: String(location.href || ""),
        pageTitle: String(document.title || ""),
        containerSelector,
        containerCount: best.items.length,
        fields: fields.map((field) => ({
          name: field.name,
          selector: field.selector,
          relativeSelector: field.relativeSelector,
          extractMode: field.extractMode,
          attribute: field.attribute,
          confidence: field.confidence,
          sampleValues: field.sampleValues
        })),
        previewRows,
        loadMore,
        confidence,
        detectionMs: Math.max(1, Date.now() - startTime)
      };
    },
    args: [normalizedOptions]
  });

  const result = injected?.[0]?.result || {};
  if (!result?.ok) {
    throw new Error(toText(result?.error || "Auto-detect failed"));
  }

  return {
    pageUrl: toText(result.pageUrl),
    pageTitle: toText(result.pageTitle),
    containerSelector: toText(result.containerSelector),
    containerCount: Math.max(0, Number(result.containerCount || 0)),
    confidence: clamp(result.confidence || 0, 0, 1),
    detectionMs: Math.max(1, Number(result.detectionMs || 0)),
    loadMore: normalizeLoadMore(result.loadMore || {}),
    fields: Array.isArray(result.fields) ? result.fields.map(normalizeDetectedField) : [],
    previewRows: Array.isArray(result.previewRows) ? result.previewRows.slice(0, normalizedOptions.maxPreviewRows) : []
  };
}
