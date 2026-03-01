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
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_HARD_MAX_PAGES",
    "--scan-hard-max-pages=",
    "scanMaxPages = Math.max(0",
    "scanHardMaxPages = Math.max(",
    "operatorCapEnabled",
    "truncatedByHardMaxPages",
    "effectiveMaxPages"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene uncapped-scan token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:near-duplicates:stale:scan-all:uncapped:control-api\"",
    "--scan-max-pages=0",
    "--scan-hard-max-pages=5000",
    "\"smoke:extension:epic46\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package uncapped-scan token: ${token}`);
  }

  const requiredReadmeTokens = [
    "--scan-max-pages=0",
    "--scan-hard-max-pages=5000",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_HARD_MAX_PAGES=5000"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme uncapped-scan token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:list:near-duplicates:stale:scan-all:uncapped:control-api",
    "--scan-max-pages=0",
    "hard safety ceiling"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook uncapped-scan token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:list:near-duplicates:stale:scan-all:uncapped:control-api",
    "--scan-max-pages=0",
    "--scan-hard-max-pages=<n>"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook uncapped-scan token: ${token}`);
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
  console.error(`[smoke-extension-epic46] failed: ${error.message}`);
  process.exit(1);
});
