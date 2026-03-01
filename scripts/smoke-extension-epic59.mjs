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
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_GENERATED_AT_SOURCE",
    "--scan-resume-generated-at-source=",
    "normalizeResumeGeneratedAtSource",
    "normalizeResolvedResumeGeneratedAtSource",
    "payload-or-file-mtime",
    "file_mtime",
    "resumeGeneratedAtSourcePolicy",
    "resumeGeneratedAtSource",
    "scanResumeGeneratedAtSourcePolicy",
    "scanResumeGeneratedAtSourceResolved"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene resume-generated-at-source token: ${token}`);
  }

  const requiredPackageTokens = [
    "--scan-resume-generated-at-source=payload-or-file-mtime",
    "\"smoke:extension:epic59\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package resume-generated-at-source token: ${token}`);
  }

  const requiredReadmeTokens = [
    "--scan-resume-generated-at-source=payload-or-file-mtime",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_GENERATED_AT_SOURCE=payload-or-file-mtime"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme resume-generated-at-source token: ${token}`);
  }

  const requiredLocalTokens = [
    "--scan-resume-generated-at-source=<payload|file-mtime|payload-or-file-mtime>"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook resume-generated-at-source token: ${token}`);
  }

  const requiredReleaseTokens = [
    "--scan-resume-generated-at-source=<payload|file-mtime|payload-or-file-mtime>",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_RESUME_GENERATED_AT_SOURCE=payload-or-file-mtime"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook resume-generated-at-source token: ${token}`);
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
  console.error(`[smoke-extension-epic59] failed: ${error.message}`);
  process.exit(1);
});
