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
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_START_CURSOR_CREATED_AT",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_START_CURSOR_ID",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FILE",
    "--scan-start-cursor-created-at=",
    "--scan-start-cursor-id=",
    "--scan-resume-file=",
    "resolveScanStartCursor",
    "scanResumeSource",
    "scanResumeResolvedFile",
    "startCursor",
    "scan resume file paging.nextCursor"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene resume token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:control-api\"",
    "\"queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api\"",
    "\"smoke:extension:epic44\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package resume token: ${token}`);
  }

  const requiredReadmeTokens = [
    "queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:control-api",
    "queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api",
    "--scan-resume-file=dist/ops/queue-hygiene-near-duplicates-stale-scan.cursor.json",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FILE"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme resume token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:control-api",
    "npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api",
    "--scan-resume-file=dist/ops/queue-hygiene-near-duplicates-stale-scan.cursor.json"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook resume token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:list:near-duplicates:stale:scan-all:checkpoint:control-api",
    "npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:report:redacted:control-api",
    "--scan-resume-file=<path>"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook resume token: ${token}`);
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
  console.error(`[smoke-extension-epic44] failed: ${error.message}`);
  process.exit(1);
});
