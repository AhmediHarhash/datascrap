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
  let mockListEngineCalls = 0;
  let mockPageEngineCalls = 0;

  const storageClient = await createStorageClient({
    driver: "memory"
  });

  const runtime = createAutomationRuntime({
    storageClient,
    permissionManager: createPermissionManager({
      chromeApi: null,
      assumeAllowedIfUnavailable: true
    }),
    capabilities: {
      listExtractionEngine: {
        async extractList({ config, signal, emitProgress }) {
          void signal;
          mockListEngineCalls += 1;
          emitProgress({
            progress: 35,
            phase: "mock list engine scanning"
          });
          emitProgress({
            progress: 85,
            phase: "mock list engine finalizing"
          });
          return {
            rows: [
              {
                name: "Alpha",
                url: config.startUrl || "https://example.com"
              }
            ],
            summary: {
              rowCount: 1,
              method: config?.actions?.[1]?.method || null
            }
          };
        }
      },
      pageExtractionEngine: {
        async extractPages({ config, signal, emitProgress }) {
          void signal;
          if (config?.forceFailure) {
            const error = new Error("Simulated timeout from mock page engine");
            error.code = "TIMEOUT";
            throw error;
          }
          mockPageEngineCalls += 1;
          const urls = Array.isArray(config.urls) ? config.urls : [];
          emitProgress({
            progress: 45,
            phase: "mock page engine processing",
            context: {
              urlCount: urls.length
            }
          });
          emitProgress({
            progress: 95,
            phase: "mock page engine finishing"
          });
          return {
            rows: urls.map((url, index) => ({
              url,
              title: `Mock Title ${index + 1}`
            })),
            summary: {
              rowCount: urls.length,
              urlCount: urls.length,
              queue: config.queue || {}
            }
          };
        }
      }
    },
    onEvent(event) {
      events.push(event);
    }
  });
  await runtime.init();

  const started = await runtime.startAutomation({
    runnerType: "listExtractor",
    config: {
      startUrl: "https://example.com/products",
      actions: [
        {
          type: "EXTRACT_LIST",
          containerSelector: ".row",
          fields: [{ name: "name", selector: ".title", relativeSelector: ".title", extractMode: "text" }]
        },
        {
          type: "LOAD_MORE",
          method: "scroll"
        }
      ]
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
      queue: {
        maxConcurrentTabs: 2,
        delayBetweenRequestsMs: 120
      }
    }
  });
  await wait(40);
  const stopResult = await runtime.stopAutomation(stoppable.automationId);
  assert(typeof stopResult.stopped === "boolean", "stop response malformed");

  const pageCompleted = await waitForEvent(
    events,
    (event) =>
      event.eventType === AUTOMATION_EVENT_TYPES.COMPLETED && event.payload?.automationId === stoppable.automationId
  ).catch(() => null);

  if (!pageCompleted) {
    await waitForEvent(
      events,
      (event) =>
        event.eventType === AUTOMATION_EVENT_TYPES.STOPPED && event.payload?.automationId === stoppable.automationId
    );
  }

  const failingRun = await runtime.startAutomation({
    runnerType: "pageExtractor",
    config: {
      urls: ["https://example.com/fail"],
      forceFailure: true,
      queue: {
        maxConcurrentTabs: 1
      }
    }
  });
  await waitForEvent(
    events,
    (event) => event.eventType === AUTOMATION_EVENT_TYPES.FAILED && event.payload?.automationId === failingRun.automationId
  );

  const hasProgress = events.some((event) => event.eventType === AUTOMATION_EVENT_TYPES.PROGRESS);
  assert(hasProgress, "progress events were not emitted");

  const snapshot = await runtime.getSnapshot();
  assert(Array.isArray(snapshot.automations) && snapshot.automations.length >= 4, "snapshot automations missing");
  assert(Array.isArray(snapshot.runArtifacts) && snapshot.runArtifacts.length >= 4, "snapshot runArtifacts missing");
  assert(Array.isArray(snapshot.failedArtifacts) && snapshot.failedArtifacts.length >= 1, "snapshot failedArtifacts missing");
  assert(snapshot.recentEventSummary?.byType?.[AUTOMATION_EVENT_TYPES.FAILED] >= 1, "recent event summary missing failed count");

  const failedArtifact =
    snapshot.failedArtifacts.find((item) => item.automationId === failingRun.automationId) || snapshot.failedArtifacts[0];
  assert(Boolean(failedArtifact), "failed artifact record missing");
  assert(Boolean(failedArtifact.errorPacket), "failed artifact error packet missing");
  assert(Boolean(failedArtifact.errorPacket.errorType), "failed artifact error type missing");
  assert(Boolean(failedArtifact.errorPacket.runStep), "failed artifact runStep missing");

  const failedEvent = events.find(
    (event) => event.eventType === AUTOMATION_EVENT_TYPES.FAILED && event.payload?.automationId === failingRun.automationId
  );
  assert(Boolean(failedEvent?.taxonomy?.eventName), "failed event taxonomy missing");
  assert(failedEvent.taxonomy.eventName === "extraction_failed", "failed event taxonomy mismatch");
  assert(Boolean(failedEvent?.payload?.errorPacket), "failed event payload missing error packet");

  assert(mockListEngineCalls >= 2, "list extraction engine capability path was not exercised");
  assert(mockPageEngineCalls >= 1, "page extraction engine capability path was not exercised");

  await storageClient.destroy();

  console.log(
    JSON.stringify(
      {
        ok: true,
        automationCount: snapshot.automations.length,
        eventsCaptured: events.length,
        stoppedAutomationId: stoppable.automationId,
        failedAutomationId: failingRun.automationId,
        failedErrorType: failedArtifact.errorPacket.errorType,
        mockListEngineCalls,
        mockPageEngineCalls
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
