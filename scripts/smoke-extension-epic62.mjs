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
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_REQUIRE_API_BASE",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_API_BASE_MISSING_BEHAVIOR",
    "--scan-resume-require-api-base=",
    "--scan-resume-api-base-missing-behavior=",
    "`${baseSource}_api_base_missing`",
    "resumeApiBaseRequired",
    "resumeApiBaseMissing",
    "resumeApiBaseMissingBehavior"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene resume-api-base-presence token: ${token}`);
  }

  const requiredPackageTokens = [
    "--scan-resume-require-api-base=true",
    "--scan-resume-api-base-missing-behavior=error",
    "\"smoke:extension:epic62\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package resume-api-base-presence token: ${token}`);
  }

  const requiredReadmeTokens = [
    "--scan-resume-require-api-base=true",
    "--scan-resume-api-base-missing-behavior=error",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_REQUIRE_API_BASE=false",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_API_BASE_MISSING_BEHAVIOR=restart"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme resume-api-base-presence token: ${token}`);
  }

  const requiredLocalTokens = [
    "--scan-resume-require-api-base=true",
    "--scan-resume-api-base-missing-behavior=restart|error"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook resume-api-base-presence token: ${token}`);
  }

  const requiredReleaseTokens = [
    "--scan-resume-require-api-base=true",
    "--scan-resume-api-base-missing-behavior=<restart|error>",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_REQUIRE_API_BASE=false",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_API_BASE_MISSING_BEHAVIOR=restart"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook resume-api-base-presence token: ${token}`);
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
  console.error(`[smoke-extension-epic62] failed: ${error.message}`);
  process.exit(1);
});
