import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sidepanelJs = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");
  const coreRuntime = await readFile(resolve("packages/core/src/automation-runtime.mjs"), "utf8");
  const vendorRuntime = await readFile(resolve("packages/extension/vendor/core/src/automation-runtime.mjs"), "utf8");

  const requiredSidepanelTokens = [
    "buildDiagnosticsRunArtifactSummary",
    "runArtifactSummary",
    "recentEventSummary",
    "snapshot?.runArtifacts",
    "snapshot?.failedArtifacts"
  ];
  for (const token of requiredSidepanelTokens) {
    assert(sidepanelJs.includes(token), `missing sidepanel diagnostics token: ${token}`);
  }

  const requiredRuntimeTokens = [
    "createErrorPacket",
    "buildEventTaxonomy",
    "recentEventSummary",
    "runArtifacts",
    "failedArtifacts",
    "errorPacket"
  ];
  for (const token of requiredRuntimeTokens) {
    assert(coreRuntime.includes(token), `missing core runtime token: ${token}`);
    assert(vendorRuntime.includes(token), `missing vendor runtime token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedSidepanelTokens: requiredSidepanelTokens.length,
        checkedRuntimeTokens: requiredRuntimeTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic14] failed: ${error.message}`);
  process.exit(1);
});
