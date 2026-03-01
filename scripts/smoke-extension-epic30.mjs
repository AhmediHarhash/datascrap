import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const workflow = await readFile(resolve(".github/workflows/extension-hardening.yml"), "utf8");
  const targetedE2E = await readFile(resolve("scripts/e2e-extension-targeted-results.mjs"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");

  const requiredWorkflowTokens = [
    "Upload E2E Artifacts (targeted)",
    "extension-e2e-artifacts-targeted-${{ inputs.targeted_results }}",
    "dist/e2e/e2e-targeted-*"
  ];
  for (const token of requiredWorkflowTokens) {
    assert(workflow.includes(token), `missing targeted artifact tag token: ${token}`);
  }

  const requiredTargetedE2ETokens = ['resolve(artifactsDir, "e2e-targeted-meta.json")'];
  for (const token of requiredTargetedE2ETokens) {
    assert(targetedE2E.includes(token), `missing targeted metadata artifact token: ${token}`);
  }

  const requiredPackageTokens = ['"smoke:extension:epic30"'];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package epic30 token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedWorkflowTokens: requiredWorkflowTokens.length,
        checkedTargetedE2ETokens: requiredTargetedE2ETokens.length,
        checkedPackageTokens: requiredPackageTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic30] failed: ${error.message}`);
  process.exit(1);
});
