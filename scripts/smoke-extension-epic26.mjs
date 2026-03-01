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
  const hardeningWrapper = await readFile(resolve("scripts/run-hardening-with-flags.mjs"), "utf8");
  const localHardening = await readFile(resolve("scripts/local-hardening-pass.mjs"), "utf8");

  const requiredWorkflowTokens = [
    "run_targeted:",
    "description: \"Run targeted-result cap e2e hardening variant\"",
    "Run Local Hardening (E2E targeted)",
    "inputs.run_targeted == true",
    "npm run test:local:hardening:e2e:targeted",
    "Upload E2E Artifacts (targeted)",
    "extension-e2e-artifacts-targeted",
    "dist/e2e/e2e-targeted-*"
  ];
  for (const token of requiredWorkflowTokens) {
    assert(workflow.includes(token), `missing workflow targeted token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"e2e:extension:targeted\"",
    "\"test:local:hardening:e2e:targeted\"",
    "\"hardening:railway:e2e:targeted\"",
    "\"release:full:e2e:targeted\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package targeted token: ${token}`);
  }

  const requiredWrapperTokens = ["targeted: false", "value === \"--targeted\"", "env.RUN_EXTENSION_E2E_TARGETED = \"true\""];
  for (const token of requiredWrapperTokens) {
    assert(hardeningWrapper.includes(token), `missing hardening wrapper targeted token: ${token}`);
  }

  const requiredLocalTokens = [
    "const runExtensionE2ETargeted = toBool(process.env.RUN_EXTENSION_E2E_TARGETED);",
    "extensionE2ETargeted: false,",
    "label: \"extension e2e targeted\"",
    "[\"run\", \"e2e:extension:targeted\"]"
  ];
  for (const token of requiredLocalTokens) {
    assert(localHardening.includes(token), `missing local hardening targeted token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedWorkflowTokens: requiredWorkflowTokens.length,
        checkedPackageTokens: requiredPackageTokens.length,
        checkedWrapperTokens: requiredWrapperTokens.length,
        checkedLocalTokens: requiredLocalTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic26] failed: ${error.message}`);
  process.exit(1);
});
