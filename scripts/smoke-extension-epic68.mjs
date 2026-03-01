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
    "const LIST_AUTOCONTINUE_SEGMENTS_EXHAUSTIVE = 40;",
    "const LIST_AUTOCONTINUE_HARD_ROUND_CAP_EXHAUSTIVE = 10000;",
    "const explicitExhaustive = Boolean(intent?.wantsExhaustive);",
    "LIST_AUTOCONTINUE_SEGMENTS_EXHAUSTIVE",
    "LIST_AUTOCONTINUE_HARD_ROUND_CAP_EXHAUSTIVE",
    "Extraction stopped after detecting pagination loop"
  ];
  for (const token of sidepanelTokens) {
    assert(sidepanel.includes(token), `missing sidepanel deep-exhaustive token: ${token}`);
  }

  const listEngineTokens = [
    "function normalizeUrlSignature(value) {",
    "const visitedNavigationUrls = new Set();",
    "const nextUrlSignature = normalizeUrlSignature(nextResult.nextUrl);",
    "visitedNavigationUrls.has(nextUrlSignature)",
    "terminationReason = \"next_link_cycle\";",
    "visitedNavigationUrlCount"
  ];
  for (const token of listEngineTokens) {
    assert(listEngine.includes(token), `missing list engine loop-guard token: ${token}`);
  }

  const packageTokens = ['\"smoke:extension:epic68\"', "npm run smoke:extension:epic68"];
  for (const token of packageTokens) {
    assert(packageJson.includes(token), `missing package deep-exhaustive smoke token: ${token}`);
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
  console.error(`[smoke-extension-epic68] failed: ${error.message}`);
  process.exit(1);
});
