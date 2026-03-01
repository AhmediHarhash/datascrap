import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const workflow = await readFile(resolve(".github/workflows/extension-hardening.yml"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");
  const inputValidation = await readFile(resolve("scripts/validate-long-pagination-input.mjs"), "utf8");

  const workflowTokens = [
    "run_long_pagination:",
    "description: \"Run long-pagination e2e hardening variant\"",
    "long_total_rows:",
    "long_batch_size:",
    "Validate Long Pagination Inputs",
    "node scripts/validate-long-pagination-input.mjs",
    "Run Local Hardening (E2E long pagination)",
    "inputs.run_long_pagination == true",
    "npm run test:local:hardening:e2e:long-pagination",
    "Upload E2E Artifacts (long pagination)",
    "extension-e2e-artifacts-long-pagination-${{ inputs.long_total_rows }}r-${{ inputs.long_batch_size }}b",
    "dist/e2e/e2e-long-pagination-*"
  ];
  for (const token of workflowTokens) {
    assert(workflow.includes(token), `missing workflow long-pagination token: ${token}`);
  }

  const packageTokens = [
    "\"e2e:extension:long-pagination\": \"node scripts/e2e-extension-long-pagination.mjs\"",
    "\"test:local:hardening:e2e:long-pagination\": \"node scripts/run-hardening-with-flags.mjs --target=local --long-pagination\"",
    "\"hardening:railway:e2e:long-pagination\": \"node scripts/run-hardening-with-flags.mjs --target=railway --long-pagination\"",
    "\"release:full:e2e:long-pagination\": \"npm run hardening:railway:e2e:long-pagination && npm run release:extension\"",
    "\"smoke:extension:epic71\": \"node scripts/smoke-extension-epic71.mjs\"",
    "npm run smoke:extension:epic71"
  ];
  for (const token of packageTokens) {
    assert(packageJson.includes(token), `missing package long-pagination CI token: ${token}`);
  }

  const inputValidationTokens = [
    "const LONG_TOTAL_ROWS_MIN = 300;",
    "const LONG_TOTAL_ROWS_MAX = 5000;",
    "const LONG_BATCH_SIZE_MIN = 1;",
    "const LONG_BATCH_SIZE_MAX = 24;",
    "label: \"long_total_rows\"",
    "label: \"long_batch_size\""
  ];
  for (const token of inputValidationTokens) {
    assert(inputValidation.includes(token), `missing long-pagination input validation token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedWorkflowTokens: workflowTokens.length,
        checkedPackageTokens: packageTokens.length,
        checkedInputValidationTokens: inputValidationTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic71] failed: ${error.message}`);
  process.exit(1);
});
