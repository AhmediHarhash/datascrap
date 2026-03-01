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
    "CONTROL_API_SCHEDULE_HYGIENE_PAUSE_BATCH_SIZE",
    "CONTROL_API_SCHEDULE_HYGIENE_PAUSE_BATCH_DELAY_MS",
    "CONTROL_API_SCHEDULE_HYGIENE_CONTINUE_ON_PAUSE_ERROR",
    "--pause-batch-size=",
    "--pause-batch-delay-ms=",
    "--continue-on-pause-error=",
    "const batches = [];",
    "await sleep(batchDelayMs);",
    "haltedOnFailure: paused.halted"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene batch token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:pause:apply:batched:control-api\"",
    "\"queue:hygiene:pause:duplicates:batched:control-api\"",
    "\"queue:hygiene:pause:near-duplicates:batched:control-api\"",
    "\"smoke:extension:epic37\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package batched token: ${token}`);
  }

  const requiredReadmeTokens = [
    "Batched force-apply variants (chunked execution):",
    "npm run queue:hygiene:pause:apply:batched:control-api",
    "--pause-batch-size=20",
    "--pause-batch-delay-ms=250"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme batched token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:pause:apply:batched:control-api",
    "npm run queue:hygiene:pause:duplicates:batched:control-api",
    "npm run queue:hygiene:pause:near-duplicates:batched:control-api"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook batched token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:pause:apply:batched:control-api",
    "npm run queue:hygiene:pause:duplicates:batched:control-api",
    "npm run queue:hygiene:pause:near-duplicates:batched:control-api"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook batched token: ${token}`);
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
  console.error(`[smoke-extension-epic37] failed: ${error.message}`);
  process.exit(1);
});
