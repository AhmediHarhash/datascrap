import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const html = await readFile(resolve("packages/extension/sidepanel/index.html"), "utf8");
  const js = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");
  const jobsRoute = await readFile(resolve("services/control-api/src/routes/jobs.js"), "utf8");
  const schedulesRoute = await readFile(resolve("services/control-api/src/routes/schedules.js"), "utf8");
  const processor = await readFile(resolve("services/control-api/src/services/job-processor.js"), "utf8");
  const validator = await readFile(resolve("services/control-api/src/services/job-payload-validator.js"), "utf8");
  const monitorState = await readFile(resolve("services/control-api/src/services/monitor-state.js"), "utf8");
  const migration = await readFile(resolve("services/control-api/migrations/0006_phase9_monitor_states.sql"), "utf8");

  const requiredHtmlIds = [
    "jobs-fill-monitor-diff-btn",
    "schedule-fill-monitor-diff-btn"
  ];
  for (const id of requiredHtmlIds) {
    assert(html.includes(`id="${id}"`), `missing html id: ${id}`);
  }
  assert(html.includes('<option value="monitor.page.diff"></option>'), "missing monitor job type datalist option");

  const requiredJsTokens = [
    "buildMonitorDiffJobPayloadTemplate",
    'applyJobsPreset("monitor_diff")',
    'applySchedulePreset("monitor_diff")',
    "Jobs payload preset applied: monitor diff",
    "Schedule payload preset applied: monitor diff"
  ];
  for (const token of requiredJsTokens) {
    assert(js.includes(token), `missing js token: ${token}`);
  }

  const requiredProcessorTokens = [
    "monitor.page.diff",
    "executeMonitorPageDiff",
    "buildFieldDiff",
    "resolveMonitorNotifyWebhook",
    "getMonitorState",
    "upsertMonitorState"
  ];
  for (const token of requiredProcessorTokens) {
    assert(processor.includes(token), `missing job processor token: ${token}`);
  }

  const requiredValidatorTokens = [
    "validateMonitorPageDiffPayload",
    "INVALID_MONITOR_PAYLOAD",
    "requiresWebhookOptIn"
  ];
  for (const token of requiredValidatorTokens) {
    assert(validator.includes(token), `missing validator token: ${token}`);
  }

  assert(jobsRoute.includes("validateJobPayloadByType"), "jobs route missing payload validator usage");
  assert(jobsRoute.includes("requiresWebhookOptIn"), "jobs route missing webhook opt-in resolver");
  assert(schedulesRoute.includes("validateJobPayloadByType"), "schedules route missing payload validator usage");
  assert(schedulesRoute.includes("requiresWebhookOptIn"), "schedules route missing webhook opt-in resolver");

  const requiredMonitorStateTokens = [
    "cloud_monitor_states",
    "resolveMonitorKey",
    "upsertMonitorState"
  ];
  for (const token of requiredMonitorStateTokens) {
    assert(monitorState.includes(token), `missing monitor state token: ${token}`);
  }

  assert(migration.includes("CREATE TABLE IF NOT EXISTS cloud_monitor_states"), "missing monitor state migration table");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedHtmlIds: requiredHtmlIds.length,
        checkedJsTokens: requiredJsTokens.length,
        checkedProcessorTokens: requiredProcessorTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic11] failed: ${error.message}`);
  process.exit(1);
});
