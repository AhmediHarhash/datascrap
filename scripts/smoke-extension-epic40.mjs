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
    "CONTROL_API_SCHEDULE_HYGIENE_REDACT_SIGNATURES",
    "--redact-signatures=",
    "maybeRedactSignature",
    "sha256:",
    "signaturesRedacted: options.redactSignatures"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene redaction token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:near-duplicates:report:redacted:control-api\"",
    "\"queue:hygiene:pause:near-duplicates:batched:report:redacted:control-api\"",
    "\"smoke:extension:epic40\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package redaction token: ${token}`);
  }

  const requiredReadmeTokens = [
    "list near-duplicate schedules + write dated redacted JSON report",
    "pause near-duplicate schedules (batched + dated redacted JSON report)",
    "--redact-signatures=true",
    "CONTROL_API_SCHEDULE_HYGIENE_REDACT_SIGNATURES=false"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme redaction token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:list:near-duplicates:report:redacted:control-api",
    "npm run queue:hygiene:pause:near-duplicates:batched:report:redacted:control-api"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook redaction token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:list:near-duplicates:report:redacted:control-api",
    "npm run queue:hygiene:pause:near-duplicates:batched:report:redacted:control-api"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook redaction token: ${token}`);
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
  console.error(`[smoke-extension-epic40] failed: ${error.message}`);
  process.exit(1);
});
