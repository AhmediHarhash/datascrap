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
    "--duplicates-only=",
    "--dedupe-keep=",
    "buildDuplicatePlan",
    "summary.duplicateGroups = mapDuplicateGroupsForSummary(dedupePlan.duplicateGroups, options);",
    "const pauseTargets = options.duplicatesOnly ? dedupePlan.pauseCandidates : selectedSchedules;"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene duplicate token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:duplicates:control-api\"",
    "\"queue:hygiene:pause:duplicates:dry-run:control-api\"",
    "\"queue:hygiene:pause:duplicates:apply:control-api\"",
    "\"smoke:extension:epic34\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package duplicate-preset token: ${token}`);
  }

  const requiredReadmeTokens = [
    "Duplicate-schedule quick variants",
    "npm run queue:hygiene:list:duplicates:control-api",
    "--dedupe-keep=newest"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme duplicate-preset token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:list:duplicates:control-api",
    "npm run queue:hygiene:pause:duplicates:dry-run:control-api",
    "npm run queue:hygiene:pause:duplicates:apply:control-api"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook duplicate-preset token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:list:duplicates:control-api",
    "npm run queue:hygiene:pause:duplicates:dry-run:control-api",
    "npm run queue:hygiene:pause:duplicates:apply:control-api"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook duplicate-preset token: ${token}`);
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
  console.error(`[smoke-extension-epic34] failed: ${error.message}`);
  process.exit(1);
});
