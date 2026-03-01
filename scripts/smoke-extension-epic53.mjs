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
    "writeTextFileAtomic",
    ".tmp-${process.pid}-",
    "await rename(tempPath, resolvedPath);",
    "await writeTextFileAtomic(resolvedPath, `${JSON.stringify(payload, null, 2)}\\n`);",
    "await writeTextFileAtomic(resolvedPath, `${payload}\\n`);"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene atomic-write token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"smoke:extension:epic53\"",
    "npm run smoke:extension:epic53"
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package atomic-write token: ${token}`);
  }

  const requiredReadmeTokens = [
    "output/checkpoint artifacts are written atomically"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme atomic-write token: ${token}`);
  }

  const requiredLocalTokens = [
    "checkpoint/output artifact writes are atomic"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook atomic-write token: ${token}`);
  }

  const requiredReleaseTokens = [
    "output/checkpoint artifact writes use atomic temp-file rename"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook atomic-write token: ${token}`);
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
  console.error(`[smoke-extension-epic53] failed: ${error.message}`);
  process.exit(1);
});
