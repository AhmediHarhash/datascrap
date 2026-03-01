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
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SHA256",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_HASH_BEHAVIOR",
    "--scan-resume-sha256=",
    "--scan-resume-hash-behavior=",
    "normalizeSha256",
    "hash mismatch",
    "`${baseSource}_hash_mismatch`",
    "resumeHashExpected",
    "resumeHashActual",
    "resumeHashMismatch",
    "resumeHashBehavior"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene resume-hash-integrity token: ${token}`);
  }

  const requiredPackageTokens = [
    "--scan-resume-hash-behavior=restart",
    "\"smoke:extension:epic61\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package resume-hash-integrity token: ${token}`);
  }

  const requiredReadmeTokens = [
    "--scan-resume-sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "--scan-resume-hash-behavior=restart",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SHA256",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_HASH_BEHAVIOR=restart"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme resume-hash-integrity token: ${token}`);
  }

  const requiredLocalTokens = [
    "--scan-resume-sha256=<sha256>",
    "--scan-resume-hash-behavior=restart|error"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook resume-hash-integrity token: ${token}`);
  }

  const requiredReleaseTokens = [
    "--scan-resume-sha256=<sha256>",
    "--scan-resume-hash-behavior=<restart|error>",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_SHA256=<sha256>",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_HASH_BEHAVIOR=restart"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook resume-hash-integrity token: ${token}`);
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
  console.error(`[smoke-extension-epic61] failed: ${error.message}`);
  process.exit(1);
});
