import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const longPaginationE2e = await readFile(resolve("scripts/e2e-extension-long-pagination.mjs"), "utf8");
  const hardeningWrapper = await readFile(resolve("scripts/run-hardening-with-flags.mjs"), "utf8");
  const localHardening = await readFile(resolve("scripts/local-hardening-pass.mjs"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");

  const e2eTokens = [
    "const REQUIRED_ROUNDS_FOR_SEGMENT = 230;",
    "const LOAD_MORE_DELAY_OVERRIDE_MS = 100;",
    "const commandText = `extract all results from ${targetUrl} until no more across whole website`;",
    "rowCountOverLegacyCap",
    "segmentedContinuationObserved",
    "\"autoContinueSegmentsUsed\"",
    "\"hardCapAutoContinue\""
  ];
  for (const token of e2eTokens) {
    assert(longPaginationE2e.includes(token), `missing long-pagination e2e token: ${token}`);
  }

  const wrapperTokens = [
    "longPagination: false,",
    "if (value === \"--long-pagination\") {",
    "env.RUN_EXTENSION_E2E_LONG_PAGINATION = \"true\";"
  ];
  for (const token of wrapperTokens) {
    assert(hardeningWrapper.includes(token), `missing hardening wrapper long-pagination token: ${token}`);
  }

  const localHardeningTokens = [
    "const runExtensionE2ELongPagination = toBool(process.env.RUN_EXTENSION_E2E_LONG_PAGINATION);",
    "extensionE2ELongPagination: false,",
    "label: \"extension e2e long pagination\"",
    "args: [\"run\", \"e2e:extension:long-pagination\"]",
    "summary.extensionE2ELongPagination = true;"
  ];
  for (const token of localHardeningTokens) {
    assert(localHardening.includes(token), `missing local hardening long-pagination token: ${token}`);
  }

  const packageTokens = [
    "\"e2e:extension:long-pagination\": \"node scripts/e2e-extension-long-pagination.mjs\"",
    "\"smoke:extension:epic70\": \"node scripts/smoke-extension-epic70.mjs\"",
    "\"test:local:hardening:e2e:long-pagination\": \"node scripts/run-hardening-with-flags.mjs --target=local --long-pagination\"",
    "\"hardening:railway:e2e:long-pagination\": \"node scripts/run-hardening-with-flags.mjs --target=railway --long-pagination\"",
    "\"release:full:e2e:long-pagination\": \"npm run hardening:railway:e2e:long-pagination && npm run release:extension\"",
    "npm run smoke:extension:epic70"
  ];
  for (const token of packageTokens) {
    assert(packageJson.includes(token), `missing package long-pagination token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedE2ETokens: e2eTokens.length,
        checkedWrapperTokens: wrapperTokens.length,
        checkedLocalHardeningTokens: localHardeningTokens.length,
        checkedPackageTokens: packageTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic70] failed: ${error.message}`);
  process.exit(1);
});
