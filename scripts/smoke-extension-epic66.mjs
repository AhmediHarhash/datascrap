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
    "intentAutoListUrlEnrichPending: false",
    "intentAutoListUrlEnrichAutomationId: null"
  ];
  for (const token of stateTokens) {
    assert(sidepanel.includes(token), `missing sidepanel url-enrich state token: ${token}`);
  }

  const behaviorTokens = [
    "const AUTO_URL_ENRICHMENT_MAX_URLS = 500;",
    "function resolveUrlsFromTableRows(rows = [], maxUrls = AUTO_URL_ENRICHMENT_MAX_URLS) {",
    "function startIntentListUrlEnrichment(urls = [], sourceAutomationId = \"\") {",
    "quick_extract_url_enrichment_starting",
    "quick_extract_url_enrichment_started",
    "quick_extract_url_enrichment_completed",
    "function maybeHandleIntentListUrlEnrichment(eventPayload = {}) {",
    "const urlEnrichmentTransition = mapsEnrichmentTransition.deferExport",
    "await maybeHandleIntentListUrlEnrichment(eventPayload);",
    "autoUrlEnrichmentPlanned: state.intentAutoListUrlEnrichPending",
    "setRunnerTypeIfAvailable(RUNNER_TYPES.METADATA_EXTRACTOR);"
  ];
  for (const token of behaviorTokens) {
    assert(sidepanel.includes(token), `missing sidepanel url-enrich behavior token: ${token}`);
  }

  const packageTokens = ['\"smoke:extension:epic66\"', "npm run smoke:extension:epic66"];
  for (const token of packageTokens) {
    assert(packageJson.includes(token), `missing package url-enrich smoke token: ${token}`);
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
  console.error(`[smoke-extension-epic66] failed: ${error.message}`);
  process.exit(1);
});
