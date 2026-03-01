import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const workflow = await readFile(resolve(".github/workflows/extension-hardening.yml"), "utf8");
  const hardeningWrapper = await readFile(resolve("scripts/run-hardening-with-flags.mjs"), "utf8");

  const requiredWorkflowTokens = [
    "targeted_results:",
    "description: \"Targeted e2e result cap (1-500)\"",
    "default: \"12\"",
    "E2E_TARGET_RESULTS: ${{ inputs.targeted_results }}"
  ];
  for (const token of requiredWorkflowTokens) {
    assert(workflow.includes(token), `missing workflow targeted-results token: ${token}`);
  }

  const requiredWrapperTokens = [
    "targetResults: \"\"",
    "value.startsWith(\"--target-results=\")",
    "options.targetResults = parseTargetResults(raw, \"--target-results\");",
    "env.E2E_TARGET_RESULTS = String(options.targetResults);"
  ];
  for (const token of requiredWrapperTokens) {
    assert(hardeningWrapper.includes(token), `missing wrapper targeted-results token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedWorkflowTokens: requiredWorkflowTokens.length,
        checkedWrapperTokens: requiredWrapperTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic27] failed: ${error.message}`);
  process.exit(1);
});
