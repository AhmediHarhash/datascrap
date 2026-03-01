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
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_MAX_AGE_MINUTES",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_STALE_BEHAVIOR",
    "--scan-resume-max-age-minutes=",
    "--scan-resume-stale-behavior=",
    "scanResumeMaxAgeMinutes",
    "scanResumeStaleBehavior",
    "`${baseSource}_stale`",
    "resumeStaleReason"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene resume-freshness token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:autorecover:fresh:report:redacted:control-api\"",
    "--scan-resume-max-age-minutes=720",
    "--scan-resume-stale-behavior=restart",
    "\"smoke:extension:epic52\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package resume-freshness token: ${token}`);
  }

  const requiredReadmeTokens = [
    "scan-all:autorecover:fresh:report:redacted:control-api",
    "--scan-resume-max-age-minutes=720",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_STALE_BEHAVIOR=restart"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme resume-freshness token: ${token}`);
  }

  const requiredLocalTokens = [
    "scan-all:autorecover:fresh:report:redacted:control-api",
    "--scan-resume-max-age-minutes=<n>",
    "--scan-resume-stale-behavior=restart|error"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook resume-freshness token: ${token}`);
  }

  const requiredReleaseTokens = [
    "scan-all:autorecover:fresh:report:redacted:control-api",
    "--scan-resume-max-age-minutes=<n>",
    "--scan-resume-stale-behavior=<restart|error>"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook resume-freshness token: ${token}`);
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
  console.error(`[smoke-extension-epic52] failed: ${error.message}`);
  process.exit(1);
});
