import { RUNNER_TYPES } from "../../../shared/src/events.mjs";
import { delay, throwIfAborted } from "../utils.mjs";

export const metadataExtractorRunner = Object.freeze({
  type: RUNNER_TYPES.METADATA_EXTRACTOR,
  label: "Page Metadata Extractor",
  permissionOperation: "extract.metadata",
  async run({ automation, signal, emitProgress, capabilities = {} }) {
    const metadataExtractionEngine = capabilities?.metadataExtractionEngine;
    if (metadataExtractionEngine && typeof metadataExtractionEngine.extractMetadataPages === "function") {
      return metadataExtractionEngine.extractMetadataPages({
        automation,
        config: automation?.config || {},
        signal,
        emitProgress
      });
    }

    const startUrl = String(automation?.config?.startUrl || "https://example.com").trim();
    const stepDelayMs = Number(automation?.config?.stepDelayMs || 220);

    emitProgress({
      progress: 25,
      phase: "Collecting page metadata tags"
    });
    await delay(stepDelayMs);
    throwIfAborted(signal);

    emitProgress({
      progress: 60,
      phase: "Resolving structured metadata"
    });
    await delay(stepDelayMs);
    throwIfAborted(signal);

    emitProgress({
      progress: 90,
      phase: "Preparing final metadata payload"
    });
    await delay(stepDelayMs);
    throwIfAborted(signal);

    const rows = [
      {
        url: startUrl,
        title: "Sample Metadata Title",
        description: "Sample metadata description",
        author: "Unknown",
        publishDate: null,
        reviewCount: 0,
        emailCount: 0,
        phoneCount: 0
      }
    ];

    emitProgress({
      progress: 100,
      phase: "Metadata extraction completed"
    });

    return {
      rows,
      summary: {
        rowCount: rows.length
      }
    };
  }
});
