import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const localPlaybook = await readFile(resolve("docs/local-test-hardening-playbook-2026-02-23.md"), "utf8");
  const releasePlaybook = await readFile(resolve("docs/extension-release-playbook-2026-02-23.md"), "utf8");
  const readinessDoc = await readFile(resolve("docs/production-test-readiness-2026-02-23.md"), "utf8");
  const phaseGateDoc = await readFile(resolve("docs/phase11-sprintA-e2e-gate-command-slice-2026-02-24.md"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");

  const localTokens = [
    "npm run test:local:hardening:e2e:long-pagination",
    "npm run hardening:railway:e2e:long-pagination",
    "RUN_EXTENSION_E2E_LONG_PAGINATION=true",
    "E2E_LONG_TOTAL_ROWS=1500",
    "E2E_LONG_BATCH_SIZE=6",
    "run_long_pagination=true",
    "long_total_rows",
    "long_batch_size",
    "Validate Long Pagination Inputs",
    "extension-e2e-artifacts-long-pagination-<long_total_rows>r-<long_batch_size>b"
  ];
  for (const token of localTokens) {
    assert(localPlaybook.includes(token), `missing local playbook long-pagination token: ${token}`);
  }

  const releaseTokens = [
    "npm run release:full:e2e:long-pagination",
    "run_long_pagination=true",
    "long_total_rows=<n>",
    "long_batch_size=<n>",
    "extension-e2e-artifacts-long-pagination-<long_total_rows>r-<long_batch_size>b"
  ];
  for (const token of releaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook long-pagination token: ${token}`);
  }

  const readinessTokens = [
    "npm run test:local:hardening:e2e:long-pagination",
    "npm run hardening:railway:e2e:long-pagination",
    "npm run e2e:extension:long-pagination",
    "npm run release:full:e2e:long-pagination",
    "run_long_pagination=true",
    "long_total_rows=<n>",
    "long_batch_size=<n>",
    "extension-e2e-artifacts-long-pagination-<long_total_rows>r-<long_batch_size>b",
    "dist/e2e/e2e-long-pagination-result.json"
  ];
  for (const token of readinessTokens) {
    assert(readinessDoc.includes(token), `missing readiness long-pagination token: ${token}`);
  }

  const phaseGateTokens = [
    "--long-pagination",
    "RUN_EXTENSION_E2E_LONG_PAGINATION=true",
    "test:local:hardening:e2e:long-pagination",
    "hardening:railway:e2e:long-pagination",
    "release:full:e2e:long-pagination",
    "run_long_pagination",
    "long_total_rows",
    "long_batch_size",
    "extension-e2e-artifacts-long-pagination-<long_total_rows>r-<long_batch_size>b"
  ];
  for (const token of phaseGateTokens) {
    assert(phaseGateDoc.includes(token), `missing phase gate long-pagination token: ${token}`);
  }

  const packageTokens = ['"smoke:extension:epic72"', "npm run smoke:extension:epic72"];
  for (const token of packageTokens) {
    assert(packageJson.includes(token), `missing package long-pagination docs smoke token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedLocalTokens: localTokens.length,
        checkedReleaseTokens: releaseTokens.length,
        checkedReadinessTokens: readinessTokens.length,
        checkedPhaseGateTokens: phaseGateTokens.length,
        checkedPackageTokens: packageTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic72] failed: ${error.message}`);
  process.exit(1);
});
