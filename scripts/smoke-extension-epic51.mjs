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
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FROM_CHECKPOINT",
    "--scan-resume-from-checkpoint=",
    "scanResumeFromCheckpoint",
    "checkpoint_file_auto",
    "`${baseSource}_exhausted`",
    "checkpoint_file_missing"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene auto-resume checkpoint token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:report:redacted:control-api\"",
    "--scan-checkpoint-file=dist/ops/queue-hygiene-near-duplicates-stale-scan.cursor.json",
    "--scan-resume-from-checkpoint=true",
    "\"smoke:extension:epic51\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package auto-resume checkpoint token: ${token}`);
  }

  const requiredReadmeTokens = [
    "scan-all:autorecover:report:redacted:control-api",
    "--scan-resume-from-checkpoint=true",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FROM_CHECKPOINT=true"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme auto-resume checkpoint token: ${token}`);
  }

  const requiredLocalTokens = [
    "scan-all:autorecover:report:redacted:control-api",
    "--scan-resume-from-checkpoint=true"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook auto-resume checkpoint token: ${token}`);
  }

  const requiredReleaseTokens = [
    "scan-all:autorecover:report:redacted:control-api",
    "--scan-resume-from-checkpoint=true",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_FROM_CHECKPOINT=true"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook auto-resume checkpoint token: ${token}`);
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
  console.error(`[smoke-extension-epic51] failed: ${error.message}`);
  process.exit(1);
});
