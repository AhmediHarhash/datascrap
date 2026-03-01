import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sidepanel = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");
  const orchestrator = await readFile(resolve("packages/core/src/autonomous-orchestrator.mjs"), "utf8");
  const vendorOrchestrator = await readFile(resolve("packages/extension/vendor/core/src/autonomous-orchestrator.mjs"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");

  const sidepanelTokens = [
    "const SMART_PAGINATION_SELECTOR_CANDIDATES = Object.freeze([",
    "const SMART_PAGINATION_NEXT_SELECTOR = SMART_PAGINATION_SELECTOR_CANDIDATES.join(\", \");",
    "function resolveSmartPaginationAutoContinue(listAutopilotOverrides = {}, plan = null) {",
    "const paginationAutoContinue = resolveSmartPaginationAutoContinue(listAutopilotOverrides, plan);",
    "quick_extract_pagination_autocontinue_enabled",
    "Auto-pagination enabled.",
    "paginationAutoContinueEnabled",
    "paginationNextLinkSelector"
  ];
  for (const token of sidepanelTokens) {
    assert(sidepanel.includes(token), `missing sidepanel smart-pagination token: ${token}`);
  }

  const exhaustiveTokens = ["whole website", "entire website", "all pages"];
  for (const token of exhaustiveTokens) {
    assert(orchestrator.includes(token), `missing orchestrator exhaustive-intent token: ${token}`);
    assert(vendorOrchestrator.includes(token), `missing vendor orchestrator exhaustive-intent token: ${token}`);
  }

  const packageTokens = ['"smoke:extension:epic64"', "npm run smoke:extension:epic64"];
  for (const token of packageTokens) {
    assert(packageJson.includes(token), `missing package smart-pagination smoke token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedSidepanelTokens: sidepanelTokens.length,
        checkedExhaustiveTokens: exhaustiveTokens.length,
        checkedPackageTokens: packageTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic64] failed: ${error.message}`);
  process.exit(1);
});
