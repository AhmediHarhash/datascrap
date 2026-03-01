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
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_SCHEMA_VERSION",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SCHEMA_VERSION_MISMATCH_BEHAVIOR",
    "--scan-resume-validate-schema-version=",
    "--scan-resume-schema-version-mismatch-behavior=",
    "SCAN_RESUME_SCHEMA_VERSION = 1",
    "schemaVersion: SCAN_RESUME_SCHEMA_VERSION",
    "schemaVersion mismatch",
    "`${baseSource}_schema_version_mismatch`",
    "resumeSchemaVersionMismatchBehavior",
    "resumeSchemaVersionExpected"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene resume-schema-version token: ${token}`);
  }

  const requiredPackageTokens = [
    "--scan-resume-validate-schema-version=true",
    "--scan-resume-schema-version-mismatch-behavior=restart",
    "\"smoke:extension:epic57\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package resume-schema-version token: ${token}`);
  }

  const requiredReadmeTokens = [
    "--scan-resume-validate-schema-version=true",
    "--scan-resume-schema-version-mismatch-behavior=restart",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_VALIDATE_SCHEMA_VERSION=true"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme resume-schema-version token: ${token}`);
  }

  const requiredLocalTokens = [
    "--scan-resume-validate-schema-version=true",
    "--scan-resume-schema-version-mismatch-behavior=restart|error"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook resume-schema-version token: ${token}`);
  }

  const requiredReleaseTokens = [
    "--scan-resume-validate-schema-version=true",
    "--scan-resume-schema-version-mismatch-behavior=<restart|error>",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SCHEMA_VERSION_MISMATCH_BEHAVIOR=restart"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook resume-schema-version token: ${token}`);
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
  console.error(`[smoke-extension-epic57] failed: ${error.message}`);
  process.exit(1);
});
