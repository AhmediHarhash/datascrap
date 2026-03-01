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
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_AUTO_CONTINUE",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_AUTO_CONTINUE_MAX_SEGMENTS",
    "--scan-auto-continue=",
    "--scan-auto-continue-max-segments=",
    "scanAutoContinue",
    "scanAutoContinueMaxSegments",
    "continuations",
    "segmentsUsed",
    "autoContinueLimitReached"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene auto-continue token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:near-duplicates:stale:scan-all:autocontinue:control-api\"",
    "--scan-auto-continue=true",
    "--scan-auto-continue-max-segments=20",
    "\"smoke:extension:epic47\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package auto-continue token: ${token}`);
  }

  const requiredReadmeTokens = [
    "--scan-auto-continue=true",
    "--scan-auto-continue-max-segments=20",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_AUTO_CONTINUE=false",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_AUTO_CONTINUE_MAX_SEGMENTS=20"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme auto-continue token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:list:near-duplicates:stale:scan-all:autocontinue:control-api",
    "--scan-auto-continue=true",
    "--scan-auto-continue-max-segments=20"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook auto-continue token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:list:near-duplicates:stale:scan-all:autocontinue:control-api",
    "--scan-auto-continue=true",
    "--scan-auto-continue-max-segments=<n>"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook auto-continue token: ${token}`);
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
  console.error(`[smoke-extension-epic47] failed: ${error.message}`);
  process.exit(1);
});
