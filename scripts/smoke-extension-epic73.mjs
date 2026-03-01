import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const navigateCycleE2e = await readFile(resolve("scripts/e2e-extension-navigate-cycle.mjs"), "utf8");
  const hardeningWrapper = await readFile(resolve("scripts/run-hardening-with-flags.mjs"), "utf8");
  const localHardening = await readFile(resolve("scripts/local-hardening-pass.mjs"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");

  const e2eTokens = [
    "E2E_NAV_PAGE_COUNT",
    "E2E_NAV_ROWS_PER_PAGE",
    "runnerType.value = \"listExtractor\"",
    "method.value = \"navigate\"",
    "nextSelector.value = \"#fixture-next\"",
    "terminationReasonExactCycle",
    "terminationReason === \"next_link_cycle\"",
    "visitedNavigationCoverage",
    "e2e-navigate-cycle-result.json"
  ];
  for (const token of e2eTokens) {
    assert(navigateCycleE2e.includes(token), `missing navigate-cycle e2e token: ${token}`);
  }

  const wrapperTokens = [
    "navigateCycle: false,",
    "if (value === \"--navigate-cycle\") {",
    "env.RUN_EXTENSION_E2E_NAVIGATE_CYCLE = \"true\";"
  ];
  for (const token of wrapperTokens) {
    assert(hardeningWrapper.includes(token), `missing hardening wrapper navigate-cycle token: ${token}`);
  }

  const localHardeningTokens = [
    "const runExtensionE2ENavigateCycle = toBool(process.env.RUN_EXTENSION_E2E_NAVIGATE_CYCLE);",
    "extensionE2ENavigateCycle: false,",
    "label: \"extension e2e navigate cycle\"",
    "args: [\"run\", \"e2e:extension:navigate-cycle\"]",
    "summary.extensionE2ENavigateCycle = true;"
  ];
  for (const token of localHardeningTokens) {
    assert(localHardening.includes(token), `missing local hardening navigate-cycle token: ${token}`);
  }

  const packageTokens = [
    "\"e2e:extension:navigate-cycle\": \"node scripts/e2e-extension-navigate-cycle.mjs\"",
    "\"test:local:hardening:e2e:navigate-cycle\": \"node scripts/run-hardening-with-flags.mjs --target=local --navigate-cycle\"",
    "\"hardening:railway:e2e:navigate-cycle\": \"node scripts/run-hardening-with-flags.mjs --target=railway --navigate-cycle\"",
    "\"release:full:e2e:navigate-cycle\": \"npm run hardening:railway:e2e:navigate-cycle && npm run release:extension\"",
    "\"smoke:extension:epic73\": \"node scripts/smoke-extension-epic73.mjs\"",
    "npm run smoke:extension:epic73"
  ];
  for (const token of packageTokens) {
    assert(packageJson.includes(token), `missing package navigate-cycle token: ${token}`);
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
  console.error(`[smoke-extension-epic73] failed: ${error.message}`);
  process.exit(1);
});
