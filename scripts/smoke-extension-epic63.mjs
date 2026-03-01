import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sidepanel = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");
  const sidepanelHtml = await readFile(resolve("packages/extension/sidepanel/index.html"), "utf8");
  const orchestrator = await readFile(resolve("packages/core/src/autonomous-orchestrator.mjs"), "utf8");
  const vendorOrchestrator = await readFile(resolve("packages/extension/vendor/core/src/autonomous-orchestrator.mjs"), "utf8");
  const pageEngine = await readFile(resolve("packages/extension/background/page-extraction-engine.mjs"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");

  const sidepanelTokens = [
    "const smartExhaustiveDefault = Boolean(intent?.wantsExtract && resultTarget <= 0);",
    "const untilNoMore = Boolean(intent?.wantsExhaustive || resultTarget > 0 || smartExhaustiveDefault);",
    "maxRoundsSafety = clamp(Math.max(maxRoundsSafety, 240), 1, 320);",
    "Smart mode default: running until no more results.",
    "const mapsMaxScrollSteps = mapsSmartExhaustiveDefault ? 500 : 220;",
    "maxScrollSteps: mapsMaxScrollSteps",
    "return clamp(parseNumber(intent?.resultTarget, 0), 0, 50000);"
  ];
  for (const token of sidepanelTokens) {
    assert(sidepanel.includes(token), `missing sidepanel smart-exhaustive token: ${token}`);
  }

  const htmlTokens = [
    "placeholder=\"Type command: find home service businesses in Miami\"",
    "Example: find home service businesses in Miami."
  ];
  for (const token of htmlTokens) {
    assert(sidepanelHtml.includes(token), `missing sidepanel html smart-default token: ${token}`);
  }

  const orchestratorTokens = [
    "const RESULT_TARGET_MAX = 50000;",
    "(\\d{1,5})"
  ];
  for (const token of orchestratorTokens) {
    assert(orchestrator.includes(token), `missing orchestrator target-range token: ${token}`);
    assert(vendorOrchestrator.includes(token), `missing vendor orchestrator target-range token: ${token}`);
  }

  const pageTokens = ["clamp(requestedMaxResults, 0, 50000, 2000)"];
  for (const token of pageTokens) {
    assert(pageEngine.includes(token), `missing page-engine maps max-results token: ${token}`);
  }

  const packageTokens = ['"smoke:extension:epic63"', "npm run smoke:extension:epic63"];
  for (const token of packageTokens) {
    assert(packageJson.includes(token), `missing package smart-exhaustive smoke token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedSidepanelTokens: sidepanelTokens.length,
        checkedHtmlTokens: htmlTokens.length,
        checkedOrchestratorTokens: orchestratorTokens.length,
        checkedPageTokens: pageTokens.length,
        checkedPackageTokens: packageTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic63] failed: ${error.message}`);
  process.exit(1);
});
