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
    "CONTROL_API_SCHEDULE_HYGIENE_MIN_AGE_MINUTES",
    "--min-age-minutes=",
    "minAgeMinutes = 0",
    "if (minAge > 0)",
    "minAgeMinutes: options.minAgeMinutes > 0 ? options.minAgeMinutes : null"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene min-age token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:near-duplicates:stale:control-api\"",
    "\"queue:hygiene:pause:near-duplicates:stale:dry-run:control-api\"",
    "\"queue:hygiene:pause:near-duplicates:stale:batched:report:redacted:control-api\"",
    "\"smoke:extension:epic41\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package stale token: ${token}`);
  }

  const requiredReadmeTokens = [
    "list near-duplicate schedules older than 180 minutes",
    "pause near-duplicate schedules older than 180 minutes (dry-run)",
    "--min-age-minutes=180",
    "CONTROL_API_SCHEDULE_HYGIENE_MIN_AGE_MINUTES=0"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme stale token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:list:near-duplicates:stale:control-api",
    "npm run queue:hygiene:pause:near-duplicates:stale:dry-run:control-api",
    "npm run queue:hygiene:pause:near-duplicates:stale:batched:report:redacted:control-api"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook stale token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:list:near-duplicates:stale:control-api",
    "npm run queue:hygiene:pause:near-duplicates:stale:dry-run:control-api",
    "npm run queue:hygiene:pause:near-duplicates:stale:batched:report:redacted:control-api"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook stale token: ${token}`);
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
  console.error(`[smoke-extension-epic41] failed: ${error.message}`);
  process.exit(1);
});
