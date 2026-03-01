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
  const controlReadme = await readFile(resolve("services/control-api/README.md"), "utf8");

  const requiredScriptTokens = [
    "if (token.startsWith(\"--action=\"))",
    "--apply",
    "--email=",
    "--password=",
    "--register-if-missing=",
    "/api/auth/login",
    "buildListSchedulesPath",
    "/api/schedules/toggle",
    "CONTROL_API_BEARER_TOKEN",
    "authMode"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene script token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:control-api\"",
    "\"queue:hygiene:pause:dry-run:control-api\"",
    "\"queue:hygiene:pause:apply:control-api\"",
    "\"smoke:extension:epic31\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package queue-hygiene token: ${token}`);
  }

  const requiredReadmeTokens = [
    "## Schedule Hygiene Script (Queue Noise Control)",
    "node services/control-api/scripts/schedule-hygiene.js --action=list",
    "--action=pause --active-only=true --limit=100 --apply",
    "optional auto-login fallback when token is not provided"
  ];
  for (const token of requiredReadmeTokens) {
    assert(controlReadme.includes(token), `missing control-api readme hygiene token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedScriptTokens: requiredScriptTokens.length,
        checkedPackageTokens: requiredPackageTokens.length,
        checkedReadmeTokens: requiredReadmeTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic31] failed: ${error.message}`);
  process.exit(1);
});
