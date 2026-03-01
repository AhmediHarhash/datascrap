import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const hygieneScript = await readFile(resolve("services/control-api/scripts/schedule-hygiene.js"), "utf8");
  const schedulesRoute = await readFile(resolve("services/control-api/src/routes/schedules.js"), "utf8");
  const schedulesService = await readFile(resolve("services/control-api/src/services/schedules.js"), "utf8");
  const packageJson = await readFile(resolve("package.json"), "utf8");
  const readme = await readFile(resolve("services/control-api/README.md"), "utf8");
  const localPlaybook = await readFile(resolve("docs/local-test-hardening-playbook-2026-02-23.md"), "utf8");
  const releasePlaybook = await readFile(resolve("docs/extension-release-playbook-2026-02-23.md"), "utf8");

  const requiredScriptTokens = [
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_ALL",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_MAX_PAGES",
    "--scan-all=",
    "--scan-max-pages=",
    "buildListSchedulesPath",
    "scanAll: options.scanAll",
    "scanMaxPages: options.scanMaxPages",
    "cursorLoopDetected"
  ];
  for (const token of requiredScriptTokens) {
    assert(hygieneScript.includes(token), `missing hygiene scan-all token: ${token}`);
  }

  const requiredRouteTokens = [
    "cursorCreatedAt",
    "cursorId",
    "pageInfo: listed.pageInfo",
    "INVALID_SCHEDULE_CURSOR"
  ];
  for (const token of requiredRouteTokens) {
    assert(schedulesRoute.includes(token), `missing schedules route pagination token: ${token}`);
  }

  const requiredServiceTokens = [
    "normalizeScheduleListCursor",
    "(created_at, id) < ($3::timestamptz, $4::uuid)",
    "ORDER BY created_at DESC, id DESC",
    "nextCursor",
    "hasMore"
  ];
  for (const token of requiredServiceTokens) {
    assert(schedulesService.includes(token), `missing schedules service pagination token: ${token}`);
  }

  const requiredPackageTokens = [
    "\"queue:hygiene:list:near-duplicates:stale:scan-all:control-api\"",
    "\"queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:report:redacted:control-api\"",
    "\"smoke:extension:epic43\""
  ];
  for (const token of requiredPackageTokens) {
    assert(packageJson.includes(token), `missing package scan-all token: ${token}`);
  }

  const requiredReadmeTokens = [
    "list near-duplicate schedules older than 180 minutes across all pages",
    "pause near-duplicate schedules older than 180 minutes across all pages",
    "--scan-all=true",
    "CONTROL_API_SCHEDULE_HYGIENE_SCAN_ALL=false"
  ];
  for (const token of requiredReadmeTokens) {
    assert(readme.includes(token), `missing readme scan-all token: ${token}`);
  }

  const requiredLocalTokens = [
    "npm run queue:hygiene:list:near-duplicates:stale:scan-all:control-api",
    "npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:report:redacted:control-api",
    "--scan-max-pages=200"
  ];
  for (const token of requiredLocalTokens) {
    assert(localPlaybook.includes(token), `missing local playbook scan-all token: ${token}`);
  }

  const requiredReleaseTokens = [
    "npm run queue:hygiene:list:near-duplicates:stale:scan-all:control-api",
    "npm run queue:hygiene:pause:near-duplicates:stale:resilient:scan-all:report:redacted:control-api",
    "--scan-all=true"
  ];
  for (const token of requiredReleaseTokens) {
    assert(releasePlaybook.includes(token), `missing release playbook scan-all token: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedScriptTokens: requiredScriptTokens.length,
        checkedRouteTokens: requiredRouteTokens.length,
        checkedServiceTokens: requiredServiceTokens.length,
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
  console.error(`[smoke-extension-epic43] failed: ${error.message}`);
  process.exit(1);
});
