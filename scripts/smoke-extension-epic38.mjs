import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const hygieneScript = await readFile(resolve("services/control-api/scripts/schedule-hygiene.js"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");
  const readme = await readFile(resolve("services/control-api/README.md"), "utf8");
  const localPlaybook = await readFile(resolve("docs/local-test-hardening-playbook-2026-02-23.md"), "utf8");
  const releasePlaybook = await readFile(resolve("docs/extension-release-playbook-2026-02-23.md"), "utf8");

  const requiredScriptTokens = [
    "CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_FILE",
    "CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_COMPACT",
    "--output-file=",
    "--output-compact=",
    "writeSummaryOutputIfConfigured",
    "summary.outputFile = resolveOutputPath(options) || null;"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene output token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:near-duplicates:report:control-api\"",
    "\"queue:hygiene:pause:near-duplicates:batched:report:control-api\"",
    "\"smoke:extension:epic38\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package output token: ${token}`);
  }

  const requiredReadmeTokens = [
    "list near-duplicate schedules + write JSON report",
    "pause near-duplicate schedules (batched + JSON report)",
    "--output-file=dist/ops/queue-hygiene.json",
    "CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_FILE"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme output token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:list:near-duplicates:report:control-api",
    "npm run queue:hygiene:pause:near-duplicates:batched:report:control-api"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook output token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:list:near-duplicates:report:control-api",
    "npm run queue:hygiene:pause:near-duplicates:batched:report:control-api"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook output token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedScriptTokens: requiredScriptTokens.length,
        checkedPackageTokens: requiredPackageTokens.length,
        checkedReadmeTokens: requiredReadmeTokens.length,
        checkedLocalTokens: requiredLocalTokens.length,
        checkedReleaseTokens: requiredReleaseTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic38] failed: ${error.message}`);
  process.exit(1);
});
