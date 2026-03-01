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
    "CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_COUNT",
    "CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_DELAY_MS",
    "CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_BACKOFF_FACTOR",
    "CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_JITTER_MS",
    "CONTROL_API_SCHEDULE_HYGIENE_LIST_REQUEST_TIMEOUT_MS",
    "--list-retry-count=",
    "--list-retry-delay-ms=",
    "--list-retry-backoff-factor=",
    "--list-retry-jitter-ms=",
    "--list-request-timeout-ms=",
    "performListSchedulesPageWithRetry",
    "computeListRetryDelayMs",
    "retry: listRetrySummary"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene list-retry token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:control-api\"",
    "\"queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api\"",
    "--list-retry-count=3",
    "\"smoke:extension:epic45\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package list-retry token: ${token}`);
  }

  const requiredReadmeTokens = [
    "--list-retry-count=3",
    "--list-retry-delay-ms=500",
    "CONTROL_API_SCHEDULE_HYGIENE_LIST_RETRY_COUNT=1",
    "CONTROL_API_SCHEDULE_HYGIENE_LIST_REQUEST_TIMEOUT_MS=15000"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme list-retry token: ${token}`);
  }

  const requiredLocalTokens = [
    "--list-retry-count=3",
    "--list-retry-delay-ms=500",
    "retry transient list page failures"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook list-retry token: ${token}`);
  }

  const requiredReleaseTokens = [
    "--list-retry-count=<n>",
    "--list-retry-delay-ms=<ms>",
    "transient list-page failures"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook list-retry token: ${token}`);
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
  console.error(`[smoke-extension-epic45] failed: ${error.message}`);
  process.exit(1);
});
