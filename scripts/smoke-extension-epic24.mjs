import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sidepanelJs = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");
  const listEngineJs = await readFile(resolve("packages/extension/background/list-extraction-engine.mjs"), "utf8");

  const sidepanelTokens = [
    "const smartExhaustiveDefault = Boolean(intent?.wantsExtract && resultTarget <= 0);",
    "const untilNoMore = Boolean(intent?.wantsExhaustive || resultTarget > 0 || smartExhaustiveDefault);",
    "maxRoundsSafety = clamp(Math.max(maxRoundsSafety, 220), 1, 320);",
    "maxRoundsSafety = clamp(Math.max(maxRoundsSafety, 240), 1, 320);",
    "untilNoMore: listAutopilotOverrides.untilNoMore",
    "maxRoundsSafety: listAutopilotOverrides.maxRoundsSafety",
    "Smart mode default: running until no more results."
  ];
  for (const token of sidepanelTokens) {
    assert(sidepanelJs.includes(token), `missing sidepanel exhaustive token: ${token}`);
  }

  const listEngineTokens = [
    "function normalizeRoundSafetyCap(value) {",
    "untilNoMore: normalizeBoolean(loadMoreConfig.untilNoMore, false),",
    "const untilNoMore =",
    "maxRoundsSafety = normalizeRoundSafetyCap(listConfig.loadMore.maxRoundsSafety);",
    "if (!untilNoMore && isLastRound) {",
    "untilNoMore,"
  ];
  for (const token of listEngineTokens) {
    assert(listEngineJs.includes(token), `missing list-engine exhaustive token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedSidepanelTokens: sidepanelTokens.length,
        checkedListEngineTokens: listEngineTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic24] failed: ${error.message}`);
  process.exit(1);
});
