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
    "--interval-lte=",
    "options.intervalLte = Math.max(0, Math.min(10080, parsed));",
    "if (intervalLimit > 0)",
    "item.scheduleKind !== \"interval\"",
    "intervalLte: options.intervalLte > 0 ? options.intervalLte : null"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene interval token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:frequent:control-api\"",
    "\"queue:hygiene:pause:frequent:dry-run:control-api\"",
    "\"queue:hygiene:pause:frequent:apply:control-api\"",
    "\"smoke:extension:epic33\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package frequent-preset token: ${token}`);
  }

  const requiredReadmeTokens = [
    "Frequent-schedule quick variants (interval schedules `<= 60` min)",
    "npm run queue:hygiene:list:frequent:control-api",
    "--interval-lte=60"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme frequent-preset token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:list:frequent:control-api",
    "npm run queue:hygiene:pause:frequent:dry-run:control-api",
    "npm run queue:hygiene:pause:frequent:apply:control-api"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook frequent-preset token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:list:frequent:control-api",
    "npm run queue:hygiene:pause:frequent:dry-run:control-api",
    "npm run queue:hygiene:pause:frequent:apply:control-api"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook frequent-preset token: ${token}`);
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
  console.error(`[smoke-extension-epic33] failed: ${error.message}`);
  process.exit(1);
});
