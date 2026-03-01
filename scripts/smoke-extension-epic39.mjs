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
    "CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_TIMESTAMP",
    "CONTROL_API_SCHEDULE_HYGIENE_OUTPUT_OVERWRITE",
    "--output-timestamp=",
    "--output-overwrite=",
    "resolveOutputPath",
    "buildTimestampTag",
    "OUTPUT_FILE_EXISTS",
    "runId: randomUUID()",
    "durationMs = Math.max(0, Date.now() - startedAtMs)"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene timestamp/overwrite token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:near-duplicates:report:dated:control-api\"",
    "\"queue:hygiene:pause:near-duplicates:batched:report:dated:control-api\"",
    "\"smoke:extension:epic39\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package dated-report token: ${token}`);
  }

  const requiredReadmeTokens = [
    "list near-duplicate schedules + write dated JSON report",
    "pause near-duplicate schedules (batched + dated JSON report)",
    "--output-timestamp=true",
    "--output-overwrite=false"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme dated-report token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:list:near-duplicates:report:dated:control-api",
    "npm run queue:hygiene:pause:near-duplicates:batched:report:dated:control-api"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook dated-report token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:list:near-duplicates:report:dated:control-api",
    "npm run queue:hygiene:pause:near-duplicates:batched:report:dated:control-api"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook dated-report token: ${token}`);
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
  console.error(`[smoke-extension-epic39] failed: ${error.message}`);
  process.exit(1);
});
