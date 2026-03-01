import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sidepanel = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");

  const stateTokens = [
    "intentAutoMapsDetailEnrichPending: false",
    "intentAutoMapsDetailEnrichAutomationId: null"
  ];
  for (const token of stateTokens) {
    assert(sidepanel.includes(token), `missing sidepanel maps-enrich state token: ${token}`);
  }

  const behaviorTokens = [
    "function resolveMapsPlaceUrlsFromSummary(summary = {}) {",
    "function startIntentMapsDetailEnrichment(urls = [], sourceAutomationId = \"\") {",
    "quick_extract_maps_enrichment_starting",
    "quick_extract_maps_enrichment_started",
    "quick_extract_maps_enrichment_completed",
    "function maybeHandleIntentMapsDetailEnrichment(eventPayload = {}) {",
    "const mapsEnrichmentTransition = await maybeHandleIntentMapsDetailEnrichment(eventPayload);",
    "if (state.intentAutoExport && !mapsEnrichmentTransition.deferExport && !urlEnrichmentTransition.deferExport)",
    "autoMapDetailsEnrichPlanned",
    "autoScrollResults: false",
    "untilNoMore: false"
  ];
  for (const token of behaviorTokens) {
    assert(sidepanel.includes(token), `missing sidepanel maps-enrich behavior token: ${token}`);
  }

  const packageTokens = ['"smoke:extension:epic65"', "npm run smoke:extension:epic65"];
  for (const token of packageTokens) {
    assert(packageJson.includes(token), `missing package maps-enrich smoke token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedStateTokens: stateTokens.length,
        checkedBehaviorTokens: behaviorTokens.length,
        checkedPackageTokens: packageTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic65] failed: ${error.message}`);
  process.exit(1);
});
