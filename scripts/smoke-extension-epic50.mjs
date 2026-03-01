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
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_EXHAUSTED_BEHAVIOR",
    "--scan-resume-exhausted-behavior=",
    "scanResumeExhaustedBehavior",
    "resumeExhaustedBehavior",
    "resumeExhaustedNoop"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene exhausted-behavior token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:resume:restart:report:redacted:control-api\"",
    "--scan-resume-exhausted-behavior=noop",
    "--scan-resume-exhausted-behavior=restart",
    "\"smoke:extension:epic50\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package exhausted-behavior token: ${token}`);
  }

  const requiredReadmeTokens = [
    "resume:restart:report:redacted:control-api",
    "--scan-resume-exhausted-behavior=noop",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_EXHAUSTED_BEHAVIOR=noop"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme exhausted-behavior token: ${token}`);
  }

  const requiredLocalTokens = [
    "resume:restart:report:redacted:control-api",
    "--scan-resume-exhausted-behavior=noop|restart"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook exhausted-behavior token: ${token}`);
  }

  const requiredReleaseTokens = [
    "resume:restart:report:redacted:control-api",
    "--scan-resume-exhausted-behavior=<noop|restart>",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_EXHAUSTED_BEHAVIOR=noop"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook exhausted-behavior token: ${token}`);
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
  console.error(`[smoke-extension-epic50] failed: ${error.message}`);
  process.exit(1);
});
