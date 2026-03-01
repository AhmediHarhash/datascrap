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
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_ALLOW_EXHAUSTED",
    "--scan-resume-allow-exhausted=",
    "`${baseSource}_exhausted`",
    "scanResumeAllowExhausted",
    "resumeAllowExhausted",
    "resumeExhausted"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene resume-exhausted token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:strict:report:redacted:control-api\"",
    "--scan-resume-allow-exhausted=true",
    "--scan-resume-allow-exhausted=false",
    "\"smoke:extension:epic49\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package resume-exhausted token: ${token}`);
  }

  const requiredReadmeTokens = [
    "resume:strict:report:redacted:control-api",
    "--scan-resume-allow-exhausted=true",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_ALLOW_EXHAUSTED=true"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme resume-exhausted token: ${token}`);
  }

  const requiredLocalTokens = [
    "queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:strict:report:redacted:control-api",
    "--scan-resume-allow-exhausted=true",
    "--scan-resume-allow-exhausted=false"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook resume-exhausted token: ${token}`);
  }

  const requiredReleaseTokens = [
    "resume:strict:report:redacted:control-api",
    "--scan-resume-allow-exhausted=<bool>",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_ALLOW_EXHAUSTED=true"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook resume-exhausted token: ${token}`);
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
  console.error(`[smoke-extension-epic49] failed: ${error.message}`);
  process.exit(1);
});
