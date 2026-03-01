import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const packageJson = await readFile(resolve("package.json"), "utf8");
  const readme = await readFile(resolve("services/control-api/README.md"), "utf8");
  const releasePlaybook = await readFile(resolve("docs/extension-release-playbook-2026-02-23.md"), "utf8");
  const localPlaybook = await readFile(resolve("docs/local-test-hardening-playbook-2026-02-23.md"), "utf8");

  const requiredPackageTokens = [
    "\"queue:hygiene:list:monitor:control-api\"",
    "\"queue:hygiene:pause:monitor:dry-run:control-api\"",
    "\"queue:hygiene:pause:monitor:apply:control-api\"",
    "\"smoke:extension:epic32\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package monitor-preset token: ${token}`);
  }

  const requiredReadmeTokens = [
    "npm run queue:hygiene:list:monitor:control-api",
    "npm run queue:hygiene:pause:monitor:dry-run:control-api",
    "npm run queue:hygiene:pause:monitor:apply:control-api"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme monitor-preset token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:list:monitor:control-api",
    "npm run queue:hygiene:pause:monitor:dry-run:control-api",
    "npm run queue:hygiene:pause:monitor:apply:control-api"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook monitor-preset token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:list:monitor:control-api",
    "npm run queue:hygiene:pause:monitor:dry-run:control-api",
    "npm run queue:hygiene:pause:monitor:apply:control-api"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook monitor-preset token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedPackageTokens: requiredPackageTokens.length,
        checkedReadmeTokens: requiredReadmeTokens.length,
        checkedReleaseTokens: requiredReleaseTokens.length,
        checkedLocalTokens: requiredLocalTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic32] failed: ${error.message}`);
  process.exit(1);
});
