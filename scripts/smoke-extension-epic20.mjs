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

  const requiredWorkflowTokens = [
    "run_fallback:",
    "description: \"Run fallback-transition e2e hardening variant\"",
    "Run Local Hardening (E2E fallback)",
    "inputs.run_fallback == true",
    "npm run test:local:hardening:e2e:fallback"
  ];

  for (const token of requiredWorkflowTokens) {
    assert(workflow.includes(token), `missing workflow fallback token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"test:local:hardening:e2e:fallback\"",
    "\"hardening:railway:e2e:fallback\"",
    "\"release:full:e2e:fallback\""
  ];

  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package fallback token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedWorkflowTokens: requiredWorkflowTokens.length,
        checkedPackageTokens: requiredPackageTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic20] failed: ${error.message}`);
  process.exit(1);
});
