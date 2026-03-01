import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const coreIndex = await readFile(resolve("packages/core/src/index.mjs"), "utf8");
  const vendorIndex = await readFile(resolve("packages/extension/vendor/core/src/index.mjs"), "utf8");
  const coreOrchestrator = await readFile(resolve("packages/core/src/autonomous-orchestrator.mjs"), "utf8");
  const vendorOrchestrator = await readFile(resolve("packages/extension/vendor/core/src/autonomous-orchestrator.mjs"), "utf8");
  const sidepanelJs = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");

  assert(
    coreIndex.includes("export * from \"./autonomous-orchestrator.mjs\";"),
    "missing autonomous-orchestrator export in core index"
  );
  assert(
    vendorIndex.includes("export * from \"./autonomous-orchestrator.mjs\";"),
    "missing autonomous-orchestrator export in vendor core index"
  );

  const requiredOrchestratorTokens = [
    "ORCHESTRATION_STRATEGIES",
    "parseAutonomousGoal(",
    "createAutonomousExecutionPlan(",
    "summarizeAutonomousPlan("
  ];

  for (const token of requiredOrchestratorTokens) {
    assert(coreOrchestrator.includes(token), `missing core orchestrator token: ${token}`);
    assert(vendorOrchestrator.includes(token), `missing vendor orchestrator token: ${token}`);
  }

  const requiredSidepanelTokens = [
    "createAutonomousExecutionPlan",
    "setOrchestrationPhase(",
    "navigateActiveTabToUrl(",
    "lastOrchestrationPlan"
  ];

  for (const token of requiredSidepanelTokens) {
    assert(sidepanelJs.includes(token), `missing sidepanel orchestration token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedOrchestratorTokens: requiredOrchestratorTokens.length,
        checkedSidepanelTokens: requiredSidepanelTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic16] failed: ${error.message}`);
  process.exit(1);
});
