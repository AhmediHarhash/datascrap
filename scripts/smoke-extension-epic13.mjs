import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { __internal as pageEngineInternal } from "../packages/extension/background/page-extraction-engine.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const html = await readFile(resolve("packages/extension/sidepanel/index.html"), "utf8");
  const js = await readFile(resolve("packages/extension/sidepanel/index.mjs"), "utf8");
  const pageEngine = await readFile(resolve("packages/extension/background/page-extraction-engine.mjs"), "utf8");

  const requiredHtmlIds = [
    "queue-reliability-profile",
    "queue-backoff-strategy",
    "queue-jitter-mode",
    "queue-retry-min-delay-ms",
    "queue-retry-max-delay-ms",
    "queue-session-reuse-mode",
    "reliability-profile-status-line"
  ];
  for (const id of requiredHtmlIds) {
    assert(html.includes(`id="${id}"`), `missing html id: ${id}`);
  }

  const requiredJsTokens = [
    "RELIABILITY_SETTINGS_STORAGE_KEY",
    "normalizeReliabilitySettingsInput",
    "onReliabilityProfileSelected",
    "onReliabilityControlChanged",
    "buildQueueReliabilityConfig"
  ];
  for (const token of requiredJsTokens) {
    assert(js.includes(token), `missing js token: ${token}`);
  }

  const requiredEngineTokens = [
    "normalizeReliabilityConfig",
    "computeRetryDelayMs",
    "sessionReuseMode",
    "retryStats",
    "openJobTab"
  ];
  for (const token of requiredEngineTokens) {
    assert(pageEngine.includes(token), `missing page engine token: ${token}`);
  }

  const conservativeQueue = pageEngineInternal.normalizeQueueConfig({
    queue: {
      retryDelayMs: 900,
      jitterMs: 300,
      reliability: {
        profile: "conservative"
      }
    }
  });
  assert(conservativeQueue.reliability.profile === "conservative", "conservative profile normalization failed");
  assert(conservativeQueue.reliability.backoffStrategy === "exponential", "conservative backoff strategy mismatch");
  assert(conservativeQueue.reliability.sessionReuseMode === "sticky", "conservative session reuse mismatch");

  const customQueue = pageEngineInternal.normalizeQueueConfig({
    queue: {
      retryDelayMs: 150,
      jitterMs: 1000,
      reliability: {
        profile: "custom",
        backoffStrategy: "linear",
        jitterMode: "none",
        minRetryDelayMs: 400,
        maxRetryDelayMs: 900,
        sessionReuseMode: "off"
      }
    }
  });
  assert(customQueue.retryDelayMs === 400, "retry delay should clamp to reliability minimum");
  const delayAttempt2 = pageEngineInternal.computeRetryDelayMs({
    queue: customQueue,
    retryAttempt: 2,
    random: () => 0.99
  });
  const delayAttempt3 = pageEngineInternal.computeRetryDelayMs({
    queue: customQueue,
    retryAttempt: 3,
    random: () => 0.99
  });
  assert(delayAttempt2 === 800, "linear backoff attempt 2 mismatch");
  assert(delayAttempt3 === 900, "linear backoff should cap at max delay");

  const boundedQueue = pageEngineInternal.normalizeQueueConfig({
    queue: {
      retryDelayMs: 500,
      jitterMs: 1000,
      reliability: {
        profile: "custom",
        backoffStrategy: "fixed",
        jitterMode: "bounded",
        minRetryDelayMs: 100,
        maxRetryDelayMs: 5000
      }
    }
  });
  assert(pageEngineInternal.resolveJitterWindowMs(boundedQueue) === 450, "bounded jitter window mismatch");
  const boundedDelay = pageEngineInternal.computeRetryDelayMs({
    queue: boundedQueue,
    retryAttempt: 1,
    random: () => 1
  });
  assert(boundedDelay === 950, "bounded jitter retry delay mismatch");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedHtmlIds: requiredHtmlIds.length,
        checkedJsTokens: requiredJsTokens.length,
        checkedEngineTokens: requiredEngineTokens.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[smoke-extension-epic13] failed: ${error.message}`);
  process.exit(1);
});
