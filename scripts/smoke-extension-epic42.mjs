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
    "CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_COUNT",
    "CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_DELAY_MS",
    "--pause-retry-count=",
    "--pause-retry-delay-ms=",
    "performPauseToggleWithRetry",
    "shouldRetryRequestFailure",
    "retry: retrySummary"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene retry token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:pause:near-duplicates:stale:resilient:report:redacted:control-api\"",
    "\"smoke:extension:epic42\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package retry token: ${token}`);
  }

  const requiredReadmeTokens = [
    "resilient retries + dated redacted JSON report",
    "--pause-retry-count=3",
    "CONTROL_API_SCHEDULE_HYGIENE_PAUSE_RETRY_COUNT=1"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme retry token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:pause:near-duplicates:stale:resilient:report:redacted:control-api",
    "--pause-retry-count=3",
    "--pause-retry-delay-ms=500"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook retry token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:pause:near-duplicates:stale:resilient:report:redacted:control-api",
    "--pause-retry-count=<n>",
    "--pause-retry-delay-ms=<ms>"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook retry token: ${token}`);
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
  console.error(`[smoke-extension-epic42] failed: ${error.message}`);
  process.exit(1);
});
