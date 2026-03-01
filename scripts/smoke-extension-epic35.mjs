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
    "--signature-mode=",
    "CONTROL_API_SCHEDULE_HYGIENE_SIGNATURE_MODE",
    "extractTargetSignatures",
    "buildPayloadSignature",
    "signatureMode: options.signatureMode"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene signature-mode token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:near-duplicates:control-api\"",
    "\"queue:hygiene:pause:near-duplicates:dry-run:control-api\"",
    "\"queue:hygiene:pause:near-duplicates:apply:control-api\"",
    "\"smoke:extension:epic35\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package near-duplicate token: ${token}`);
  }

  const requiredReadmeTokens = [
    "Near-duplicate quick variants (target-focused signature)",
    "npm run queue:hygiene:list:near-duplicates:control-api",
    "--signature-mode=target",
    "CONTROL_API_SCHEDULE_HYGIENE_SIGNATURE_MODE=strict|target"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme near-duplicate token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:list:near-duplicates:control-api",
    "npm run queue:hygiene:pause:near-duplicates:dry-run:control-api",
    "npm run queue:hygiene:pause:near-duplicates:apply:control-api"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook near-duplicate token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:list:near-duplicates:control-api",
    "npm run queue:hygiene:pause:near-duplicates:dry-run:control-api",
    "npm run queue:hygiene:pause:near-duplicates:apply:control-api"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook near-duplicate token: ${token}`);
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
  console.error(`[smoke-extension-epic35] failed: ${error.message}`);
  process.exit(1);
});
