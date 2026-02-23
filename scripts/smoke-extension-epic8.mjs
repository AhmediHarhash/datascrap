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
  const worker = await readFile(resolve("packages/extension/background/service-worker.mjs"), "utf8");
  const activation = await readFile(resolve("packages/extension/background/activation-service.mjs"), "utf8");
  const messages = await readFile(resolve("packages/shared/src/messages.mjs"), "utf8");

  const requiredHtmlIds = [
    "cloud-control-panel",
    "cloud-policy-load-btn",
    "cloud-policy-save-btn",
    "integrations-list-btn",
    "integrations-upsert-btn",
    "integrations-test-btn",
    "integrations-remove-btn",
    "integration-preset-webhook-btn",
    "integration-preset-airtable-btn",
    "integration-preset-n8n-btn",
    "integration-test-target-url",
    "integration-test-method",
    "integration-test-secret-placement",
    "integration-test-header-name",
    "integration-test-body",
    "jobs-enqueue-btn",
    "jobs-list-btn",
    "jobs-dead-btn",
    "jobs-cancel-btn",
    "jobs-fill-webhook-btn",
    "jobs-fill-extract-summary-btn",
    "jobs-fill-monitor-diff-btn",
    "schedule-create-btn",
    "schedule-list-btn",
    "schedule-run-now-btn",
    "schedule-remove-btn",
    "schedule-fill-webhook-btn",
    "schedule-fill-extract-summary-btn",
    "schedule-fill-monitor-diff-btn",
    "speed-profile-save-btn",
    "speed-profile-reset-btn",
    "table-cleanup-btn",
    "table-merge-btn",
    "obs-dashboard-btn",
    "obs-slo-btn",
    "obs-errors-btn",
    "obs-jobs-btn",
    "templates-diagnostics-panel",
    "template-save-btn",
    "template-apply-btn",
    "template-run-btn",
    "template-delete-btn",
    "diagnostics-snapshot-btn",
    "diagnostics-report-btn",
    "diagnostics-copy-btn"
  ];
  for (const id of requiredHtmlIds) {
    assert(html.includes(`id="${id}"`), `missing html id: ${id}`);
  }

  const requiredJsTokens = [
    "onCloudPolicyLoad",
    "onCloudPolicySave",
    "onIntegrationsList",
    "onIntegrationsUpsert",
    "onIntegrationsTest",
    "applyIntegrationPreset",
    "onJobsEnqueue",
    "onJobsList",
    "onCleanupTableRows",
    "onMergeTableColumns",
    "onSpeedProfileSave",
    "onSpeedProfileReset",
    "applyJobsPreset",
    "applySchedulePreset",
    "buildMonitorDiffJobPayloadTemplate",
    "monitor.page.diff",
    "onSchedulesCreate",
    "onSchedulesList",
    "onObservabilityDashboard",
    "onTemplateSave",
    "onTemplateApply",
    "onTemplateRun",
    "onDiagnosticsSnapshot",
    "onDiagnosticsReport",
    "datascrap.sidepanel.templates.v1"
  ];
  for (const token of requiredJsTokens) {
    assert(js.includes(token), `missing js token: ${token}`);
  }

  const requiredMessageTokens = [
    "ACTIVATION_CLOUD_POLICY_GET_REQUEST",
    "ACTIVATION_INTEGRATIONS_UPSERT_REQUEST",
    "ACTIVATION_INTEGRATIONS_TEST_REQUEST",
    "ACTIVATION_JOBS_ENQUEUE_REQUEST",
    "ACTIVATION_SCHEDULES_CREATE_REQUEST",
    "ACTIVATION_OBSERVABILITY_DASHBOARD_REQUEST"
  ];
  for (const token of requiredMessageTokens) {
    assert(messages.includes(token), `missing message token: ${token}`);
    assert(worker.includes(token), `service worker missing token: ${token}`);
  }

  const requiredActivationExports = [
    "activationGetCloudPolicy",
    "activationSetCloudPolicy",
    "activationListIntegrationSecrets",
    "activationTestIntegrationSecret",
    "activationEnqueueJob",
    "activationCreateSchedule",
    "activationGetObservabilityDashboard"
  ];
  for (const token of requiredActivationExports) {
    assert(activation.includes(`export async function ${token}`), `missing activation export: ${token}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedIds: requiredHtmlIds.length,
        checkedMessages: requiredMessageTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic8] failed: ${error.message}`);
  process.exit(1);
});
