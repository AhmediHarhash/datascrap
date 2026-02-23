import { RUNNER_TYPES } from "../../../shared/src/events.mjs";
import { delay, throwIfAborted } from "../utils.mjs";

const DEFAULT_STEPS = [
  { label: "Scanning list container", progress: 15 },
  { label: "Selecting repeating row pattern", progress: 35 },
  { label: "Resolving field selectors", progress: 55 },
  { label: "Running pagination/load-more strategy", progress: 80 },
  { label: "Finalizing result rows", progress: 100 }
];

function buildDefaultRows(sourceUrl) {
  return [
    {
      title: "Sample Row 1",
      price: "$19.00",
      url: sourceUrl || "https://example.com/item-1"
    },
    {
      title: "Sample Row 2",
      price: "$29.00",
      url: sourceUrl || "https://example.com/item-2"
    }
  ];
}

export const listExtractorRunner = Object.freeze({
  type: RUNNER_TYPES.LIST_EXTRACTOR,
  label: "List Extractor",
  permissionOperation: "extract.list",
  async run({ automation, signal, emitProgress }) {
    const stepDelayMs = Number(automation?.config?.stepDelayMs || 250);
    const steps = Array.isArray(automation?.config?.steps) && automation.config.steps.length > 0 ? automation.config.steps : DEFAULT_STEPS;

    for (const step of steps) {
      throwIfAborted(signal);
      emitProgress({
        progress: Number(step.progress || 0),
        phase: step.label || "Processing list extraction"
      });
      await delay(stepDelayMs);
    }

    throwIfAborted(signal);
    const rows = Array.isArray(automation?.config?.rows) && automation.config.rows.length > 0
      ? automation.config.rows
      : buildDefaultRows(automation?.config?.startUrl);

    return {
      rows,
      summary: {
        rowCount: rows.length
      }
    };
  }
});
