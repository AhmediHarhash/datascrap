import { createAutomationRuntime } from "../packages/core/src/automation-runtime.mjs";
import { createPermissionManager } from "../packages/core/src/permission-manager.mjs";
import { AUTOMATION_EVENT_TYPES } from "../packages/shared/src/events.mjs";
import { createStorageClient } from "../packages/storage/src/storage-client.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForEvent(events, predicate, timeoutMs = 4000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const found = events.find(predicate);
    if (found) return found;
    await wait(25);
  }
  throw new Error("Timed out waiting for runtime event");
}

async function main() {
  const events = [];

  const storageClient = await createStorageClient({
    driver: "memory"
  });

  const runtime = createAutomationRuntime({
    storageClient,
    permissionManager: createPermissionManager({
      chromeApi: null,
      assumeAllowedIfUnavailable: true
    }),
    onEvent(event) {
      events.push(event);
    }
  });
  await runtime.init();

  const started = await runtime.startAutomation({
    runnerType: "listExtractor",
    config: {
      startUrl: "https://example.com/products",
      stepDelayMs: 35
    }
  });
  assert(Boolean(started.automationId), "start automation failed");

  await waitForEvent(
    events,
    (event) => event.eventType === AUTOMATION_EVENT_TYPES.COMPLETED && event.payload?.automationId === started.automationId
  );

  const rerun = await runtime.rerunAutomation(started.automationId);
  assert(Boolean(rerun.automationId), "rerun request failed");
  await waitForEvent(
    events,
    (event) => event.eventType === AUTOMATION_EVENT_TYPES.COMPLETED && event.payload?.automationId === rerun.automationId
  );

  const stoppable = await runtime.startAutomation({
    runnerType: "pageExtractor",
    config: {
      urls: ["https://example.com/a", "https://example.com/b", "https://example.com/c"],
      stepDelayMs: 200
    }
  });
  await wait(120);
  const stopResult = await runtime.stopAutomation(stoppable.automationId);
  assert(stopResult.stopped === true, "stop request was not accepted");

  await waitForEvent(
    events,
    (event) => event.eventType === AUTOMATION_EVENT_TYPES.STOPPED && event.payload?.automationId === stoppable.automationId
  );

  const hasProgress = events.some((event) => event.eventType === AUTOMATION_EVENT_TYPES.PROGRESS);
  assert(hasProgress, "progress events were not emitted");

  const snapshot = await runtime.getSnapshot();
  assert(Array.isArray(snapshot.automations) && snapshot.automations.length >= 3, "snapshot automations missing");

  await storageClient.destroy();

  console.log(
    JSON.stringify(
      {
        ok: true,
        automationCount: snapshot.automations.length,
        eventsCaptured: events.length,
        stoppedAutomationId: stoppable.automationId
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-runtime] failed: ${error.message}`);
  process.exit(1);
});
