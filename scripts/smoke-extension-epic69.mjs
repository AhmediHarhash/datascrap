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
    "const LIST_HARDCAP_AUTOCONTINUE_CHAINS_DEFAULT = 3;",
    "const LIST_HARDCAP_AUTOCONTINUE_CHAINS_EXHAUSTIVE = 5;",
    "const LIST_HARDCAP_ABSOLUTE_LIMIT_EXHAUSTIVE = 50000;",
    "hardCapAutoContinue = true;",
    "hardCapAutoContinueMaxChains = explicitExhaustive",
    "hardRoundAbsoluteLimit = explicitExhaustive",
    "hardCapAutoContinue: Boolean(loadMoreOverrides.hardCapAutoContinue),",
    "hardCapAutoContinueMaxChains: clamp(parseNumber(loadMoreOverrides.hardCapAutoContinueMaxChains, 1), 1, 20),",
    "hardRoundAbsoluteLimit: clamp(parseNumber(loadMoreOverrides.hardRoundAbsoluteLimit, 5000), 100, 50000)",
    "Hard-cap auto-resume enabled"
  ];
  for (const token of sidepanelTokens) {
    assert(sidepanel.includes(token), `missing sidepanel hardcap-chain token: ${token}`);
  }

  const listEngineTokens = [
    "function normalizeHardRoundAbsoluteLimit(value, fallback = 5000) {",
    "hardCapAutoContinue: normalizeBoolean(loadMoreConfig.hardCapAutoContinue, false),",
    "hardCapAutoContinueMaxChains: normalizeAutoContinueMaxSegments(loadMoreConfig.hardCapAutoContinueMaxChains),",
    "hardRoundAbsoluteLimit: normalizeHardRoundAbsoluteLimit(loadMoreConfig.hardRoundAbsoluteLimit, hardRoundCap)",
    "const hardCapAutoContinue =",
    "const hardRoundAbsoluteLimit = normalizeHardRoundAbsoluteLimit(",
    "Auto-continuing safety chain",
    "hardCapAutoContinueUsed",
    "effectiveHardRoundCap"
  ];
  for (const token of listEngineTokens) {
    assert(listEngine.includes(token), `missing list engine hardcap-chain token: ${token}`);
  }

  const packageTokens = ['"smoke:extension:epic69"', "npm run smoke:extension:epic69"];
  for (const token of packageTokens) {
    assert(packageJson.includes(token), `missing package hardcap-chain smoke token: ${token}`);
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
  console.error(`[smoke-extension-epic69] failed: ${error.message}`);
  process.exit(1);
});
