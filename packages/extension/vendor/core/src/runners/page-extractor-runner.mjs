import { RUNNER_TYPES } from "../../../shared/src/events.mjs";
import { delay, throwIfAborted } from "../utils.mjs";

function normalizeUrls(config = {}) {
  const rawUrls = Array.isArray(config.urls) ? config.urls : [];
  const cleaned = rawUrls.map((url) => String(url || "").trim()).filter(Boolean);
  if (cleaned.length > 0) return cleaned;

  const single = String(config.startUrl || "").trim();
  if (single) return [single];
  return [];
}

export const pageExtractorRunner = Object.freeze({
  type: RUNNER_TYPES.PAGE_EXTRACTOR,
  label: "Page Details Extractor",
  permissionOperation: "extract.page",
  async run({ automation, signal, emitProgress, capabilities = {} }) {
    const pageExtractionEngine = capabilities?.pageExtractionEngine;
    if (pageExtractionEngine && typeof pageExtractionEngine.extractPages === "function") {
      return pageExtractionEngine.extractPages({
        automation,
        config: automation?.config || {},
        signal,
        emitProgress
      });
    }

    const urls = normalizeUrls(automation?.config || {});
    if (urls.length === 0) {
      return {
        rows: [],
        summary: {
          rowCount: 0,
          urlCount: 0
        }
      };
    }

    const stepDelayMs = Number(automation?.config?.stepDelayMs || 300);
    const rows = [];
    for (let index = 0; index < urls.length; index += 1) {
      throwIfAborted(signal);
      const url = urls[index];
      const progress = Math.min(100, Math.floor(((index + 1) / urls.length) * 100));
      emitProgress({
        progress,
        phase: `Extracting page ${index + 1}/${urls.length}`,
        context: {
          url
        }
      });
      await delay(stepDelayMs);

      rows.push({
        url,
        title: `Extracted Title ${index + 1}`,
        price: `$${(index + 1) * 10}.00`,
        description: `Extracted details from ${url}`
      });
    }

    return {
      rows,
      summary: {
        rowCount: rows.length,
        urlCount: urls.length
      }
    };
  }
});
