import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const workflow = await readFile(resolve(".github/workflows/extension-hardening.yml"), "utf8");
  const wrapper = await readFile(resolve("scripts/run-hardening-with-flags.mjs"), "utf8");
  const localHardening = await readFile(resolve("scripts/local-hardening-pass.mjs"), "utf8");
  const targetedE2E = await readFile(resolve("scripts/e2e-extension-targeted-results.mjs"), "utf8");
  const validationScript = await readFile(resolve("scripts/validate-targeted-results-input.mjs"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");

  const requiredWorkflowTokens = [
    "Validate Targeted Results Input",
    "TARGETED_RESULTS_INPUT: ${{ inputs.targeted_results }}",
    "node scripts/validate-targeted-results-input.mjs"
  ];
  for (const token of requiredWorkflowTokens) {
    assert(workflow.includes(token), `missing workflow targeted-validation token: ${token}`);
  }

  const requiredWrapperTokens = [
    "const TARGET_RESULTS_MIN = 1;",
    "const TARGET_RESULTS_MAX = 500;",
    "function parseTargetResults(rawValue, argName = \"--target-results\")",
    "options.hasTargetResultsOverride = true;",
    "--target-results can only be used together with --targeted"
  ];
  for (const token of requiredWrapperTokens) {
    assert(wrapper.includes(token), `missing wrapper strict-cap token: ${token}`);
  }

  const requiredLocalTokens = [
    "function parseTargetedResultsEnv(rawValue) {",
    "extensionE2ETargetResults: null,",
    "summary.extensionE2ETargetResults = targetedResultsOverride ? Number(targetedResultsOverride) : 12;"
  ];
  for (const token of requiredLocalTokens) {
    assert(localHardening.includes(token), `missing local hardening targeted-cap token: ${token}`);
  }

  const requiredTargetedE2ETokens = [
    "const TARGET_RESULTS_DEFAULT = 12;",
    "parseTargetResultsFromEnv(",
    "rowCountExactTarget: finalRowCount === expectedRowCount,",
    "e2e-targeted-meta.json"
  ];
  for (const token of requiredTargetedE2ETokens) {
    assert(targetedE2E.includes(token), `missing targeted e2e exact-cap token: ${token}`);
  }

  const requiredValidationScriptTokens = [
    "targeted_results must be an integer",
    "targeted_results must be in",
    "TARGETED_RESULTS_INPUT"
  ];
  for (const token of requiredValidationScriptTokens) {
    assert(validationScript.includes(token), `missing targeted input validator token: ${token}`);
  }

  const requiredPackageTokens = ["\"smoke:extension:epic28\""];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package epic28 token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedWorkflowTokens: requiredWorkflowTokens.length,
        checkedWrapperTokens: requiredWrapperTokens.length,
        checkedLocalTokens: requiredLocalTokens.length,
        checkedTargetedE2ETokens: requiredTargetedE2ETokens.length,
        checkedValidationScriptTokens: requiredValidationScriptTokens.length,
        checkedPackageTokens: requiredPackageTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic28] failed: ${error.message}`);
  process.exit(1);
});
