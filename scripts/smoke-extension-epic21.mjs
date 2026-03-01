import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const workflow = await readFile(resolve(".github/workflows/extension-hardening.yml"), "utf8");
  const simpleE2E = await readFile(resolve("scripts/e2e-extension-simple.mjs"), "utf8");

  const requiredWorkflowTokens = [
    "fallback_command:",
    "description: \"Fallback e2e command text\"",
    "E2E_FALLBACK_COMMAND: ${{ inputs.fallback_command }}",
    "Upload E2E Artifacts (simple)",
    "extension-e2e-artifacts-simple",
    "dist/e2e/e2e-simple-*",
    "Upload E2E Artifacts (maps)",
    "extension-e2e-artifacts-maps",
    "dist/e2e/e2e-maps-*",
    "Upload E2E Artifacts (fallback)",
    "extension-e2e-artifacts-fallback",
    "dist/e2e/e2e-fallback-*"
  ];

  for (const token of requiredWorkflowTokens) {
    assert(workflow.includes(token), `missing workflow split-artifact token: ${token}`);
  }

  const requiredSimpleE2ETokens = [
    "const artifactsDir = resolve(\"dist\", \"e2e\")",
    "e2e-simple-sidepanel.png",
    "e2e-simple-result.json",
    "e2e-simple-error.txt"
  ];

  for (const token of requiredSimpleE2ETokens) {
    assert(simpleE2E.includes(token), `missing simple e2e artifact token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedWorkflowTokens: requiredWorkflowTokens.length,
        checkedSimpleE2ETokens: requiredSimpleE2ETokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic21] failed: ${error.message}`);
  process.exit(1);
});
