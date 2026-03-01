import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sidepanel = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");
  const listEngine = await readFile(resolve("packages/extension/background/list-extraction-engine.mjs"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");

  const sidepanelTokens = [
    "const LIST_AUTOCONTINUE_SEGMENTS_DEFAULT = 24;",
    "const LIST_AUTOCONTINUE_HARD_ROUND_CAP_DEFAULT = 5000;",
    "autoContinueSegments = true;",
    "LIST_AUTOCONTINUE_SEGMENTS_DEFAULT;",
    "LIST_AUTOCONTINUE_HARD_ROUND_CAP_DEFAULT;",
    "Segmented auto-continue enabled",
    "autoContinueSegments: listAutopilotOverrides.autoContinueSegments,",
    "autoContinueMaxSegments: listAutopilotOverrides.autoContinueMaxSegments,",
    "hardRoundCap: listAutopilotOverrides.hardRoundCap"
  ];
  for (const token of sidepanelTokens) {
    assert(sidepanel.includes(token), `missing sidepanel segmented-autocontinue token: ${token}`);
  }

  const listEngineTokens = [
    "autoContinueSegments: normalizeBoolean(loadMoreConfig.autoContinueSegments, false),",
    "autoContinueMaxSegments: normalizeAutoContinueMaxSegments(loadMoreConfig.autoContinueMaxSegments),",
    "const hardRoundCap = normalizeHardRoundCap(loadMoreConfig.hardRoundCap);",
    "hardRoundCap,",
    "const autoContinueSegments =",
    "const autoContinueMaxSegments = autoContinueSegments",
    "const hardRoundCap = normalizeHardRoundCap(listConfig.loadMore.hardRoundCap);",
    "Auto-continuing pagination segment",
    "autoContinueSegmentsUsed",
    "terminationReason",
    "hard_round_cap"
  ];
  for (const token of listEngineTokens) {
    assert(listEngine.includes(token), `missing list engine segmented-autocontinue token: ${token}`);
  }

  const packageTokens = ['"smoke:extension:epic67"', "npm run smoke:extension:epic67"];
  for (const token of packageTokens) {
    assert(packageJson.includes(token), `missing package segmented-autocontinue smoke token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedSidepanelTokens: sidepanelTokens.length,
        checkedListEngineTokens: listEngineTokens.length,
        checkedPackageTokens: packageTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic67] failed: ${error.message}`);
  process.exit(1);
});
