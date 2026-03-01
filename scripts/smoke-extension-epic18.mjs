import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sidepanelJs = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");

  const requiredFallbackTokens = [
    "const runPointFollowFallback = async",
    "const runListAutodetectAutopilot = async",
    "trackUiEvent(\"quick_extract_fallback\"",
    "fromStrategy: \"page_autopilot\"",
    "fromStrategy: \"maps_autopilot\"",
    "const guidedReady = await onPointAndFollow();",
    "setStatus(AUTOMATION_STATES.IDLE);",
    "return true;",
    "return false;"
  ];

  for (const token of requiredFallbackTokens) {
    assert(sidepanelJs.includes(token), `missing fallback orchestration token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedFallbackTokens: requiredFallbackTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic18] failed: ${error.message}`);
  process.exit(1);
});
