import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const orchestratorJs = await readFile(resolve("packages/core/src/autonomous-orchestrator.mjs"), "utf8");
  const sidepanelJs = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");
  const listEngineJs = await readFile(resolve("packages/extension/background/list-extraction-engine.mjs"), "utf8");

  const orchestratorTokens = [
    "const RESULT_TARGET_MAX = 50000;",
    "function parseResultTarget(rawText, lowerText) {",
    "resultTarget,",
    "segments.push(`resultTarget=${resultTarget}`);"
  ];
  for (const token of orchestratorTokens) {
    assert(orchestratorJs.includes(token), `missing orchestrator result-target token: ${token}`);
  }

  const sidepanelTokens = [
    "function resolveIntentResultTarget(intent = {}) {",
    "function buildListAutopilotOverridesFromIntent(intent = {}) {",
    "maxRows: listAutopilotOverrides.maxRows",
    "mapsOptions: {",
    "maxResults: mapsTarget"
  ];
  for (const token of sidepanelTokens) {
    assert(sidepanelJs.includes(token), `missing sidepanel result-target token: ${token}`);
  }

  const listEngineTokens = [
    "function normalizeMaxRows(value) {",
    "maxRows: normalizeMaxRows(loadMoreConfig.maxRows)",
    "const hasRowCap = Number(listConfig.loadMore.maxRows || 0) > 0;",
    "rowCapHit = true;",
    "rowCapHit"
  ];
  for (const token of listEngineTokens) {
    assert(listEngineJs.includes(token), `missing list-engine row-cap token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedOrchestratorTokens: orchestratorTokens.length,
        checkedSidepanelTokens: sidepanelTokens.length,
        checkedListEngineTokens: listEngineTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic23] failed: ${error.message}`);
  process.exit(1);
});
