import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sidepanelJs = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");

  const requiredTokens = [
    "const DOMAIN_AUTONOMY_HINTS_STORAGE_KEY",
    "const DOMAIN_AUTONOMY_HINT_TTL_MS",
    "function loadDomainAutonomyHintsFromStorage()",
    "function applyDomainAutonomyHintToPlan(plan",
    "function rememberDomainAutonomyHint(strategy",
    "state.domainAutonomyHints = loadDomainAutonomyHintsFromStorage();",
    "const domainHintResult = applyDomainAutonomyHintToPlan(plan",
    "plan.domainHintApplied",
    "point_follow_required",
    "list_autodetect_started"
  ];

  for (const token of requiredTokens) {
    assert(sidepanelJs.includes(token), `missing domain-autonomy token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedTokens: requiredTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic22] failed: ${error.message}`);
  process.exit(1);
});
